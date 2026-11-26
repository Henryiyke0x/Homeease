"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { apiRequest } from "@/lib/api";

type VerificationResult = { paymentStatus: string; bookingId: string };

export default function PaymentCallbackPage() {
  const [message, setMessage] = useState("Verifying your payment securely...");
  const [status, setStatus] = useState<"checking" | "success" | "pending" | "failed">("checking");

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) {
      setMessage("We couldn't find a payment reference. Check your booking in your account.");
      setStatus("failed");
      return;
    }

    apiRequest<VerificationResult>("/customer/payments/verify", {
      method: "POST",
      body: JSON.stringify({ reference }),
    }).then((result) => {
      if (result.paymentStatus === "SUCCESS") {
        setMessage("Payment confirmed. Your booking is up to date.");
        setStatus("success");
      } else if (result.paymentStatus === "PENDING") {
        setMessage("Your payment is still processing. Check your account again in a moment.");
        setStatus("pending");
      } else if (result.paymentStatus === "AMOUNT_MISMATCH") {
        setMessage("We couldn't match the payment amount to this booking. Please contact support before trying again.");
        setStatus("failed");
      } else {
        setMessage("Payment wasn't completed. You can return to your account and try again.");
        setStatus("failed");
      }
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "We couldn't verify the payment. Please check your account.");
      setStatus("failed");
    });
  }, []);

  const tone = status === "success" ? "bg-emerald-50 text-emerald-900" : status === "checking" || status === "pending" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-900";

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">HomeEase checkout</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Payment update</h1>
          <p className={`mt-6 rounded-2xl px-5 py-4 text-sm leading-6 ${tone}`} role="status" aria-live="polite">{message}</p>
          <a className="mt-7 inline-flex rounded-full bg-emerald-800 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-900" href="/account">Return to your account</a>
        </div>
      </section>
    </main>
  );
}
