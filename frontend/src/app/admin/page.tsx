"use client";

import { AdminRequestAccess, AdminRequestCard } from "@/components/admin-request-sections";
import { useAdminRequests } from "@/hooks/use-admin-requests";

export default function AdminPage() {
  const {
    adminKey, setAdminKey, requests, isAuthorized, isLoading, savingId, confirmingId,
    error, fetchRequests, loadRequests, changeStatus, confirmBooking, signOut,
  } = useAdminRequests();

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><a aria-label="HomeEase home" className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>{isAuthorized && <div className="flex items-center gap-5"><a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/bookings">Confirmed bookings</a><a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/reviews">Reviews</a><a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/services">Services & pricing</a><a className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" href="/admin/professionals">Professional applications</a><button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button></div>}</div></header>
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {!isAuthorized ? <AdminRequestAccess adminKey={adminKey} error={error} isLoading={isLoading} onKeyChange={setAdminKey} onSubmit={(event) => void loadRequests(event)} /> : <>
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Booking requests</h1><p className="mt-3 text-stone-600">Review customer details and keep each request’s status up to date.</p></div><button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:opacity-60" disabled={isLoading} onClick={() => void fetchRequests()} type="button">Refresh list</button></div>
          {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          {requests.length === 0 ? <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-semibold text-emerald-950">No requests yet</h2><p className="mt-2 text-sm text-stone-600">New customer requests will show up here.</p></section> : <div className="mt-8 grid gap-5">{requests.map((request) => <AdminRequestCard key={request.id} request={request} saving={savingId === request.id} confirming={confirmingId === request.id} onStatusChange={(id, status) => void changeStatus(id, status)} onConfirm={(id) => void confirmBooking(id)} />)}</div>}
        </>}
      </div>
    </main>
  );
}
