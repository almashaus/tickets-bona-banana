"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckoutError() {
  const search = useSearchParams();
  const paymentId =
    search?.get("PaymentId") ||
    search?.get("paymentId") ||
    search?.get("paymentid") ||
    search?.get("paymentID");
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!paymentId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/payment/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Status fetch failed");
        setStatus(json.data);
      } catch (err) {
        console.error("status error", err);
        setStatus({ error: err || "Unknown error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  if (!paymentId) return <div>No payment id found in URL.</div>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Payment ERROR !</h1>
      {loading && <p>Checking payment status…</p>}
      {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
    </main>
  );
}
