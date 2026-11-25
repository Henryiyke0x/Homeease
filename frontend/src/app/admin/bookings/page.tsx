"use client";

import { AdminBookingAccess, AdminBookingCard } from "@/components/admin-booking-sections";
import { useAdminBookings } from "@/hooks/use-admin-bookings";

export default function AdminBookingsPage() {
  const {
    adminKey, setAdminKey, bookings, professionals, selectedProfessional, isAuthorized,
    isLoading, workingId, error, loadData, signIn, assign, cancel, signOut, selectProfessional,
  } = useAdminBookings();

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><a className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>{isAuthorized && <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button>}</div></header>
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {!isAuthorized ? <AdminBookingAccess adminKey={adminKey} error={error} isLoading={isLoading} onKeyChange={setAdminKey} onSubmit={(event) => void signIn(event)} /> : <>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a><p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Confirmed bookings</h1><p className="mt-3 text-stone-600">Assign each confirmed booking to an approved professional.</p></div><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:opacity-60" disabled={isLoading} onClick={() => void loadData()} type="button">Refresh list</button></div>
          {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          {bookings.length === 0 ? <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-semibold text-emerald-950">No confirmed bookings yet</h2><p className="mt-2 text-sm text-stone-600">Confirm a request to create a booking, then assign a professional here.</p></section> : <div className="mt-8 grid gap-5">{bookings.map((booking) => <AdminBookingCard key={booking.id} booking={booking} professionals={professionals} selectedProfessional={selectedProfessional[booking.id] ?? ""} working={workingId === booking.id} onSelectProfessional={(professionalId) => selectProfessional(booking.id, professionalId)} onAssign={() => void assign(booking.id)} onCancel={() => void cancel(booking.id)} />)}</div>}
        </>}
      </div>
    </main>
  );
}
