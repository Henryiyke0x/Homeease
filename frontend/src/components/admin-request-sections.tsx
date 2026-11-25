import type { FormEvent } from "react";
import type { BookingRequest, RequestStatus } from "@/types/admin-request";

const statuses: RequestStatus[] = ["NEW", "REVIEWING", "CONTACTED", "DECLINED", "CANCELLED"];
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export function AdminRequestAccess({ adminKey, error, isLoading, onKeyChange, onSubmit }: {
  adminKey: string; error: string; isLoading: boolean; onKeyChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Admin sign in</h1><p className="mt-3 leading-7 text-stone-600">Enter the admin key configured on the API server to review customer requests.</p>
      <form className="mt-7" onSubmit={onSubmit}><label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label><input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => onKeyChange(event.target.value)} />{error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}<button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">{isLoading ? "Checking access…" : "Open requests"}</button></form>
    </section>
  );
}

export function AdminRequestCard({ request, saving, confirming, onStatusChange, onConfirm }: {
  request: BookingRequest; saving: boolean; confirming: boolean;
  onStatusChange: (id: string, status: RequestStatus) => void; onConfirm: (id: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-5 sm:flex-row sm:items-start">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Request {request.id}</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">{request.service}</h2>{request.quotedBasePrice && <p className="mt-1 text-sm font-semibold text-emerald-800">Base price at request: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.quotedBasePrice))}</p>}<p className="mt-1 text-sm text-stone-600">Received {new Date(request.createdAt).toLocaleString()}</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="block text-sm font-medium text-stone-700">Request status{request.status === "ACCEPTED" ? <span className="mt-2 block rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">ACCEPTED</span> : <select className="mt-2 min-w-40 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm" value={request.status} disabled={saving} onChange={(event) => onStatusChange(request.id, event.target.value as RequestStatus)}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select>}</label>
          {!request.booking && !["DECLINED", "CANCELLED"].includes(request.status) && <button className="rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={confirming} onClick={() => onConfirm(request.id)} type="button">{confirming ? "Confirming…" : "Confirm booking"}</button>}
        </div>
      </div>
      {request.booking && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">Booking {request.booking.id} is {request.booking.status.toLowerCase().replaceAll("_", " ")} for {new Date(request.booking.scheduledAt).toLocaleString()}.</p>}
      <div className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer</p><p className="mt-1 font-medium text-stone-900">{request.contactName}</p><a className="mt-1 inline-block text-sm text-emerald-800 hover:underline" href={`tel:${request.phone}`}>{request.phone}</a></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Preferred time</p><p className="mt-1 font-medium text-stone-900">{new Date(`${request.preferredDate.slice(0, 10)}T00:00:00`).toLocaleDateString()}</p><p className="mt-1 text-sm text-stone-600">{request.preferredTime}</p></div>
        <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Service address</p><p className="mt-1 text-sm leading-6 text-stone-700">{request.address}</p></div>
        {request.addressInstructions && <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Access notes</p><p className="mt-1 text-sm leading-6 text-stone-700">{request.addressInstructions}</p></div>}
        <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Request details</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{request.details}</p></div>
      </div>
    </article>
  );
}
