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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (status === "Canceled") {
      return NextResponse.json(
        { error: "Payment Canceled" },
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    } else if (status === "Paid") {
      await db
        .collection("orders")
        .doc(orderId)
        .update({ status: OrderStatus.PAID });

      // 1. Query tickets by orderId
      const snapshot = await db
        .collection("tickets")
        .where("orderId", "==", orderId)
        .get();

      if (snapshot.empty) {
        return NextResponse.json(
          { error: `No tickets found for orderId: ${orderId}` },
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 2. Firestore batch update
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: TicketStatus.VALID });
      });

      await batch.commit();

      return NextResponse.json(
        { success: true },
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    // TODO: else status is pending
    return NextResponse.json(
      { message: "Payment Pending" },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
