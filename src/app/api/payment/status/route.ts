import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MF_BASE = process.env.MF_BASE_URL!;
const MF_TOKEN = process.env.MF_API_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json(
        { data: { error: "Missing paymentId" } },
        { status: 400 }
      );
    }

    const payload = { Key: paymentId, KeyType: "PaymentId" };
    const res = await fetch(`${MF_BASE}/v2/GetPaymentStatus`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("Payment Status :>> ", data);

    if (!res.ok) {
      console.error("GetPaymentStatus error", data);
      return NextResponse.json(
        { data: { error: "Payment gateway error" } },
        { status: 502 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GetPaymentStatus handler error", err);
    return NextResponse.json(
      { data: { error: "Server error" } },
      { status: 500 }
    );
  }
}
