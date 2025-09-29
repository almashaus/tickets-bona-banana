import { db } from "@/src/lib/firebase/firebaseConfig";
import { getDocumentById } from "@/src/lib/firebase/firestore";
import OrderConfirmationEmail from "@/src/lib/utils/orderEmail";
import { Event } from "@/src/models/event";
import { Order } from "@/src/models/order";
import { Ticket } from "@/src/models/ticket";
import { collection, getDocs, query, where } from "@firebase/firestore";
import { Resend } from "resend";

export const sendOrderConfirmationEmail = async (
  email: string,
  orderId: string
) => {
  const order: Order = (await getDocumentById("orders", orderId)) as Order;

  const event: Event = (await getDocumentById("event", order.eventId)) as Event;

  const q = query(collection(db, "tickets"), where("orderId", "==", orderId));

  const ticketsSnapshot = await getDocs(q);
  const tickets: Ticket[] = ticketsSnapshot.docs.map((doc) =>
    doc.data()
  ) as Ticket[];

  const resend = new Resend(process.env.RESEND_API_KEY);

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
