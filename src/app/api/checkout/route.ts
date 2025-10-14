import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { NextRequest, NextResponse } from "next/server";
import { Order, OrderStatus } from "@/src/models/order";
import { Ticket, TicketStatus } from "@/src/models/ticket";
import crypto from "crypto";
import { sendOrderConfirmationEmail } from "@/src/lib/firebase/sendEmail";

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
    const { orderId, email } = body;

    // 1. Update status to Paid
    await db
      .collection("orders")
      .doc(orderId)
      .update({ status: OrderStatus.PAID });

    // 2. Query tickets by orderId
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

    // 3. Firestore batch update
    const batch = db.batch();
    ticketsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { status: TicketStatus.VALID });
    });

    await batch.commit();

    // 4. Send Email
    await sendOrderConfirmationEmail(email, orderId);

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
