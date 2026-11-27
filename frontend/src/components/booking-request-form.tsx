import type { FormEvent } from "react";
import type { BookingRequest, SavedAddress, Service } from "@/types/booking";

const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

type Props = {
  request: BookingRequest;
  services: Service[];
  savedAddresses: SavedAddress[];
  catalogError: string;
  submitError: string;
  isSubmitting: boolean;
  onUpdate: (field: keyof BookingRequest, value: string) => void;
  onSelectAddress: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function BookingRequestForm({
  request, services, savedAddresses, catalogError, submitError, isSubmitting,
  onUpdate, onSelectAddress, onSubmit,
}: Props) {
  const earliestDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return (
    <form className="booking-form-panel mt-8 space-y-9 rounded-[2rem] p-5 sm:p-8 lg:p-9" onSubmit={onSubmit}>
      <fieldset>
        <legend className="text-lg font-semibold text-emerald-950">1. Choose a service</legend>
        {catalogError && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{catalogError}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <label key={service.name} className={`booking-service-option cursor-pointer rounded-2xl border p-4 transition ${request.service === service.name ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800" : "border-stone-200 bg-white hover:border-stone-400"}`}>
              <input className="sr-only" name="service" onChange={() => onUpdate("service", service.name)} required type="radio" value={service.name} checked={request.service === service.name} />
              <span className="block font-semibold text-emerald-950">{service.name}</span>
              <span className="mt-1 block text-sm text-stone-600">{service.description || "A trusted professional, coordinated by HomeEase."}</span>
              <span className="mt-4 block text-sm font-semibold text-emerald-800">{money.format(Number(service.basePrice))} <span className="font-normal text-stone-500">base price</span></span>
            </label>
          ))}
        </div>
        {services.length === 0 && !catalogError && <p className="mt-3 text-sm text-stone-500">Loading available services…</p>}
        {services.length === 0 && catalogError && <p className="mt-3 text-sm text-stone-600">Please check back later or contact HomeEase for current availability.</p>}
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-emerald-950">2. Tell us what you need</legend>
        <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="details">A few details about the task</label>
        <textarea className={`${inputClass} min-h-32 resize-y`} id="details" onChange={(event) => onUpdate("details", event.target.value)} placeholder="For example, which rooms need cleaning or what needs fixing?" required value={request.details} />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-emerald-950">3. Choose a preferred time</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700" htmlFor="date">Preferred date<input className={inputClass} id="date" type="date" min={earliestDate} required value={request.date} onChange={(event) => onUpdate("date", event.target.value)} /></label>
          <label className="block text-sm font-medium text-stone-700" htmlFor="time">Preferred start time<input className={inputClass} id="time" type="time" min="08:00" max="18:00" step="3600" required value={request.time} onChange={(event) => onUpdate("time", event.target.value)} /><span className="mt-1 block text-xs font-normal text-stone-500">Hourly starts from 8am to 6pm, Lagos time.</span></label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-emerald-950">4. Where should we come?</legend>
        <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="address">{request.addressId ? "Saved service address" : "Service address"}</label>
        {savedAddresses.length > 0 && <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="savedAddress">Use a saved address
          <select className={inputClass} id="savedAddress" value={request.addressId} onChange={(event) => onSelectAddress(event.target.value)}>
            <option value="">Enter a new address</option>{savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label || "Saved address"} — {address.city}, {address.state}</option>)}
          </select>
        </label>}
        <input className={inputClass} id="address" autoComplete="street-address" onChange={(event) => onUpdate("address", event.target.value)} placeholder="Street, area and city" readOnly={Boolean(request.addressId)} required value={request.address} />
      </fieldset>

      <fieldset>
        <legend className="text-lg font-semibold text-emerald-950">5. How can we reach you?</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-stone-700" htmlFor="contactName">Your name<input className={inputClass} id="contactName" autoComplete="name" onChange={(event) => onUpdate("contactName", event.target.value)} required value={request.contactName} /></label>
          <label className="block text-sm font-medium text-stone-700" htmlFor="phone">Phone number<input className={inputClass} id="phone" type="tel" autoComplete="tel" onChange={(event) => onUpdate("phone", event.target.value)} placeholder="e.g. +234 800 000 0000" required value={request.phone} /></label>
        </div>
      </fieldset>

      <div className="border-t border-stone-200 pt-6">
        {submitError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{submitError}</p>}
        <button className="w-full rounded-full bg-emerald-800 px-7 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={isSubmitting || services.length === 0} type="submit">{isSubmitting ? "Sending request…" : "Send booking request"}</button>
        <p className="mt-3 text-xs leading-5 text-stone-500">We’ll use these details to coordinate your service request.</p>
      </div>
    </form>
  );
}
