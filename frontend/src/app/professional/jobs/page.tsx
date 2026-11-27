"use client";

import { type FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { NotificationInbox } from "@/components/notification-inbox";
import { ProfessionalAvailabilityEditor } from "@/components/professional-availability-editor";
import { useProfessionalAvailability } from "@/hooks/use-professional-availability";
import type { AccountNotification } from "@/types/account";

type Job = {
  id: string;
  assignedAt: string;
  booking: {
    id: string;
    status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    scheduledAt: string;
    totalAmount: string;
    notes: string | null;
    contactName: string;
    contactPhone: string;
    serviceAddress: string;
    addressInstructions: string | null;
    service: { name: string };
  };
};
type Profile = { firstName: string; lastName: string; role: string };
const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function ProfessionalJobsPage() {
  const availability = useProfessionalAvailability();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  async function loadJobs() {
    const response = await apiRequest<{ user: Profile }>("/auth/me");
    if (response.user.role !== "PROFESSIONAL") throw new Error("Sign in with an approved professional account.");
    const [assignedJobs, professionalNotifications] = await Promise.all([
      apiRequest<Job[]>("/professional/jobs"),
      apiRequest<AccountNotification[]>("/notifications"),
      availability.loadAvailability(),
    ]);
    setProfile(response.user);
    setJobs(assignedJobs);
    setNotifications(professionalNotifications);
  }

  useEffect(() => {
    loadJobs().catch(() => undefined).finally(() => setIsChecking(false));
  }, [availability.loadAvailability]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      await loadJobs();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateJob(jobId: string, status: "IN_PROGRESS" | "COMPLETED") {
    setWorkingId(jobId);
    setError("");
    try {
      await apiRequest(`/professional/jobs/${jobId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setJobs((current) => current.map((job) => job.booking.id === jobId
        ? { ...job, booking: { ...job.booking, status } }
        : job));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this job.");
    } finally {
      setWorkingId("");
    }
  }

  async function signOut() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      setProfile(null);
      setJobs([]);
      setNotifications([]);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out.");
    }
  }

  async function markNotificationRead(id: string) {
    try {
      const updated = await apiRequest<AccountNotification>(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((current) => current.map((item) => item.id === id ? updated : item));
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Unable to update notification.");
    }
  }

  return (
    <main className="booking-page min-h-screen">
      <header className="border-b border-stone-200/70 bg-[#fbfaf6]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><a className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>{profile && <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={() => void signOut()} type="button">Sign out</button>}</div></header>
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        {isChecking ? <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">Checking your account…</p> : !profile ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/professional">← Professional information</a>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Professional portal</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Sign in to your jobs</h1>
            <p className="mt-3 leading-7 text-stone-600">You can sign in once your professional application is approved.</p>
            <form className="mt-7 space-y-4" onSubmit={signIn}><label className="block text-sm font-medium text-stone-700" htmlFor="email">Email<input className={inputClass} id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-medium text-stone-700" htmlFor="password">Password<input className={inputClass} id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}<button className="w-full rounded-full bg-emerald-800 px-6 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Signing in…" : "Sign in"}</button></form>
          </section>
        ) : <>
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Professional portal</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Your jobs, {profile.firstName}</h1><p className="mt-3 text-stone-600">Job details and customer contact information for your assignments.</p></div><button className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" onClick={() => void loadJobs().catch((loadError) => setError(loadError.message))} type="button">Refresh jobs</button></div>
          {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
          <ProfessionalAvailabilityEditor availability={availability.availability} isSaving={availability.isSaving} error={availability.error} onToggle={availability.toggleTime} onSave={() => void availability.saveAvailability()} />
          <NotificationInbox notifications={notifications} onRead={(id) => void markNotificationRead(id)} />
          {jobs.length === 0 ? <section className="mt-9 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><h2 className="text-xl font-semibold text-emerald-950">No jobs assigned yet</h2><p className="mt-2 text-sm text-stone-600">New jobs will appear here when HomeEase assigns them to you.</p></section> : <div className="mt-8 grid gap-5">{jobs.map(({ booking }) => <article key={booking.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 pb-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Job {booking.id}</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">{booking.service.name}</h2><p className="mt-1 text-sm text-stone-600">{new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{booking.status.replaceAll("_", " ")}</span></div><div className="grid gap-6 pt-5 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Customer</p><p className="mt-1 font-medium text-stone-900">{booking.contactName}</p><a className="mt-1 inline-block text-sm text-emerald-800 hover:underline" href={`tel:${booking.contactPhone}`}>{booking.contactPhone}</a><p className="mt-3 text-sm leading-6 text-stone-700">{booking.serviceAddress}</p>{booking.addressInstructions && <p className="mt-1 text-xs text-stone-500">Access notes: {booking.addressInstructions}</p>}</div><div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Work details</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{booking.notes}</p></div></div>{booking.status === "ASSIGNED" && <button className="mt-6 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={workingId === booking.id} onClick={() => void updateJob(booking.id, "IN_PROGRESS")} type="button">{workingId === booking.id ? "Updating…" : "Start job"}</button>}{booking.status === "IN_PROGRESS" && <button className="mt-6 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={workingId === booking.id} onClick={() => void updateJob(booking.id, "COMPLETED")} type="button">{workingId === booking.id ? "Updating…" : "Mark complete"}</button>}</article>)}</div>}
        </>}
      </div>
    </main>
  );
}
