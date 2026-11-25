"use client";

import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

type Professional = { id: string; firstName: string; lastName: string; phone: string | null; city: string; state: string; services: string[] };
type Booking = {
  id: string;
  status: "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  scheduledAt: string;
  totalAmount: string;
  notes: string | null;
  contactName: string;
  contactPhone: string;
  serviceAddress: string;
  addressInstructions: string | null;
  service: { name: string };
  assignment: { professional: { id: string; firstName: string; lastName: string; phone: string | null } } | null;
};

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function AdminBookingsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Record<string, string>>({});
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [bookingList, professionalList] = await Promise.all([
        apiRequest<Booking[]>("/admin/bookings", { headers: { "x-admin-key": adminKey } }),
        apiRequest<Professional[]>("/admin/available-professionals", { headers: { "x-admin-key": adminKey } }),
      ]);
      setBookings(bookingList);
      setProfessionals(professionalList);
      setSelectedProfessional(Object.fromEntries(bookingList.map((booking) => [booking.id, booking.assignment?.professional.id ?? ""])));
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData();
  }

  async function assign(bookingId: string) {
    const professionalId = selectedProfessional[bookingId];
    if (!professionalId) return;
    setWorkingId(bookingId);
    setError("");
    try {
      const assignment = await apiRequest<Booking["assignment"]>(`/admin/bookings/${bookingId}/assign`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ professionalId }),
      });
      setBookings((current) => current.map((booking) => booking.id === bookingId
        ? { ...booking, status: "ASSIGNED", assignment }
        : booking));
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Unable to assign this booking.");
    } finally {
      setWorkingId("");
    }
  }

  async function cancel(bookingId: string) {
    setWorkingId(bookingId);
    setError("");
    try {
      const updated = await apiRequest<Booking>(`/admin/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "x-admin-key": adminKey },
      });
      setBookings((current) => current.map((booking) => booking.id === bookingId ? updated : booking));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this booking.");
    } finally {
      setWorkingId("");
    }
  }

  function signOut() {
    setAdminKey("");
    setBookings([]);
    setProfessionals([]);
    setIsAuthorized(false);
  }

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><a className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>{isAuthorized && <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button>}</div></header>
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {!isAuthorized ? <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Confirmed bookings</h1>
          <form className="mt-7" onSubmit={signIn}><label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label><input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />{error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}<button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">{isLoading ? "Checking access…" : "Open bookings"}</button></form>
        </section> : <>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a><p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Confirmed bookings</h1><p className="mt-3 text-stone-600">Assign each confirmed booking to an approved professional.</p></div><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:opacity-60" disabled={isLoading} onClick={() => void loadData()} type="button">Refresh list</button></div>
          {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          {bookings.length === 0 ? <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-semibold text-emerald-950">No confirmed bookings yet</h2><p className="mt-2 text-sm text-stone-600">Confirm a request to create a booking, then assign a professional here.</p></section> : <div className="mt-8 grid gap-5">{bookings.map((booking) => {
            const compatibleProfessionals = professionals.filter((professional) => professional.services.includes(booking.service.name));
            return <article key={booking.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Booking {booking.id}</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">{booking.service.name}</h2><p className="mt-1 text-sm text-stone-600">{new Date(booking.scheduledAt).toLocaleString()} · {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(booking.totalAmount))}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{booking.status.replaceAll("_", " ")}</span></div>
              <div className="grid gap-6 pt-5 md:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer</p><p className="mt-1 font-medium text-stone-900">{booking.contactName}</p><a className="mt-1 inline-block text-sm text-emerald-800 hover:underline" href={`tel:${booking.contactPhone}`}>{booking.contactPhone}</a><p className="mt-3 text-sm leading-6 text-stone-700">{booking.serviceAddress}</p>{booking.addressInstructions && <p className="mt-1 text-xs text-stone-500">Access notes: {booking.addressInstructions}</p>}</div><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Job details</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{booking.notes}</p></div></div>
              {(booking.status === "CONFIRMED" || booking.status === "ASSIGNED") && <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-end sm:justify-between"><div className="w-full sm:max-w-md"><label className="block text-sm font-medium text-stone-700" htmlFor={`professional-${booking.id}`}>{booking.assignment ? `Assigned to ${booking.assignment.professional.firstName} ${booking.assignment.professional.lastName}` : "Assign a professional"}</label><select className={`${inputClass} mt-2`} id={`professional-${booking.id}`} value={selectedProfessional[booking.id] ?? ""} onChange={(event) => setSelectedProfessional((current) => ({ ...current, [booking.id]: event.target.value }))}><option value="">Choose an approved professional</option>{compatibleProfessionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.firstName} {professional.lastName} · {professional.city}</option>)}</select>{compatibleProfessionals.length === 0 && <p className="mt-2 text-xs text-stone-500">No approved professionals currently offer this service.</p>}</div><div className="flex gap-3"><button className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50" disabled={!selectedProfessional[booking.id] || workingId === booking.id} onClick={() => void assign(booking.id)} type="button">{workingId === booking.id ? "Saving…" : booking.assignment ? "Reassign" : "Assign job"}</button><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50" disabled={workingId === booking.id} onClick={() => void cancel(booking.id)} type="button">Cancel booking</button></div></div>}
              {booking.status === "IN_PROGRESS" && <div className="mt-6 border-t border-stone-100 pt-5"><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-600 hover:border-red-300 hover:text-red-700 disabled:opacity-50" disabled={workingId === booking.id} onClick={() => void cancel(booking.id)} type="button">Cancel in-progress booking</button></div>}
            </article>;
          })}</div>}
        </>}
      </div>
    </main>
  );
}
