"use client";

import BookingPromiseCard from "@/components/booking-promise-card";
import BookingRequestConfirmation from "@/components/booking-request-confirmation";
import BookingRequestForm from "@/components/booking-request-form";
import SiteHeader from "@/components/site-header";
import { useBookingRequest } from "@/hooks/use-booking-request";

export default function CustomerPage() {
  const {
    request, services, savedAddresses, submitted, requestId, quotedBasePrice,
    isSubmitting, submitError, catalogError, update, selectSavedAddress,
    handleSubmit, setSubmitted,
  } = useBookingRequest();

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
        <section className="max-w-3xl">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/">← Back to HomeEase</a>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />Booking request
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-emerald-950 sm:text-5xl">What can we take care of?</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">Share a few details about the job. We’ll use them to plan the right help for your home.</p>

          {submitted ? (
            <BookingRequestConfirmation request={request} requestId={requestId} quotedBasePrice={quotedBasePrice} onEdit={() => setSubmitted(false)} />
          ) : (
            <BookingRequestForm
              request={request}
              services={services}
              savedAddresses={savedAddresses}
              catalogError={catalogError}
              submitError={submitError}
              isSubmitting={isSubmitting}
              onUpdate={update}
              onSelectAddress={selectSavedAddress}
              onSubmit={handleSubmit}
            />
          )}
        </section>
        <BookingPromiseCard />
      </div>
    </main>
  );
}
