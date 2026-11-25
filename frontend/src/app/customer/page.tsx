"use client";

import { type FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { apiRequest } from "@/lib/api";

type Service = { id: string; name: string; description: string | null; basePrice: string };

type BookingRequest = {
  service: string;
  details: string;
  date: string;
  time: string;
  address: string;
  addressId: string;
  contactName: string;
  phone: string;
};

type SavedAddress = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  country: string;
  instructions: string | null;
};

const initialRequest: BookingRequest = {
  service: "",
  details: "",
  date: "",
  time: "",
  address: "",
  addressId: "",
  contactName: "",
  phone: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function CustomerPage() {
  const [request, setRequest] = useState(initialRequest);
  const [services, setServices] = useState<Service[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [quotedBasePrice, setQuotedBasePrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    apiRequest<Service[]>("/services")
      .then(setServices)
      .catch((error) => setCatalogError(error instanceof Error ? error.message : "Services are temporarily unavailable."));
    apiRequest<{ user: { id: string } }>("/auth/me")
      .then(() => apiRequest<SavedAddress[]>("/customer/addresses"))
      .then(setSavedAddresses)
      .catch(() => undefined);
  }, []);

  function update(field: keyof BookingRequest, value: string) {
    setRequest((current) => ({ ...current, [field]: value }));
  }

  function selectSavedAddress(id: string) {
    const selected = savedAddresses.find((address) => address.id === id);
    if (!selected) {
      setRequest((current) => ({ ...current, addressId: "", address: "" }));
      return;
    }
    const formattedAddress = [selected.line1, selected.city, selected.state, selected.country !== "Nigeria" ? selected.country : ""]
      .filter(Boolean)
      .join(", ");
    setRequest((current) => ({ ...current, addressId: selected.id, address: formattedAddress }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const result = await apiRequest<{ id: string; quotedBasePrice: string }>("/booking-requests", {
        method: "POST",
        body: JSON.stringify(request.addressId ? request : { ...request, addressId: undefined }),
      });
      setRequestId(result.id);
      setQuotedBasePrice(result.quotedBasePrice);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We couldn't send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
        <section className="max-w-3xl">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/">
            ← Back to HomeEase
          </a>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Booking request
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-emerald-950 sm:text-5xl">
            What can we take care of?
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            Share a few details about the job. We’ll use them to plan the right help for your home.
          </p>

          {submitted ? (
            <section aria-live="polite" className="mt-10 rounded-3xl border border-emerald-200 bg-emerald-50 p-7 sm:p-9">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-800 text-xl text-white" aria-hidden="true">
                ✓
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-emerald-950">Your request has been received</h2>
              <p className="mt-2 leading-7 text-stone-700">
                You selected {request.service} for {request.date} at {request.time}, at {request.address}.
              </p>
              {quotedBasePrice && <p className="mt-3 font-semibold text-emerald-900">Base price at request: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(quotedBasePrice))}</p>}
              <p className="mt-4 text-sm leading-6 text-stone-600">
                Request reference: <span className="font-semibold text-emerald-950">{requestId}</span>. It’s saved as a new request for the HomeEase team to review. This is not a confirmed booking yet.
              </p>
              <button
                className="mt-6 rounded-full border border-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-white"
                onClick={() => setSubmitted(false)}
                type="button"
              >
                Edit request
              </button>
            </section>
          ) : (
            <form className="booking-form-panel mt-8 space-y-9 rounded-[2rem] p-5 sm:p-8 lg:p-9" onSubmit={handleSubmit}>
              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">1. Choose a service</legend>
                {catalogError && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{catalogError}</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <label
                      key={service.name}
                      className={`booking-service-option cursor-pointer rounded-2xl border p-4 transition ${
                        request.service === service.name
                          ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800"
                          : "border-stone-200 bg-white hover:border-stone-400"
                      }`}
                    >
                      <input
                        className="sr-only"
                        name="service"
                        onChange={() => update("service", service.name)}
                        required
                        type="radio"
                        value={service.name}
                        checked={request.service === service.name}
                      />
                      <span className="block font-semibold text-emerald-950">{service.name}</span>
                      <span className="mt-1 block text-sm text-stone-600">{service.description || "A trusted professional, coordinated by HomeEase."}</span>
                      <span className="mt-4 block text-sm font-semibold text-emerald-800">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(service.basePrice))} <span className="font-normal text-stone-500">base price</span></span>
                    </label>
                  ))}
                </div>
                {services.length === 0 && !catalogError && <p className="mt-3 text-sm text-stone-500">Loading available services…</p>}
                {services.length === 0 && catalogError && <p className="mt-3 text-sm text-stone-600">Please check back later or contact HomeEase for current availability.</p>}
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">2. Tell us what you need</legend>
                <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="details">
                  A few details about the task
                </label>
                <textarea
                  className={`${inputClass} min-h-32 resize-y`}
                  id="details"
                  onChange={(event) => update("details", event.target.value)}
                  placeholder="For example, which rooms need cleaning or what needs fixing?"
                  required
                  value={request.details}
                />
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">3. Choose a preferred time</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="date">
                    Preferred date
                  <input className={inputClass} id="date" type="date" required value={request.date} onChange={(event) => update("date", event.target.value)} />
                  </label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="time">
                    Preferred time
                    <select className={inputClass} id="time" required value={request.time} onChange={(event) => update("time", event.target.value)}>
                      <option value="" disabled>Select a time window</option>
                      <option>Morning (8am–12pm)</option>
                      <option>Afternoon (12pm–4pm)</option>
                      <option>Evening (4pm–7pm)</option>
                    </select>
                  </label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">4. Where should we come?</legend>
                <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="address">
                  {request.addressId ? "Saved service address" : "Service address"}
                </label>
                {savedAddresses.length > 0 && <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="savedAddress">Use a saved address
                  <select className={inputClass} id="savedAddress" value={request.addressId} onChange={(event) => selectSavedAddress(event.target.value)}>
                    <option value="">Enter a new address</option>
                    {savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label || "Saved address"} — {address.city}, {address.state}</option>)}
                  </select>
                </label>}
                <input className={inputClass} id="address" autoComplete="street-address" onChange={(event) => update("address", event.target.value)} placeholder="Street, area and city" readOnly={Boolean(request.addressId)} required value={request.address} />
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">5. How can we reach you?</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="contactName">
                    Your name
                    <input className={inputClass} id="contactName" autoComplete="name" onChange={(event) => update("contactName", event.target.value)} required value={request.contactName} />
                  </label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="phone">
                    Phone number
                    <input className={inputClass} id="phone" type="tel" autoComplete="tel" onChange={(event) => update("phone", event.target.value)} placeholder="e.g. +234 800 000 0000" required value={request.phone} />
                  </label>
                </div>
              </fieldset>

              <div className="border-t border-stone-200 pt-6">
                {submitError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{submitError}</p>}
                <button className="w-full rounded-full bg-emerald-800 px-7 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={isSubmitting || services.length === 0} type="submit">
                  {isSubmitting ? "Sending request…" : "Send booking request"}
                </button>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                  We’ll use these details to coordinate your service request.
                </p>
              </div>
            </form>
          )}
        </section>

        <aside className="booking-aside h-fit rounded-3xl bg-emerald-950 p-7 text-white lg:sticky lg:top-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">The HomeEase way</p>
          <h2 className="mt-4 text-2xl font-semibold">You tell us. We coordinate.</h2>
          <ul className="mt-6 space-y-5 text-sm leading-6 text-emerald-50/80">
            <li><span className="mr-2 text-emerald-300">✓</span>Vetted professionals for your request</li>
            <li><span className="mr-2 text-emerald-300">✓</span>Clear details before the service</li>
            <li><span className="mr-2 text-emerald-300">✓</span>Support through the whole process</li>
          </ul>
          <p className="mt-8 border-t border-emerald-800 pt-5 text-sm leading-6 text-emerald-100/70">
            No need to search through profiles or negotiate. We’ll help coordinate the right service for your home.
          </p>
        </aside>
      </div>
    </main>
  );
}
