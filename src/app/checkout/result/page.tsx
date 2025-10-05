"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatus } from "@/src/models/order";
import { useAuth } from "@/src/features/auth/auth-provider";
import { useLanguage } from "@/src/components/i18n/language-provider";
import { mutate } from "swr";
import Loading from "@/src/components/ui/loading";
import { sendOrderConfirmationEmail } from "@/src/lib/firebase/sendEmail";
import { Info, TriangleAlert } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";

function CheckoutResult() {
  const search = useSearchParams();
  const paymentId = search?.get("paymentId");
  const orderId = search?.get("orderId");
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    contactSupport: boolean;
  } | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    (async () => {
      setLoading(true);

      try {
        // [ 1 ] get status
        const statusResponse = await fetch("/api/payment/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });

        if (!statusResponse.ok) throw new Error("Status fetch failed");

        const json = await statusResponse.json();
        setStatus(json.data);

        // [ 2 ] update checkout
        const updateResponse = await fetch("/api/checkout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderId,
            status: json.data?.Data?.InvoiceStatus,
          }),
        });

        const jsonUpdate = await updateResponse.json();

        if (updateResponse.ok) {
          await mutate("/api/admin/events");
          await mutate("/api/admin/orders");
          await mutate("/api/admin/customers", undefined, { revalidate: true });
          await mutate("/api/published-events");

          // [ 3 ] send confirmation email
          if (user?.email && orderId) {
            await sendOrderConfirmationEmail(user.email, orderId);
          }

          // [ 4 ] Navigate to confirmation page
          router.replace(`/confirmation?orderNumber=${orderId}`);
        } else if (updateResponse.status === 400) {
          setError({
            title: t("checkout.paymentPending"),
            message: t("checkout.paymentPendingContactSupport"),
            contactSupport: true,
          });
        } else if (updateResponse.status === 402) {
          setError({
            title: t("checkout.paymentCanceled"),
            message: t("checkout.paymentCanceledNoChargesMade"),
            contactSupport: false,
          });
        }
      } catch (err) {
        setError({
          title: t("checkout.warning"),
          message: t("checkout.somethingWentWrong"),
          contactSupport: false,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  const subject = encodeURIComponent(
    `Payment Issue | Payment Id: ${paymentId}`
  );
  const body = encodeURIComponent(
    `Hello,\n\nI need help with my payment in Bona Banana, my account is ${user?.email}\n\n\nThank you.`
  );
  const mailtoLink = `mailto:info@bona-banana.com?subject=${subject}&body=${body}`;

  if (!paymentId)
    return (
      <div className="container py-10 text-center">
        No payment id found in URL!
      </div>
    );

  return (
    <div className="flex justify-center m-10">
      {loading && (
        <Card className="w-fit lg:w-1/3 px-10">
          <div className="flex flex-col justify-center items-center text-center py-12 space-y-4">
            <Loading />

            <p className="text-2xl font-medium">
              {t("checkout.checkingPaymentStatus")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("checkout.keepTapOpen")}
            </p>
          </div>
        </Card>
      )}
      {error && (
        <Card className="w-fit lg:w-1/3 px-10">
          <div className="flex flex-col justify-center items-center text-center py-12">
            <TriangleAlert className="w-10 h-10 text-redColor" />
            <div className="mt-2 mb-6 space-y-2">
              <p className="text-2xl font-medium">{error.title}</p>
              <p className="text-lg text-muted-foreground">{error.message}</p>
              {error.contactSupport && (
                <a
                  href={mailtoLink}
                  className="underline text-green-700 hover:text-green-600"
                >
                  {t("footer.contactUs")}
                </a>
              )}
            </div>
            <Button asChild>
              <a href="/">{t("home.backToHome")}</a>
            </Button>
          </div>
        </Card>
      )}
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
