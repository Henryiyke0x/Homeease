"use client";

import { type FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api";

type ServiceItem = { id: string; name: string; slug: string; description: string | null; basePrice: string; isActive: boolean };
type ServiceDraft = { name: string; description: string; basePrice: string; isActive: boolean };
type NewService = { name: string; description: string; basePrice: string };

const emptyService: NewService = { name: "", description: "", basePrice: "" };
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function AdminServicesPage() {
  const [adminKey, setAdminKey] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>({});
  const [newService, setNewService] = useState(emptyService);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function fetchServices() {
    setIsLoading(true);
    setError("");
    try {
      const result = await apiRequest<ServiceItem[]>("/admin/services", { headers: { "x-admin-key": adminKey } });
      setServices(result);
      setDrafts(Object.fromEntries(result.map((service) => [service.id, {
        name: service.name,
        description: service.description ?? "",
        basePrice: String(service.basePrice),
        isActive: service.isActive,
      }])));
      setIsAuthorized(true);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load services.");
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchServices();
  }

  async function createService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<ServiceItem>("/admin/services", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ ...newService, basePrice: Number(newService.basePrice) }),
      });
      setNewService(emptyService);
      setNotice("Service added to the customer catalog.");
      await fetchServices();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to add this service.");
    } finally {
      setIsCreating(false);
    }
  }

  async function saveService(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<ServiceItem>(`/admin/services/${id}`, {
        method: "PATCH",
        headers: { "x-admin-key": adminKey },
        body: JSON.stringify({ ...draft, basePrice: Number(draft.basePrice) }),
      });
      setServices((current) => current.map((service) => service.id === id ? updated : service));
      setDrafts((current) => ({ ...current, [id]: { ...draft, basePrice: String(updated.basePrice) } }));
      setNotice("Service details saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this service.");
    } finally {
      setSavingId("");
    }
  }

  function signOut() {
    setAdminKey("");
    setServices([]);
    setDrafts({});
    setIsAuthorized(false);
  }

  return (
    <main className="min-h-screen bg-[#fbfaf6]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a aria-label="HomeEase home" className="text-2xl font-bold tracking-tight text-emerald-950" href="/">homeease<span className="text-emerald-700">.</span></a>
          {isAuthorized && <button className="text-sm font-semibold text-stone-600 hover:text-emerald-900" onClick={signOut} type="button">Sign out</button>}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        {!isAuthorized ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">Services & pricing</h1>
            <form className="mt-7" onSubmit={signIn}>
              <label className="block text-sm font-medium text-stone-700" htmlFor="admin-key">Admin key</label>
              <input className={`${inputClass} mt-2`} id="admin-key" type="password" autoComplete="current-password" required value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
              {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
              <button className="mt-5 w-full rounded-full bg-emerald-800 px-6 py-3.5 font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isLoading} type="submit">{isLoading ? "Checking access…" : "Manage services"}</button>
            </form>
          </section>
        ) : (
          <>
            <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/admin">← Booking requests</a>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">HomeEase operations</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Services & pricing</h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600">Set the service names, descriptions and NGN base prices customers will see when they request help. Prices are entered by your team; none have been assumed.</p>
            {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
            {notice && <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p>}

            <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-emerald-950">Add a service</h2>
              <form className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr_170px_auto] md:items-end" onSubmit={createService}>
                <label className="block text-sm font-medium text-stone-700" htmlFor="new-name">Name<input className={inputClass + " mt-2"} id="new-name" minLength={2} maxLength={80} required value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} /></label>
                <label className="block text-sm font-medium text-stone-700" htmlFor="new-description">Description<input className={inputClass + " mt-2"} id="new-description" maxLength={500} value={newService.description} onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))} /></label>
                <label className="block text-sm font-medium text-stone-700" htmlFor="new-price">Base price (NGN)<input className={inputClass + " mt-2"} id="new-price" type="number" min="0.01" step="0.01" required value={newService.basePrice} onChange={(event) => setNewService((current) => ({ ...current, basePrice: event.target.value }))} /></label>
                <button className="rounded-full bg-emerald-800 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60" disabled={isCreating} type="submit">{isCreating ? "Adding…" : "Add service"}</button>
              </form>
            </section>

            <div className="mt-8 flex items-center justify-between"><h2 className="text-xl font-semibold text-emerald-950">Catalog</h2><button className="text-sm font-semibold text-emerald-800 hover:text-emerald-950" disabled={isLoading} onClick={() => void fetchServices()} type="button">Refresh</button></div>
            {services.length === 0 ? (
              <section className="mt-4 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><h3 className="font-semibold text-emerald-950">No services configured</h3><p className="mt-2 text-sm text-stone-600">Add at least one active service before customers can send booking requests.</p></section>
            ) : <div className="mt-4 space-y-4">
              {services.map((service) => {
                const draft = drafts[service.id];
                if (!draft) return null;
                return <article key={service.id} className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-emerald-950">{service.name}</h3><p className="mt-1 text-xs text-stone-500">/{service.slug}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${draft.isActive ? "bg-emerald-50 text-emerald-900" : "bg-stone-100 text-stone-600"}`}>{draft.isActive ? "Visible to customers" : "Hidden from customers"}</span></div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.5fr_190px]">
                    <label className="block text-sm font-medium text-stone-700">Name<input className={inputClass + " mt-2"} value={draft.name} maxLength={80} onChange={(event) => setDrafts((current) => ({ ...current, [service.id]: { ...draft, name: event.target.value } }))} /></label>
                    <label className="block text-sm font-medium text-stone-700">Description<input className={inputClass + " mt-2"} value={draft.description} maxLength={500} onChange={(event) => setDrafts((current) => ({ ...current, [service.id]: { ...draft, description: event.target.value } }))} /></label>
                    <label className="block text-sm font-medium text-stone-700">Base price (NGN)<input className={inputClass + " mt-2"} type="number" min="0.01" step="0.01" value={draft.basePrice} onChange={(event) => setDrafts((current) => ({ ...current, [service.id]: { ...draft, basePrice: event.target.value } }))} /></label>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700"><input className="size-4 accent-emerald-800" type="checkbox" checked={draft.isActive} onChange={(event) => setDrafts((current) => ({ ...current, [service.id]: { ...draft, isActive: event.target.checked } }))} />Available for new requests</label>
                    <button className="rounded-full border border-emerald-900 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 disabled:opacity-60" disabled={savingId === service.id} onClick={() => void saveService(service.id)} type="button">{savingId === service.id ? "Saving…" : "Save changes"}</button>
                  </div>
                </article>;
              })}
            </div>}
          </>
        )}
      </div>
    </main>
  );
}
