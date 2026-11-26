import type { FormEvent } from "react";
import type { Booking, Professional } from "@/types/admin-booking";

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export function AdminBookingAccess({ adminKey, error, isLoading, onKeyChange, onSubmit }: {
  adminKey: string; error: string; isLoading: boolean; onKeyChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Confirmed bookings</h1>
      <form className="mt-7" onSubmit={onSubmit}><label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label><input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => onKeyChange(event.target.value)} />{error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}<button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">{isLoading ? "Checking access…" : "Open bookings"}</button></form>
    </section>
  );
}

export function AdminBookingCard({ booking, professionals, selectedProfessional, working, onSelectProfessional, onAssign, onCancel }: {
  booking: Booking; professionals: Professional[]; selectedProfessional: string; working: boolean;
  onSelectProfessional: (id: string) => void; onAssign: () => void; onCancel: () => void;
}) {
  const compatible = professionals.filter((professional) => professional.services.includes(booking.service.name));
  const canAssign = booking.status === "CONFIRMED" || booking.status === "ASSIGNED";
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-3 text-xs font-semibold text-stone-600">Payment: {booking.payments[0]?.status === "SUCCESS" ? "Paid" : booking.payments[0]?.status === "PENDING" ? "Pending" : "Not paid"}</p>
      {(booking.status === "CONFIRMED" || booking.status === "ASSIGNED") && !booking.payments.some((payment) => payment.status === "SUCCESS") && <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">Customer payment must be confirmed before a professional can be assigned.</p>}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Booking {booking.id}</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">{booking.service.name}</h2><p className="mt-1 text-sm text-stone-600">{new Date(booking.scheduledAt).toLocaleString()} · {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(booking.totalAmount))}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{booking.status.replaceAll("_", " ")}</span></div>
      <div className="grid gap-6 pt-5 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer</p><p className="mt-1 font-medium text-stone-900">{booking.contactName}</p><a className="mt-1 inline-block text-sm text-emerald-800 hover:underline" href={`tel:${booking.contactPhone}`}>{booking.contactPhone}</a><p className="mt-3 text-sm leading-6 text-stone-700">{booking.serviceAddress}</p>{booking.addressInstructions && <p className="mt-1 text-xs text-stone-500">Access notes: {booking.addressInstructions}</p>}</div><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Job details</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{booking.notes}</p></div></div>
      {canAssign && <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-end sm:justify-between"><div className="w-full sm:max-w-md"><label className="block text-sm font-medium text-stone-700" htmlFor={`professional-${booking.id}`}>{booking.assignment ? `Assigned to ${booking.assignment.professional.firstName} ${booking.assignment.professional.lastName}` : "Assign a professional"}</label><select className={`${inputClass} mt-2`} id={`professional-${booking.id}`} value={selectedProfessional} onChange={(event) => onSelectProfessional(event.target.value)}><option value="">Choose an approved professional</option>{compatible.map((professional) => <option key={professional.id} value={professional.id}>{professional.firstName} {professional.lastName} · {professional.city}</option>)}</select>{compatible.length === 0 && <p className="mt-2 text-xs text-stone-500">No approved professionals currently offer this service.</p>}</div><div className="flex gap-3"><button className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50" disabled={!selectedProfessional || working || !booking.payments.some((payment) => payment.status === "SUCCESS")} onClick={onAssign} type="button">{working ? "Saving…" : booking.assignment ? "Reassign" : "Assign job"}</button><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50" disabled={working} onClick={onCancel} type="button">Cancel booking</button></div></div>}
      {booking.status === "IN_PROGRESS" && <div className="mt-6 border-t border-stone-100 pt-5"><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50" disabled={working} onClick={onCancel} type="button">Cancel in-progress booking</button></div>}
    </article>
  );
}
