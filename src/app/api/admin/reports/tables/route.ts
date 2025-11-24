import { NextRequest, NextResponse } from "next/server";
import { reportCache } from "@/src/lib/cache/reportsCache";
import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { OrderStatus } from "@/src/models/order";
import { Timestamp } from "firebase-admin/firestore";
import { TicketStatus } from "@/src/models/ticket";

interface TableFilters {
  startDate: string | null;
  endDate: string | null;
  eventId: string | null;
  city: string | null;
  organizerId: string | null;
  // userRole: string;
  // userId: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableType = searchParams.get("type"); // 'revenue' or 'attendance'

    if (!tableType || !["revenue", "attendance"].includes(tableType)) {
      return NextResponse.json(
        { error: 'Invalid table type. Use "revenue" or "attendance"' },
        { status: 400 }
      );
    }

    const filters: TableFilters = {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      eventId: searchParams.get("eventId"),
      city: searchParams.get("city"),
      organizerId: searchParams.get("organizerId"),
      // userRole: session.user.role,
      // userId: session.user.id,
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: Math.min(parseInt(searchParams.get("pageSize") || "20"), 50), // Max 50
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };

    // Generate cache key for this specific table + filters + pagination
    const cacheKey = reportCache.generateKey(`table-${tableType}`, filters);

    // Check cache first
    const cachedData = reportCache.get(cacheKey);

    if (cachedData) {
      console.log("📘 cache ", cachedData);
      return NextResponse.json(
        {
          ...cachedData,
          cached: true,
        },
        {
          status: 200,
          headers: { "X-Cache": "HIT" },
        }
      );
    }

    // Fetch data based on table type
    let data;
    if (tableType === "revenue") {
      data = await fetchRevenueTable(filters);
    } else {
      data = await fetchAttendanceTable(filters);
    }

    // Cache for 5 minutes
    reportCache.set(cacheKey, data, 300000);
    console.log(data);
    return NextResponse.json(
      {
        ...data,
        cached: false,
      },
      {
        status: 200,
        headers: { "X-Cache": "MISS" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch table data" },
      { status: 500 }
    );
  }
}

async function fetchRevenueTable(filters: TableFilters) {
  const fullDataCacheKey = reportCache.generateKey("table-revenue", {
    ...filters,
  });

  let fullData = reportCache.get<any[]>(fullDataCacheKey);

  if (!fullData) {
    // Fetch all orders for this filter set
    let ordersQuery = db
      .collection("orders")
      .where("status", "==", OrderStatus.PAID);

    // Apply filters
    ordersQuery = applyDateFilters(ordersQuery, filters);
    ordersQuery = applyEventFilter(ordersQuery, filters);
    // ordersQuery = applyRoleFilters(ordersQuery, filters);

    // Limit to prevent excessive reads
    ordersQuery = ordersQuery.limit(5000);

    const ordersSnapshot = await ordersQuery.get();

    // Group by event
    const eventData = new Map<
      string,
      {
        eventId: string;
        totalRevenue: number;
        totalOrders: number;
        ticketsSold: number;
        paymentMethods: Map<string, number>;
      }
    >();

    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      const eventId = order.eventId;

      if (!eventData.has(eventId)) {
        eventData.set(eventId, {
          eventId,
          totalRevenue: 0,
          totalOrders: 0,
          ticketsSold: 0,
          paymentMethods: new Map(),
        });
      }

      const data = eventData.get(eventId)!;
      data.totalRevenue += order.totalAmount || 0;
      data.totalOrders += 1;
      data.ticketsSold += order.tickets.length || 1;

      const method = order.paymentMethod || "Unknown";
      data.paymentMethods.set(
        method,
        (data.paymentMethods.get(method) || 0) + 1
      );
    });

    // Fetch event details
    const eventIds = Array.from(eventData.keys());
    const eventsMap = await fetchEventsByIds(eventIds, filters.city);

    // Convert to array with event details
    fullData = [];
    eventData.forEach((data, eventId) => {
      const event = eventsMap.get(eventId);
      if (!event) return;

      const paymentMethodsStr = Array.from(data.paymentMethods.entries())
        .map(([method, count]) => `${method} (${count})`)
        .join(", ");

      fullData!.push({
        eventId,
        eventName: event.title || "Unknown Event",
        city: event.city.en || "Unknown",
        totalRevenue: data.totalRevenue,
        totalOrders: data.totalOrders,
        ticketsSold: data.ticketsSold,
        averageTicketPrice:
          data.ticketsSold > 0
            ? parseFloat((data.totalRevenue / data.ticketsSold).toFixed(2))
            : 0,
        paymentMethods: paymentMethodsStr || "N/A",
      });
    });

    // Cache full dataset for 5 minutes
    reportCache.set(fullDataCacheKey, fullData, 300000);
  } else {
  }

  // Sort in-memory
  const sortedData = sortTableData(
    fullData,
    filters.sortBy || "totalRevenue",
    filters.sortOrder || "desc"
  );

  // Paginate in-memory
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / filters.pageSize);
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      currentPage: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    },
  };
}

async function fetchAttendanceTable(filters: TableFilters) {
  const fullDataCacheKey = reportCache.generateKey("table-attendance-full", {
    ...filters,
    page: undefined,
    pageSize: undefined,
  });

  let fullData = reportCache.get<any[]>(fullDataCacheKey);

  if (!fullData) {
    // Fetch orders
    let ordersQuery = db
      .collection("orders")
      .where("status", "==", OrderStatus.PAID);

    ordersQuery = applyDateFilters(ordersQuery, filters);
    ordersQuery = applyEventFilter(ordersQuery, filters);
    //  ordersQuery = applyRoleFilters(ordersQuery, filters);
    ordersQuery = ordersQuery.limit(5000);

    const ordersSnapshot = await ordersQuery.get();

    // Group by event
    const eventOrders = new Map<string, string[]>();
    const orderIds: string[] = [];

    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      const eventId = order.eventId;

      if (!eventOrders.has(eventId)) {
        eventOrders.set(eventId, []);
      }
      eventOrders.get(eventId)!.push(doc.id);
      orderIds.push(doc.id);
    });

    // Fetch ticket stats in batches
    const ticketStatsByOrder = await fetchTicketStatsByOrder(orderIds);

    // Aggregate by event
    const eventAttendance = new Map<
      string,
      {
        totalOrders: number;
        usedTickets: number;
        unusedTickets: number;
      }
    >();

    eventOrders.forEach((orders, eventId) => {
      let usedTickets = 0;
      let unusedTickets = 0;

      orders.forEach((orderId) => {
        const stats = ticketStatsByOrder.get(orderId);
        if (stats) {
          usedTickets += stats.used;
          unusedTickets += stats.unused;
        }
      });

      eventAttendance.set(eventId, {
        totalOrders: orders.length,
        usedTickets,
        unusedTickets,
      });
    });

    // Fetch event details
    const eventIds = Array.from(eventAttendance.keys());
    const eventsMap = await fetchEventsByIds(eventIds, filters.city);

    // Convert to array
    fullData = [];
    eventAttendance.forEach((data, eventId) => {
      const event = eventsMap.get(eventId);
      if (!event) return;

      const totalTickets = data.usedTickets + data.unusedTickets;
      const attendancePercentage =
        totalTickets > 0
          ? parseFloat(((data.usedTickets / totalTickets) * 100).toFixed(2))
          : 0;

      fullData!.push({
        eventId,
        eventName: event.title || event.name || "Unknown Event",
        city: event.city.en || "Unknown",
        totalOrders: data.totalOrders,
        usedTickets: data.usedTickets,
        unusedTickets: data.unusedTickets,
        totalTickets,
        attendancePercentage,
      });
    });

    // Cache for 5 minutes
    reportCache.set(fullDataCacheKey, fullData, 300000);
  } else {
  }

  // Sort in-memory
  const sortedData = sortTableData(
    fullData,
    filters.sortBy || "totalOrders",
    filters.sortOrder || "desc"
  );

  // Paginate
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / filters.pageSize);
  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      currentPage: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    },
  };
}

function applyDateFilters(query: any, filters: TableFilters) {
  if (filters.startDate) {
    // Start of day UTC as string
    const start = filters.startDate + "T00:00:00.000Z";
    query = query.where("orderDate", ">=", start);
  }
  if (filters.endDate) {
    // End of day UTC as string
    const end = filters.endDate + "T23:59:59.999Z";
    query = query.where("orderDate", "<=", end);
  }
  return query;
}

function applyEventFilter(query: any, filters: TableFilters) {
  if (filters.eventId) {
    query = query.where("eventId", "==", filters.eventId);
  }
  return query;
}

// function applyRoleFilters(query: any, filters: TableFilters) {
//   if (filters.userRole === "manager" && !filters.organizerId) {
//     query = query.where("creatorId", "==", filters.userId);
//   } else if (filters.organizerId) {
//     query = query.where("creatorId", "==", filters.organizerId);
//   }
//   return query;
// }

async function fetchEventsByIds(
  eventIds: string[],
  cityFilter: string | null
): Promise<Map<string, any>> {
  if (eventIds.length === 0) return new Map();

  const eventsMap = new Map<string, any>();

  // Batch fetch (10 at a time)
  for (let i = 0; i < eventIds.length; i += 10) {
    const batch = eventIds.slice(i, i + 10);
    let query = db.collection("events").where("__name__", "in", batch);

    if (cityFilter) {
      query = query.where("city.en", "==", cityFilter);
    }

    const snapshot = await query.get();
    snapshot.forEach((doc) => {
      eventsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
  }

  return eventsMap;
}

async function fetchTicketStatsByOrder(
  orderIds: string[]
): Promise<Map<string, { used: number; unused: number }>> {
  if (orderIds.length === 0) return new Map();

  const stats = new Map<string, { used: number; unused: number }>();

  // Initialize all order stats
  orderIds.forEach((id) => {
    stats.set(id, { used: 0, unused: 0 });
  });

  // Fetch tickets in batches
  for (let i = 0; i < orderIds.length; i += 10) {
    const batch = orderIds.slice(i, i + 10);
    const snapshot = await db
      .collection("tickets")
      .where("orderId", "in", batch)
      .select("orderId", "status") // Only fetch needed fields
      .get();

    snapshot.forEach((doc) => {
      const ticket = doc.data();
      const orderStats = stats.get(ticket.orderId);
      if (orderStats) {
        if (ticket.status === TicketStatus.USED) {
          orderStats.used++;
        } else {
          orderStats.unused++;
        }
      }
    });
  }

  return stats;
}

function sortTableData(
  data: any[],
  sortBy: string,
  sortOrder: "asc" | "desc"
): any[] {
  return [...data].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === bVal) return 0;

    const comparison = aVal > bVal ? 1 : -1;
    return sortOrder === "asc" ? comparison : -comparison;
  });
}
