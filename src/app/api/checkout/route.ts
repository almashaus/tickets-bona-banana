import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { NextRequest, NextResponse } from "next/server";
import { Order, OrderStatus } from "@/src/models/order";
import { Ticket, TicketStatus } from "@/src/models/ticket";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order, tickets }: { order: Order; tickets: Ticket[] } = body;

    await db.collection("orders").doc(order.id).set(order);

    await Promise.all(
      tickets.map((ticket) => {
        const token = crypto.randomBytes(16).toString("hex");

        db.collection("tickets")
          .doc(ticket.id)
          .set({ ...ticket, token: token });
      })
    );

    return NextResponse.json(
      { success: true },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    // [ Canceled ]
    if (status === "Canceled") {
      return NextResponse.json(
        { error: "Payment Canceled" },
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
    // [ Pending ]
    else if (status === "Pending") {
      return NextResponse.json(
        { message: "Payment Pending" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // [ Paid ]
    await db
      .collection("orders")
      .doc(orderId)
      .update({ status: OrderStatus.PAID });

    // 1. Query tickets by orderId
    const ticketsSnapshot = await db
      .collection("tickets")
      .where("orderId", "==", orderId)
      .get();

    if (ticketsSnapshot.empty) {
      return NextResponse.json(
        { error: `No tickets found for orderId: ${orderId}` },
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Firestore batch update
    const batch = db.batch();
    ticketsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: TicketStatus.VALID });
    });

    await batch.commit();

    return NextResponse.json(
      { success: true },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
