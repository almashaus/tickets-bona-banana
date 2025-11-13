// ============================================================================
// File: lib/reports/cache.ts
// In-memory cache with TTL for report data
// For production: Use Redis, Upstash, or Vercel KV
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
}

class ReportCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private maxSize: number;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor(
    options: {
      defaultTTL?: number;
      maxSize?: number;
      cleanupIntervalMs?: number;
    } = {}
  ) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // Max 1000 entries
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      memoryUsage: 0,
    };

    // Auto cleanup expired entries every minute
    const cleanupInterval = options.cleanupIntervalMs || 60000;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check max size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const now = Date.now();
    const cacheTTL = ttl || this.defaultTTL;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + cacheTTL,
    });

    this.updateStats();
  }

  /**
   * Retrieve data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex =
      typeof pattern === "string"
        ? new RegExp(pattern.replace(/\*/g, ".*"))
        : pattern;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.updateStats();
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateStats();
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.updateStats();
    }

    return removed;
  }

  /**
   * Generate cache key from prefix and filters
   */
  generateKey(prefix: string, filters: Record<string, any>): string {
    // Sort keys for consistent cache keys
    const sortedKeys = Object.keys(filters).sort();

    const parts = sortedKeys
      .filter((key) => filters[key] !== null && filters[key] !== undefined)
      .map((key) => {
        const value = filters[key];
        // Handle different types
        if (typeof value === "object" && !Array.isArray(value)) {
          return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${value}`;
      });
    console.log(`${prefix}:${parts.join("|")}`);
    return `${prefix}:${parts.join("|")}`;
  }

  /**
   * Get or set with function (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();

    // Store in cache
    this.set(key, data, ttl);

    return data;
  }

  /**
   * Evict oldest entry (LRU-like)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;

    // Estimate memory usage (rough approximation)
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      try {
        memoryUsage += JSON.stringify(entry.data).length * 2; // UTF-16
      } catch {
        // Skip entries that can't be serialized
      }
    }
    this.stats.memoryUsage = memoryUsage;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Warm up cache with data
   */
  warmUp<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * Export cache data (for persistence)
   */
  export(): Array<{ key: string; data: any; expiresAt: number }> {
    const entries: Array<{ key: string; data: any; expiresAt: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        data: entry.data,
        expiresAt: entry.expiresAt,
      });
    }

    return entries;
  }

  /**
   * Import cache data (for persistence)
   */
  import(
    entries: Array<{ key: string; data: any; expiresAt: number }>
  ): number {
    let imported = 0;
    const now = Date.now();

    entries.forEach(({ key, data, expiresAt }) => {
      // Only import non-expired entries
      if (expiresAt > now) {
        this.cache.set(key, {
          data,
          timestamp: now,
          expiresAt,
        });
        imported++;
      }
    });

    this.updateStats();
    return imported;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

export const reportCache = new ReportCache({
  defaultTTL: 300000, // 5 minutes
  maxSize: 1000, // Max 1000 entries
  cleanupIntervalMs: 60000, // Cleanup every minute
});

// ============================================================================
// Cache middleware for API routes
// ============================================================================

export function withCache<T>(
  cacheKey: string | ((req: any) => string),
  ttl?: number
) {
  return async (
    handler: (req: any) => Promise<T>
  ): Promise<(req: any) => Promise<T>> => {
    return async (req: any) => {
      const key = typeof cacheKey === "function" ? cacheKey(req) : cacheKey;

      return reportCache.getOrSet(key, () => handler(req), ttl);
    };
  };
}

// ============================================================================
// Cache invalidation helpers
// ============================================================================

/**
 * Invalidate cache when data changes
 */
export function invalidateReportCache(options: {
  eventId?: string;
  organizerId?: string;
  city?: string;
  all?: boolean;
}) {
  if (options.all) {
    reportCache.clear();
    return;
  }

  // Invalidate specific patterns
  if (options.eventId) {
    reportCache.deletePattern(`*eventId:${options.eventId}*`);
  }
  if (options.organizerId) {
    reportCache.deletePattern(`*organizerId:${options.organizerId}*`);
  }
  if (options.city) {
    reportCache.deletePattern(`*city:${options.city}*`);
  }
}

/**
 * Invalidate cache for specific report types
 */
export function invalidateReportType(type: "dashboard" | "tables" | "all") {
  if (type === "all") {
    reportCache.clear();
  } else {
    reportCache.deletePattern(`^${type}:.*`);
  }
}

// ============================================================================
// Cache warming on startup
// ============================================================================

export async function warmUpReportsCache() {
  // Optionally pre-populate cache with common queries
  // This runs on server startup
  console.log("Cache warming skipped. Cache will populate on demand.");
}

// ============================================================================
// Graceful shutdown
// ============================================================================

export function shutdownCache() {
  reportCache.destroy();
}

// Handle process termination
if (typeof process !== "undefined") {
  process.on("SIGTERM", shutdownCache);
  process.on("SIGINT", shutdownCache);
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Basic usage
reportCache.set('user-123-reports', data, 600000); // 10 minutes
const data = reportCache.get('user-123-reports');

// Generate cache key
const key = reportCache.generateKey('dashboard', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  city: 'Riyadh'
});

// Cache-aside pattern
const data = await reportCache.getOrSet(
  'dashboard:user-123',
  async () => {
    return await fetchDashboardData();
  },
  300000
);

// Get statistics
const stats = reportCache.getStats();
console.log('Hit rate:', reportCache.getHitRate());
console.log('Cache size:', reportCache.size());

// Invalidate cache
invalidateReportCache({ eventId: 'event-123' });
invalidateReportType('dashboard');

// Cleanup
reportCache.cleanup(); // Remove expired entries
reportCache.clear();   // Clear all
*/
