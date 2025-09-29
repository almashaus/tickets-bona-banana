"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatus } from "@/src/models/order";
import { useAuth } from "@/src/features/auth/auth-provider";
import { useLanguage } from "@/src/components/i18n/language-provider";
import { mutate } from "swr";
import Loading from "@/src/components/ui/loading";
import { sendOrderConfirmationEmail } from "@/src/lib/firebase/sendEmail";

function CheckoutResult() {
  const search = useSearchParams();
  const paymentId = search?.get("paymentId");
  const orderId = search?.get("orderId");
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!user) {
    router.replace("/login");
    return;
  }

  useEffect(() => {
    if (!paymentId) return;

    (async () => {
      setLoading(true);
      try {
        const statusResponse = await fetch("/api/payment/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        if (!statusResponse.ok) throw new Error("Status fetch failed");

        const json = await statusResponse.json();
        setStatus(json.data);

        console.log("status response result checkout :>> ", json.data);

        const updateResponse = await fetch("/api/checkout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderId,
            status: json.data?.Data?.InvoiceStatus,
          }),
        });

        const jsonUpdate = await updateResponse.json();
        console.log("json update result checkout :>> ", jsonUpdate);

        if (updateResponse.ok) {
          await mutate("/api/admin/events");
          await mutate("/api/admin/orders");
          await mutate("/api/admin/customers", undefined, { revalidate: true });
          await mutate("/api/published-events");

          // Send order confirmation email
          if (user.email && orderId) {
            await sendOrderConfirmationEmail(user.email, orderId);
          }

          // Navigate to confirmation page
          router.replace(`/confirmation?orderNumber=${orderId}`);
        } else if (updateResponse.status === 402) {
          //   router.replace(`/checkout/error?orderId=${orderId}`);
        }
      } catch (err) {
        console.error("status error", err);
        setStatus({ error: err || "Unknown error" });
        // router.replace(`/checkout/error?orderId=${orderId}`);
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
      {loading && (
        <div className="space-y-3">
          <div className="flex justify-center items-center py-12">
            <Loading />
          </div>
          <p>Checking payment status…</p>
        </div>
      )}
      {status && <pre>{JSON.stringify(status, null, 2)}</pre>}
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense>
      <CheckoutResult />
    </Suspense>
  );
}
