import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { OrderStatus } from "@/src/models/order";
import { TicketStatus } from "@/src/models/ticket";
import { Timestamp } from "firebase-admin/firestore";

export async function fetchAllOrders(filters: any) {
  let ordersQuery = db
    .collection("orders")
    .where("status", "==", OrderStatus.PAID);

  // Apply filters
  if (filters.startDate) {
    ordersQuery = ordersQuery.where(
      "orderDate",
      ">=",
      Timestamp.fromDate(new Date(filters.startDate))
    );
  }
  if (filters.endDate) {
    ordersQuery = ordersQuery.where(
      "orderDate",
      "<=",
      Timestamp.fromDate(new Date(filters.endDate))
    );
  }
  if (filters.eventId) {
    ordersQuery = ordersQuery.where("eventId", "==", filters.eventId);
  }

  if (!filters.startDate && !filters.endDate) {
    ordersQuery = ordersQuery.orderBy("orderDate", "desc").limit(5000);
  } else {
    ordersQuery = ordersQuery.limit(10000);
  }

  const snapshot = await ordersQuery.get();

  const orders: any[] = [];
  const eventIds: string[] = [];
  const orderIds: string[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const order = { id: doc.id, ...data };
    orders.push(order);
    eventIds.push(data.eventId);
    orderIds.push(doc.id);
  });

  return {
    orders,
    eventIds,
    orderIds,
  };
}

export async function fetchAllEvents(eventIds: string[], filters: any) {
  if (eventIds.length === 0) return new Map();

  const eventsMap = new Map<string, any>();

  // Single query for <= 10 events
  if (eventIds.length <= 10 && !filters.city) {
    const snapshot = await db
      .collection("events")
      .where("__name__", "in", eventIds)
      .get();

    snapshot.forEach((doc) => {
      eventsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    return eventsMap;
  }

  // For > 10 events, batch fetch events (10 at a time due to Firestore 'in' limit)
  for (let i = 0; i < eventIds.length; i += 10) {
    const batch = eventIds.slice(i, i + 10);
    let eventsQuery = db.collection("events").where("__name__", "in", batch);

    // Apply city filter if specified
    if (filters.city) {
      eventsQuery = eventsQuery.where("city.en", "==", filters.city);
    }

    const snapshot = await eventsQuery.get();
    snapshot.forEach((doc) => {
      eventsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
  }

  return eventsMap;
}

export async function fetchAllTickets(orderIds: string[], filters: any) {
  if (orderIds.length === 0)
    return { used: 0, unused: 0, ticketsSold: 0, queriesCount: 0 };

  let usedCount = 0;
  let totalCount = 0;
  let queriesCount = 0;

  // Batch fetch tickets
  for (let i = 0; i < orderIds.length; i += 10) {
    const batch = orderIds.slice(i, i + 10);

    const snapshot = await db
      .collection("tickets")
      .where("orderId", "in", batch)
      .select("status")
      .get();

    queriesCount++;

    snapshot.forEach((doc) => {
      totalCount++;
      if (doc.data().status === TicketStatus.USED) {
        usedCount++;
      }
    });
  }

  return {
    used: usedCount,
    unused: totalCount - usedCount,
    ticketsSold: totalCount,
    queriesCount: queriesCount,
  };
}
