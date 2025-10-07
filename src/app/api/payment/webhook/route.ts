// app/api/payment/webhook/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const MF_WEBHOOK_SECRET = process.env.MF_WEBHOOK_SECRET!;
const MF_BASE = process.env.MF_BASE_URL!;
const MF_TOKEN = process.env.MF_API_TOKEN!;

if (!MF_WEBHOOK_SECRET) {
  throw new Error("Missing MF_WEBHOOK_SECRET environment variable");
}

export async function POST(req: NextRequest) {
  // Read raw body as text — required for signature verification
  const rawBody = await req.text();
  console.log("rawBody :>>", rawBody);

  const headerSignature =
    req.headers.get("myfatoorah-signature") ||
    req.headers.get("MyFatoorah-Signature");

  if (!headerSignature) {
    console.warn("Webhook: missing signature header");
    return new NextResponse("Missing signature", { status: 400 });
  }
  console.log("headerSignature :>> ", headerSignature);

  try {
    const header = headerSignature.trim();

    // Compute HMAC-SHA256 using the raw body and compare to header
    const computed = crypto
      .createHmac("sha256", MF_WEBHOOK_SECRET)
      .update(Buffer.from(rawBody, "utf8"))
      .digest("base64");

    console.log("header & comuted", {
      header,
      computed,
    });
    // Timing-safe compare
    const isMatch =
      safeCompare(header, computed) ||
      safeCompare(header, computed.replace(/\=+$/, ""));

    if (!isMatch) {
      console.warn("Webhook signature mismatch", {
        header,
        computed,
      });
      return new NextResponse("Invalid webhook signature", { status: 403 });
    }

    // Parse event
    const payload = JSON.parse(rawBody);
    console.log("payload :>> ", payload);

    const eventType = payload?.Event.Name;
    const data = payload?.Data;
    const invoiceStatus = data.Invoice.Status;

    // For payment updates, best practice: call GetPaymentStatus to retrieve canonical status
    if (eventType && eventType.toLowerCase().includes("payment")) {
      const paymentId = data.Transaction.PaymentId;
      if (paymentId) {
        const resp = await fetch(`${MF_BASE}/v2/GetPaymentStatus`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MF_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ Key: paymentId, KeyType: "PaymentId" }),
        });

        const statusData = await resp.json();
        console.log("statusData :>> ", statusData);
        // TODO: Upsert into DB or trigger background job to update order state

        console.log("Webhook: payment status fetched successfully", {
          paymentId,
          webhookInvoiceStatus: invoiceStatus,
          invoiceStatus: statusData?.Data?.InvoiceStatus,
        });
      }
    }

    // success to MyFatoorah
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook handler error", err);
    return new NextResponse("Server error", { status: 500 });
  }
}

// Timing-safe compare to avoid timing attacks
function safeCompare(a: string, b: string) {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
