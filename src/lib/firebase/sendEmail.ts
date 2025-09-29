import { db } from "@/src/lib/firebase/firebaseAdminConfig";
import { getDocumentById } from "@/src/lib/firebase/firestore";
import OrderConfirmationEmail from "@/src/lib/utils/orderEmail";
import { Event } from "@/src/models/event";
import { Order } from "@/src/models/order";
import { Ticket } from "@/src/models/ticket";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOrderConfirmationEmail = async (
  email: string,
  orderId: string
) => {
  const order: Order = (await getDocumentById("orders", orderId)) as Order;

  // TODO: get event
  const event: Event = (await getDocumentById("event", order.eventId)) as Event;

  const ticketsSnapshot = await db
    .collection("tickets")
    .where("orderId", "==", orderId)
    .get();
  const tickets: Ticket[] = ticketsSnapshot.docs.map((doc) =>
    doc.data()
  ) as Ticket[];

  const data = await resend.emails.send({
    from: "Bona Banana <info@bona-banana.com>",
    to: email,
    subject: "Order Confirmation",
    react: OrderConfirmationEmail(order, tickets, event),
  });

  if (data.data) {
    return true;
  } else {
    return false;
  }
};
