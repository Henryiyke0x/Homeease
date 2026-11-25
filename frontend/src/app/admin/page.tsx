"use client";

import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

type RequestStatus = "NEW" | "REVIEWING" | "CONTACTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";

type BookingRequest = {
  id: string;
  service: string;
  quotedBasePrice: string | null;
  details: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  addressInstructions: string | null;
  contactName: string;
  phone: string;
  status: RequestStatus;
  createdAt: string;
  booking: { id: string; status: string; scheduledAt: string; totalAmount: string } | null;
};

const statuses: RequestStatus[] = ["NEW", "REVIEWING", "CONTACTED", "DECLINED", "CANCELLED"];
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [error, setError] = useState("");

  async function fetchRequests() {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiRequest<BookingRequest[]>("/admin/booking-requests", {
        headers: { "x-admin-key": adminKey },
      });
      setRequests(result);
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load requests.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRequests(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchRequests();
  }

  async function changeStatus(id: string, status: RequestStatus) {
    setSavingId(id);
    setError("");
    try {
      const updated = await apiRequest<BookingRequest>(`/admin/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ status }),
      });
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this request.");
    } finally {
      setSavingId("");
    }
  }

  async function confirmBooking(id: string) {
    setConfirmingId(id);
    setError("");
    try {
      const confirmed = await apiRequest<BookingRequest>(`/admin/booking-requests/${id}/confirm`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
      setRequests((current) => current.map((request) => request.id === id ? confirmed : request));
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Unable to confirm this booking.");
    } finally {
      setConfirmingId("");
    }
  }

  function signOut() {
    setAdminKey("");
    setRequests([]);
    setIsAuthorized(false);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a aria-label="HomeEase home" className="text-2xl font-bold tracking-tight text-emerald-950" href="/">
            homeease<span className="text-emerald-700">.</span>
          </a>
          {isAuthorized && (
            <div className="flex items-center gap-5">
              <a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/bookings">Confirmed bookings</a>
              <a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/services">Services & pricing</a>
              <a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/professionals">Professional applications</a>
              <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {!isAuthorized ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Admin sign in</h1>
            <p className="mt-3 leading-7 text-stone-600">Enter the admin key configured on the API server to review customer requests.</p>
            <form className="mt-7" onSubmit={loadRequests}>
              <label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label>
              <input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
              {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
              <button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">
                {isLoading ? "Checking access…" : "Open requests"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Booking requests</h1>
                <p className="mt-3 text-stone-600">Review customer details and keep each request’s status up to date.</p>
              </div>
              <button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:opacity-60" disabled={isLoading} onClick={() => void fetchRequests()} type="button">
                Refresh list
              </button>
            </div>

            {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

            {requests.length === 0 ? (
              <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                <h2 className="text-xl font-semibold text-emerald-950">No requests yet</h2>
                <p className="mt-2 text-sm text-stone-600">New customer requests will show up here.</p>
              </section>
            ) : (
              <div className="mt-8 grid gap-5">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-5 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Request {request.id}</p>
                        <h2 className="mt-2 text-xl font-semibold text-emerald-950">{request.service}</h2>
                        {request.quotedBasePrice && <p className="mt-1 text-sm font-semibold text-emerald-800">Base price at request: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.quotedBasePrice))}</p>}
                        <p className="mt-1 text-sm text-stone-600">Received {new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="block text-sm font-medium text-stone-700">Request status
                          {request.status === "ACCEPTED" ? <span className="mt-2 block rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">ACCEPTED</span> : <select className="mt-2 min-w-40 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm" value={request.status} disabled={savingId === request.id} onChange={(event) => void changeStatus(request.id, event.target.value as RequestStatus)}>
                            {statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                          </select>}
                        </label>
                        {!request.booking && !["DECLINED", "CANCELLED"].includes(request.status) && <button className="rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={confirmingId === request.id} onClick={() => void confirmBooking(request.id)} type="button">{confirmingId === request.id ? "Confirming…" : "Confirm booking"}</button>}
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
