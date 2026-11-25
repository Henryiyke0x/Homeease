"use client";

import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

type ApplicationStatus = "PENDING" | "REVIEWING" | "APPROVED" | "DECLINED";
type ProfessionalApplication = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  services: string[];
  yearsExperience: number;
  about: string;
  status: ApplicationStatus;
  createdAt: string;
};

const statuses: ApplicationStatus[] = ["PENDING", "REVIEWING", "APPROVED", "DECLINED"];
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function ProfessionalApplicationsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [applications, setApplications] = useState<ProfessionalApplication[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  async function fetchApplications() {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiRequest<ProfessionalApplication[]>("/admin/professional-applications", {
        headers: { "x-admin-key": adminKey },
      });
      setApplications(result);
      setIsAuthorized(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load applications.");
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchApplications();
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    setSavingId(id);
    setError("");
    try {
      const updated = await apiRequest<ProfessionalApplication>(`/admin/professional-applications/${id}`, {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ status }),
      });
      setApplications((current) => current.map((application) => application.id === id ? updated : application));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this application.");
    } finally {
      setSavingId("");
    }
  }

  function signOut() {
    setAdminKey("");
    setApplications([]);
    setIsAuthorized(false);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a aria-label="HomeEase home" className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>
          {isAuthorized && <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button>}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        {!isAuthorized ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Professional applications</h1>
            <form className="mt-7" onSubmit={signIn}>
              <label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label>
              <input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
              {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
              <button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">{isLoading ? "Checking access…" : "Open applications"}</button>
            </form>
          </section>
        ) : (
          <>
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Professional applications</h1>
                <p className="mt-3 text-stone-600">Review skills, experience and service areas.</p>
              </div>
              <button className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-white disabled:opacity-60" disabled={isLoading} onClick={() => void fetchApplications()} type="button">Refresh list</button>
            </div>

            {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
            {applications.length === 0 ? (
              <section className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                <h2 className="text-xl font-semibold text-emerald-950">No applications yet</h2>
                <p className="mt-2 text-sm text-stone-600">New professional applications will show up here.</p>
              </section>
            ) : (
              <div className="mt-8 grid gap-5">
                {applications.map((application) => (
                  <article key={application.id} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-5 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Application {application.id}</p>
                        <h2 className="mt-2 text-xl font-semibold text-emerald-950">{application.firstName} {application.lastName}</h2>
                        <p className="mt-1 text-sm text-stone-600">Received {new Date(application.createdAt).toLocaleString()}</p>
                      </div>
                      <label className="block text-sm font-medium text-stone-700">Status
                        <select className="mt-2 min-w-40 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm" value={application.status} disabled={savingId === application.id} onChange={(event) => void updateStatus(application.id, event.target.value as ApplicationStatus)}>
                          {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                      <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Contact</p><a className="mt-1 block text-sm text-emerald-800 hover:underline" href={`mailto:${application.email}`}>{application.email}</a><a className="mt-1 block text-sm text-emerald-800 hover:underline" href={`tel:${application.phone}`}>{application.phone}</a></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Service area</p><p className="mt-1 text-sm text-stone-700">{application.city}, {application.state}</p></div>
                      <div><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Experience</p><p className="mt-1 text-sm text-stone-700">{application.yearsExperience} years</p></div>
                      <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Services</p><div className="mt-2 flex flex-wrap gap-2">{application.services.map((service) => <span key={service} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">{service}</span>)}</div></div>
                      <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">About their work</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">{application.about}</p></div>
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
