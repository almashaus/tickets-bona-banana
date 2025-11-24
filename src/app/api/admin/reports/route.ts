import { NextRequest, NextResponse } from "next/server";
import { reportCache } from "@/src/lib/cache/reportsCache";
import {
  fetchAllOrders,
  fetchAllEvents,
  fetchAllTickets,
} from "./fetchDataFunctions";

export interface ReportsData {
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalAttendees: number;
    topCity: { name: string; orderCount: number };
  };
  charts: {
    revenueOverTime: Array<{ date: string; revenue: number }>;
    ordersByEvent: Array<{ eventName: string; orders: number }>;
    attendanceRatio: Array<{ name: string; value: number; color: string }>;
    revenueByCity: Array<{ city: string; revenue: number }>;
  };
  //   filters: {
  //     events: Array<{ id: string; name: string; city: string }>;
  //     cities: string[];
  //   };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      eventId: searchParams.get("eventId"),
      city: searchParams.get("city"),
      organizerId: searchParams.get("organizerId"),
      userRole: "",
      userId: "",
    };

    // Check cache first
    const cacheKey = reportCache.generateKey("reports", filters);
    const cachedData = reportCache.get<ReportsData>(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        {
          ...cachedData,
          cached: true,
        },
        {
          status: 200,
          headers: {
            "X-Cache": "HIT",
            "Cache-Control": "private, max-age=300", // 5 minutes
          },
        }
      );
    }

    // Fetch all data in parallel with optimized queries
    const reportsData = await fetchReportsData(filters);

    // Cache for 5 minutes
    reportCache.set(cacheKey, reportsData, 300000);

    return NextResponse.json(
      {
        ...reportsData,
        cached: false,
      },
      {
        status: 200,
        headers: {
          "X-Cache": "MISS",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reports data" },
      { status: 500 }
    );
  }
}

async function fetchReportsData(filters: any): Promise<ReportsData> {
  // STEP 1: Fetch all orders once (this is the main data source)
  const ordersData = await fetchAllOrders(filters);

  // STEP 2: Fetch all events once
  const eventsData = await fetchAllEvents(ordersData.eventIds, filters);

  // STEP 3: Fetch all tickets once
  const ticketsData = await fetchAllTickets(ordersData.orderIds, filters);

  // STEP 4: Process all metrics from the fetched data (no additional queries)
  const summary = calculateSummary(ordersData, eventsData, ticketsData);
  const charts = calculateCharts(ordersData, eventsData, ticketsData, filters);

  //   const filterOptions = prepareFilterOptions(eventsData);

  const totalReads =
    ordersData.orders.length + eventsData.size + ticketsData.queriesCount;

  return {
    summary,
    charts,
    // filters: filterOptions,
  };
}

// ============================================================================
// Data Processing Functions (No DB Queries)
// ============================================================================

function calculateSummary(
  ordersData: any,
  eventsData: Map<string, any>,
  ticketsData: any
) {
  let totalRevenue = 0;
  let totalTickets = 0;
  const cityOrders = new Map<string, number>();

  ordersData.orders.forEach((order: any) => {
    const event = eventsData.get(order.eventId);
    if (!event) return;

    totalRevenue += order.totalAmount || 0;
    totalTickets += order.tickets.length || 0;

    const city = event.city.en || "Unknown";
    cityOrders.set(city, (cityOrders.get(city) || 0) + 1);
  });

  // Count used tickets
  const totalAttendees = ticketsData.used;

  // Find top city
  let topCity = { name: "", orderCount: 0 };
  for (const [city, count] of cityOrders.entries()) {
    if (count > topCity.orderCount) {
      topCity = { name: city, orderCount: count };
    }
  }

  return {
    totalRevenue,
    totalTickets,
    totalAttendees,
    topCity,
  };
}

function calculateCharts(
  ordersData: any,
  eventsData: Map<string, any>,
  ticketsData: any,
  filters: any
) {
  // 1. Revenue Over Time
  const revenueByDate = new Map<string, number>();

  ordersData.orders.forEach((order: any) => {
    const event = eventsData.get(order.eventId);
    if (!event) return;

    let date = order.orderDate;
    // Convert string to JS Date
    if (typeof date === "string") {
      date = new Date(date);
    }
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return;

    const key = formatDateKey(date, filters.groupBy || "day");
    revenueByDate.set(
      key,
      (revenueByDate.get(key) || 0) + (order.totalAmount || 0)
    );
  });

  const revenueOverTime = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. Orders by Event
  const ordersByEventMap = new Map<string, number>();

  ordersData.orders.forEach((order: any) => {
    const event = eventsData.get(order.eventId);
    if (!event) return;

    const eventName = event.title || "Unknown";
    ordersByEventMap.set(eventName, (ordersByEventMap.get(eventName) || 0) + 1);
  });

  const ordersByEvent = Array.from(ordersByEventMap.entries())
    .map(([eventName, orders]) => ({ eventName, orders }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 10);

  // 3. Attendance Ratio

  const attendanceRatio = [
    { name: "Used", value: ticketsData.used, color: "hsl(var(--chart-1))" },
    { name: "Unused", value: ticketsData.unused, color: "hsl(var(--chart-2))" },
    {
      name: "ticketsSold",
      value: ticketsData.ticketsSold,
      color: "hsl(var(--chart-2))",
    },
  ];

  // 4. Revenue by City
  const revenueByCityMap = new Map<string, number>();

  ordersData.orders.forEach((order: any) => {
    const event = eventsData.get(order.eventId);
    if (!event) return;

    const city = event.city.en || "Unknown";
    revenueByCityMap.set(
      city,
      (revenueByCityMap.get(city) || 0) + (order.totalAmount || 0)
    );
  });

  const revenueByCity = Array.from(revenueByCityMap.entries())
    .map(([city, revenue]) => ({ city, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    revenueOverTime,
    ordersByEvent,
    attendanceRatio,
    revenueByCity,
  };
}

// function prepareFilterOptions(eventsData: Map<string, any>) {
//   const events: any[] = [];
//   const citiesSet = new Set<string>();

//   eventsData.forEach((event) => {
//     events.push({
//       id: event.id,
//       name: event.title || event.name || "Unknown",
//       city: event.city || "Unknown",
//     });
//     if (event.city) citiesSet.add(event.city);
//   });

//   return {
//     events: events.slice(0, 100), // Limit to 100 events
//     cities: Array.from(citiesSet).sort(),
//   };
// }

function formatDateKey(date: Date, groupBy: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "month") return `${year}-${month}`;
  if (groupBy === "week") {
    const weekNum = getWeekNumber(date);
    return `${year}-W${String(weekNum).padStart(2, "0")}`;
  }
  return `${year}-${month}-${day}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
