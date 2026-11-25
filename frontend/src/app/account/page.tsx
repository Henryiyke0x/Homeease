"use client";

import { type FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { apiRequest } from "@/lib/api";

type AccountUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: "CUSTOMER" | "PROFESSIONAL";
};

type CustomerRequest = {
  id: string;
  service: string;
  quotedBasePrice: string | null;
  details: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  addressInstructions: string | null;
  status: "NEW" | "REVIEWING" | "CONTACTED" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  createdAt: string;
  booking: { id: string; status: string; scheduledAt: string; totalAmount: string } | null;
};

type SavedAddress = {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  country: string;
  instructions: string | null;
};

type AddressForm = { label: string; line1: string; city: string; state: string; instructions: string };

type AccountForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

const emptyForm: AccountForm = { firstName: "", lastName: "", email: "", phone: "", password: "" };
const emptyAddress: AddressForm = { label: "", line1: "", city: "", state: "", instructions: "" };
const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export default function AccountPage() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [form, setForm] = useState(emptyForm);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [removingAddressId, setRemovingAddressId] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<{ user: AccountUser }>("/auth/me")
      .then(async (result) => {
        if (result.user.role === "PROFESSIONAL") {
          window.location.replace("/professional/jobs");
          return;
        }
        setUser(result.user);
        const [customerRequests, savedAddresses] = await Promise.all([
          apiRequest<CustomerRequest[]>("/customer/booking-requests"),
          apiRequest<SavedAddress[]>("/customer/addresses"),
        ]);
        setRequests(customerRequests);
        setAddresses(savedAddresses);
      })
      .catch(() => undefined)
      .finally(() => setIsCheckingSession(false));
  }, []);

  function update(field: keyof AccountForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const endpoint = isRegistering ? "/auth/register" : "/auth/login";
      const payload = isRegistering ? form : { email: form.email, password: form.password };
      const result = await apiRequest<{ user: AccountUser }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.user.role === "PROFESSIONAL") {
        window.location.assign("/professional/jobs");
        return;
      }
      setUser(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't complete that request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
      setUser(null);
      setRequests([]);
      setAddresses([]);
      setForm(emptyForm);
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "We couldn't sign you out.");
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingAddress(true);
    setError("");
    try {
      const address = await apiRequest<SavedAddress>("/customer/addresses", {
        method: "POST",
        body: JSON.stringify(addressForm),
      });
      setAddresses((current) => [address, ...current]);
      setAddressForm(emptyAddress);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save this address.");
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function removeAddress(id: string) {
    setRemovingAddressId(id);
    setError("");
    try {
      await apiRequest<{ ok: boolean }>(`/customer/addresses/${id}`, { method: "DELETE" });
      setAddresses((current) => current.filter((address) => address.id !== id));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "We couldn't remove this address.");
    } finally {
      setRemovingAddressId("");
    }
  }

  async function cancelRequest(id: string) {
    setCancellingId(id);
    setError("");
    try {
      const updated = await apiRequest<CustomerRequest>(`/customer/booking-requests/${id}/cancel`, { method: "POST" });
      setRequests((current) => current.map((request) => request.id === id ? updated : request));
      setConfirmCancelId("");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "We couldn't cancel this request.");
    } finally {
      setCancellingId("");
    }
  }

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_350px] lg:py-16">
        <section className="max-w-2xl">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/">← Back to HomeEase</a>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800"><span className="size-1.5 rounded-full bg-emerald-600" /> Your HomeEase account</p>

          {isCheckingSession ? (
            <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-600">Checking your account…</div>
          ) : user ? (
            <section className="booking-form-panel mt-5 rounded-[2rem] p-6 sm:p-9" aria-live="polite">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-emerald-900">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</div>
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-emerald-950">Welcome, {user.firstName}.</h1>
              <p className="mt-2 text-stone-600">You’re signed in as {user.email}.</p>
              <div className="mt-8 rounded-2xl bg-[#f5f4ee] p-5">
                <p className="font-semibold text-emerald-950">Your account is ready</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">New requests you make while signed in will appear below with their latest status.</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a className="rounded-full bg-emerald-800 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900" href="/customer">Book a service</a>
                <button className="rounded-full border border-stone-300 px-6 py-3.5 text-sm font-semibold text-stone-700 transition hover:bg-white" onClick={() => void signOut()} type="button">Sign out</button>
              </div>
              <div className="mt-10 border-t border-stone-200 pt-7">
                <div className="flex items-end justify-between gap-3">
                  <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Your activity</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">Service requests</h2></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{requests.length}</span>
                </div>
                {requests.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center">
                    <p className="font-medium text-stone-700">No requests yet</p>
                    <p className="mt-1 text-sm text-stone-500">Your signed-in service requests will appear here.</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {requests.map((request) => (
                      <article key={request.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div><h3 className="font-semibold text-emerald-950">{request.service}</h3><p className="mt-1 text-xs text-stone-500">{new Date(request.createdAt).toLocaleDateString()} · Ref {request.id}</p></div>
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{(request.booking?.status ?? request.status).replaceAll("_", " ")}</span>
                        </div>
                        <p className="mt-4 text-sm text-stone-700">{new Date(request.booking?.scheduledAt ?? `${request.preferredDate.slice(0, 10)}T00:00:00`).toLocaleString()}</p>
                        {request.booking && <p className="mt-1 text-xs text-stone-500">Booking reference: {request.booking.id}</p>}
                        <p className="mt-1 text-sm text-stone-500">{request.address}</p>
                        {(request.booking?.totalAmount || request.quotedBasePrice) && <p className="mt-3 text-sm font-semibold text-emerald-900">{request.booking ? "Confirmed price" : "Base price at request"}: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.booking?.totalAmount ?? request.quotedBasePrice))}</p>}
                        {request.addressInstructions && <p className="mt-1 text-xs text-stone-500">Access note: {request.addressInstructions}</p>}
                        {(request.status === "NEW" || request.status === "REVIEWING" || request.status === "CONTACTED") && <div className="mt-4 border-t border-stone-100 pt-3">
                          {confirmCancelId === request.id ? (
                            <div className="flex flex-wrap items-center gap-3 text-xs"><span className="text-stone-600">Cancel this request?</span><button className="font-semibold text-red-700 hover:underline disabled:opacity-50" disabled={cancellingId === request.id} onClick={() => void cancelRequest(request.id)} type="button">{cancellingId === request.id ? "Cancelling…" : "Yes, cancel"}</button><button className="font-semibold text-stone-600 hover:underline" onClick={() => setConfirmCancelId("")} type="button">Keep request</button></div>
                          ) : <button className="text-xs font-semibold text-stone-500 hover:text-red-700" onClick={() => setConfirmCancelId(request.id)} type="button">Cancel request</button>}
                        </div>}
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-10 border-t border-stone-200 pt-7">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Make it easier next time</p>
                <h2 className="mt-2 text-xl font-semibold text-emerald-950">Saved addresses</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">Choose a saved address when you request your next service.</p>
                {addresses.length > 0 && <div className="mt-5 space-y-3">
                  {addresses.map((address) => (
                    <article key={address.id} className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                      <div><p className="font-semibold text-emerald-950">{address.label || "Home address"}</p><p className="mt-1 text-sm leading-6 text-stone-600">{address.line1}, {address.city}, {address.state}{address.country !== "Nigeria" ? `, ${address.country}` : ""}</p>{address.instructions && <p className="mt-1 text-xs text-stone-500">Note: {address.instructions}</p>}</div>
                      <button className="shrink-0 text-xs font-semibold text-stone-500 hover:text-red-700 disabled:opacity-50" disabled={removingAddressId === address.id} onClick={() => void removeAddress(address.id)} type="button">{removingAddressId === address.id ? "Removing…" : "Remove"}</button>
                    </article>
                  ))}
                </div>}
                <form className="mt-5 rounded-2xl bg-[#f5f4ee] p-5" onSubmit={addAddress}>
                  <h3 className="font-semibold text-emerald-950">Add an address</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-stone-600" htmlFor="addressLabel">Label <span className="font-normal">(optional)</span><input className={inputClass} id="addressLabel" placeholder="Home, office…" value={addressForm.label} onChange={(event) => setAddressForm((current) => ({ ...current, label: event.target.value }))} /></label>
                    <label className="block text-xs font-semibold text-stone-600" htmlFor="addressLine">Street address<input className={inputClass} id="addressLine" autoComplete="street-address" required value={addressForm.line1} onChange={(event) => setAddressForm((current) => ({ ...current, line1: event.target.value }))} /></label>
                    <label className="block text-xs font-semibold text-stone-600" htmlFor="addressCity">City<input className={inputClass} id="addressCity" autoComplete="address-level2" required value={addressForm.city} onChange={(event) => setAddressForm((current) => ({ ...current, city: event.target.value }))} /></label>
                    <label className="block text-xs font-semibold text-stone-600" htmlFor="addressState">State<input className={inputClass} id="addressState" autoComplete="address-level1" required value={addressForm.state} onChange={(event) => setAddressForm((current) => ({ ...current, state: event.target.value }))} /></label>
                  </div>
                  <label className="mt-3 block text-xs font-semibold text-stone-600" htmlFor="addressInstructions">Access notes <span className="font-normal">(optional)</span><input className={inputClass} id="addressInstructions" placeholder="Gate code or helpful directions" value={addressForm.instructions} onChange={(event) => setAddressForm((current) => ({ ...current, instructions: event.target.value }))} /></label>
                  <button className="mt-4 rounded-full border border-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-white disabled:opacity-60" disabled={isSavingAddress} type="submit">{isSavingAddress ? "Saving…" : "Save address"}</button>
                </form>
              </div>
              {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
            </section>
          ) : (
            <section className="booking-form-panel mt-5 rounded-[2rem] p-6 sm:p-9">
              <h1 className="text-3xl font-semibold tracking-tight text-emerald-950">{isRegistering ? "Make home feel handled." : "Good to have you back."}</h1>
              <p className="mt-2 leading-7 text-stone-600">{isRegistering ? "Create an account to get started with HomeEase." : "Sign in to your HomeEase account."}</p>
              <div className="mt-7 grid grid-cols-2 rounded-full bg-stone-100 p-1">
                <button className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${!isRegistering ? "bg-white text-emerald-950 shadow-sm" : "text-stone-500"}`} onClick={() => { setIsRegistering(false); setError(""); }} type="button">Sign in</button>
                <button className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${isRegistering ? "bg-white text-emerald-950 shadow-sm" : "text-stone-500"}`} onClick={() => { setIsRegistering(true); setError(""); }} type="button">Create account</button>
              </div>
              <form className="mt-6 space-y-4" onSubmit={submit}>
                {isRegistering && <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="firstName">First name<input className={inputClass} id="firstName" autoComplete="given-name" minLength={2} required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="lastName">Last name<input className={inputClass} id="lastName" autoComplete="family-name" minLength={2} required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
                </div>}
                <label className="block text-sm font-medium text-stone-700" htmlFor="email">Email address<input className={inputClass} id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
                {isRegistering && <label className="block text-sm font-medium text-stone-700" htmlFor="phone">Phone number <span className="font-normal text-stone-400">(optional)</span><input className={inputClass} id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>}
                <label className="block text-sm font-medium text-stone-700" htmlFor="password">Password<input className={inputClass} id="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} minLength={isRegistering ? 10 : 1} required value={form.password} onChange={(event) => update("password", event.target.value)} />{isRegistering && <span className="mt-1 block text-xs font-normal text-stone-500">Use at least 10 characters.</span>}</label>
                {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
                <button className="w-full rounded-full bg-emerald-800 px-6 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Please wait…" : isRegistering ? "Create my account" : "Sign in"}</button>
              </form>
            </section>
          )}
        </section>

        <aside className="booking-aside h-fit rounded-3xl bg-emerald-950 p-7 text-white lg:sticky lg:top-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">HomeEase, made personal</p>
          <h2 className="mt-4 text-2xl font-semibold">More time for what matters.</h2>
          <ul className="mt-6 space-y-5 text-sm leading-6 text-emerald-50/80">
            <li><span className="mr-2 text-emerald-300">✓</span>Keep your details together</li>
            <li><span className="mr-2 text-emerald-300">✓</span>Request trusted home services</li>
            <li><span className="mr-2 text-emerald-300">✓</span>Get help coordinated for you</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
