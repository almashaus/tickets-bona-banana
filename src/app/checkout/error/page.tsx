"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutError() {
  const search = useSearchParams();
  const paymentId = search?.get("paymentId");

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
        console.log("status response in error checkout:>> ", await res.json());
        if (!res.ok) throw new Error("Status fetch failed");

        const json = await res.json();
        setStatus(json.data);
      } catch (err) {
        console.error("status error", err);
        setStatus({ error: err || "Unknown error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  if (!paymentId)
    return (
      <div className="container py-10 text-center">
        No payment id found in URL.
      </div>
    );

  return (
    <div className="container py-10">
      <h1>Payment ERROR !</h1>
      {loading && <p>Checking payment status…</p>}
      {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
    </div>
  );
}

export default function CheckoutErrorPage() {
  return (
    <Suspense>
      <CheckoutError />
    </Suspense>
  );
}
