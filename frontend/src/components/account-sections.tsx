import type { FormEvent } from "react";
import type { AccountForm, AddressForm, AccountUser, CustomerRequest, SavedAddress } from "@/types/account";

const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";

export function AccountSummary({ user, onSignOut }: { user: AccountUser; onSignOut: () => void }) {
  return (
    <>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-semibold text-emerald-900">{user.firstName.slice(0, 1)}{user.lastName.slice(0, 1)}</div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-emerald-950">Welcome, {user.firstName}.</h1>
      <p className="mt-2 text-stone-600">You’re signed in as {user.email}.</p>
      <div className="mt-8 rounded-2xl bg-[#f5f4ee] p-5"><p className="font-semibold text-emerald-950">Your account is ready</p><p className="mt-2 text-sm leading-6 text-stone-600">New requests you make while signed in will appear below with their latest status.</p></div>
      <div className="mt-6 flex flex-wrap gap-3"><a className="rounded-full bg-emerald-800 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900" href="/customer">Book a service</a><button className="rounded-full border border-stone-300 px-6 py-3.5 text-sm font-semibold text-stone-700 transition hover:bg-white" onClick={onSignOut} type="button">Sign out</button></div>
    </>
  );
}

type RequestHistoryProps = {
  requests: CustomerRequest[];
  confirmCancelId: string;
  cancellingId: string;
  onRequestCancel: (id: string) => void;
  onConfirmCancel: (id: string) => void;
  onKeepRequest: () => void;
};

export function RequestHistory({ requests, confirmCancelId, cancellingId, onRequestCancel, onConfirmCancel, onKeepRequest }: RequestHistoryProps) {
  return (
    <section className="mt-10 border-t border-stone-200 pt-7">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Your activity</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">Service requests</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{requests.length}</span></div>
      {requests.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-stone-300 px-5 py-8 text-center"><p className="font-medium text-stone-700">No requests yet</p><p className="mt-1 text-sm text-stone-500">Your signed-in service requests will appear here.</p></div> : (
        <div className="mt-5 space-y-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-emerald-950">{request.service}</h3><p className="mt-1 text-xs text-stone-500">{new Date(request.createdAt).toLocaleDateString()} · Ref {request.id}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">{(request.booking?.status ?? request.status).replaceAll("_", " ")}</span></div>
              <p className="mt-4 text-sm text-stone-700">{new Date(request.booking?.scheduledAt ?? `${request.preferredDate.slice(0, 10)}T00:00:00`).toLocaleString()}</p>
              {request.booking && <p className="mt-1 text-xs text-stone-500">Booking reference: {request.booking.id}</p>}
              <p className="mt-1 text-sm text-stone-500">{request.address}</p>
              {(request.booking?.totalAmount || request.quotedBasePrice) && <p className="mt-3 text-sm font-semibold text-emerald-900">{request.booking ? "Confirmed price" : "Base price at request"}: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(request.booking?.totalAmount ?? request.quotedBasePrice))}</p>}
              {request.addressInstructions && <p className="mt-1 text-xs text-stone-500">Access note: {request.addressInstructions}</p>}
              {["NEW", "REVIEWING", "CONTACTED"].includes(request.status) && <div className="mt-4 border-t border-stone-100 pt-3">{confirmCancelId === request.id ? <div className="flex flex-wrap items-center gap-3 text-xs"><span className="text-stone-600">Cancel this request?</span><button className="font-semibold text-red-700 hover:underline disabled:opacity-50" disabled={cancellingId === request.id} onClick={() => onConfirmCancel(request.id)} type="button">{cancellingId === request.id ? "Cancelling…" : "Yes, cancel"}</button><button className="font-semibold text-stone-600 hover:underline" onClick={onKeepRequest} type="button">Keep request</button></div> : <button className="text-xs font-semibold text-stone-500 hover:text-red-700" onClick={() => onRequestCancel(request.id)} type="button">Cancel request</button>}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type AddressBookProps = {
  addresses: SavedAddress[];
  form: AddressForm;
  removingAddressId: string;
  isSaving: boolean;
  onChange: (field: keyof AddressForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (id: string) => void;
};

export function AddressBook({ addresses, form, removingAddressId, isSaving, onChange, onSubmit, onRemove }: AddressBookProps) {
  return (
    <section className="mt-10 border-t border-stone-200 pt-7">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Make it easier next time</p><h2 className="mt-2 text-xl font-semibold text-emerald-950">Saved addresses</h2><p className="mt-2 text-sm leading-6 text-stone-600">Choose a saved address when you request your next service.</p>
      {addresses.length > 0 && <div className="mt-5 space-y-3">{addresses.map((address) => <article key={address.id} className="flex items-start justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4"><div><p className="font-semibold text-emerald-950">{address.label || "Home address"}</p><p className="mt-1 text-sm leading-6 text-stone-600">{address.line1}, {address.city}, {address.state}{address.country !== "Nigeria" ? `, ${address.country}` : ""}</p>{address.instructions && <p className="mt-1 text-xs text-stone-500">Note: {address.instructions}</p>}</div><button className="shrink-0 text-xs font-semibold text-stone-500 hover:text-red-700 disabled:opacity-50" disabled={removingAddressId === address.id} onClick={() => onRemove(address.id)} type="button">{removingAddressId === address.id ? "Removing…" : "Remove"}</button></article>)}</div>}
      <form className="mt-5 rounded-2xl bg-[#f5f4ee] p-5" onSubmit={onSubmit}>
        <h3 className="font-semibold text-emerald-950">Add an address</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-stone-600" htmlFor="addressLabel">Label <span className="font-normal">(optional)</span><input className={inputClass} id="addressLabel" placeholder="Home, office…" value={form.label} onChange={(event) => onChange("label", event.target.value)} /></label>
          <label className="block text-xs font-semibold text-stone-600" htmlFor="addressLine">Street address<input className={inputClass} id="addressLine" autoComplete="street-address" required value={form.line1} onChange={(event) => onChange("line1", event.target.value)} /></label>
          <label className="block text-xs font-semibold text-stone-600" htmlFor="addressCity">City<input className={inputClass} id="addressCity" autoComplete="address-level2" required value={form.city} onChange={(event) => onChange("city", event.target.value)} /></label>
          <label className="block text-xs font-semibold text-stone-600" htmlFor="addressState">State<input className={inputClass} id="addressState" autoComplete="address-level1" required value={form.state} onChange={(event) => onChange("state", event.target.value)} /></label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-stone-600" htmlFor="addressInstructions">Access notes <span className="font-normal">(optional)</span><input className={inputClass} id="addressInstructions" placeholder="Gate code or helpful directions" value={form.instructions} onChange={(event) => onChange("instructions", event.target.value)} /></label>
        <button className="mt-4 rounded-full border border-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-white disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save address"}</button>
      </form>
    </section>
  );
}

type AuthPanelProps = {
  form: AccountForm;
  isRegistering: boolean;
  isSubmitting: boolean;
  error: string;
  onModeChange: (registering: boolean) => void;
  onUpdate: (field: keyof AccountForm, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountAuthPanel({ form, isRegistering, isSubmitting, error, onModeChange, onUpdate, onSubmit }: AuthPanelProps) {
  return (
    <section className="booking-form-panel mt-5 rounded-[2rem] p-6 sm:p-9">
      <h1 className="text-3xl font-semibold tracking-tight text-emerald-950">{isRegistering ? "Make home feel handled." : "Good to have you back."}</h1><p className="mt-2 leading-7 text-stone-600">{isRegistering ? "Create an account to get started with HomeEase." : "Sign in to your HomeEase account."}</p>
      <div className="mt-7 grid grid-cols-2 rounded-full bg-stone-100 p-1"><button className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${!isRegistering ? "bg-white text-emerald-950 shadow-sm" : "text-stone-500"}`} onClick={() => onModeChange(false)} type="button">Sign in</button><button className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${isRegistering ? "bg-white text-emerald-950 shadow-sm" : "text-stone-500"}`} onClick={() => onModeChange(true)} type="button">Create account</button></div>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {isRegistering && <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-stone-700" htmlFor="firstName">First name<input className={inputClass} id="firstName" autoComplete="given-name" minLength={2} required value={form.firstName} onChange={(event) => onUpdate("firstName", event.target.value)} /></label><label className="block text-sm font-medium text-stone-700" htmlFor="lastName">Last name<input className={inputClass} id="lastName" autoComplete="family-name" minLength={2} required value={form.lastName} onChange={(event) => onUpdate("lastName", event.target.value)} /></label></div>}
        <label className="block text-sm font-medium text-stone-700" htmlFor="email">Email address<input className={inputClass} id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => onUpdate("email", event.target.value)} /></label>
        {isRegistering && <label className="block text-sm font-medium text-stone-700" htmlFor="phone">Phone number <span className="font-normal text-stone-400">(optional)</span><input className={inputClass} id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => onUpdate("phone", event.target.value)} /></label>}
        <label className="block text-sm font-medium text-stone-700" htmlFor="password">Password<input className={inputClass} id="password" type="password" autoComplete={isRegistering ? "new-password" : "current-password"} minLength={isRegistering ? 10 : 1} required value={form.password} onChange={(event) => onUpdate("password", event.target.value)} />{isRegistering && <span className="mt-1 block text-xs font-normal text-stone-500">Use at least 10 characters.</span>}</label>
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
        <button className="w-full rounded-full bg-emerald-800 px-6 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? "Please wait…" : isRegistering ? "Create my account" : "Sign in"}</button>
      </form>
    </section>
  );
}

export function AccountBenefits() {
  return <aside className="booking-aside h-fit rounded-3xl bg-emerald-950 p-7 text-white lg:sticky lg:top-28"><p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">HomeEase, made personal</p><h2 className="mt-4 text-2xl font-semibold">More time for what matters.</h2><ul className="mt-6 space-y-5 text-sm leading-6 text-emerald-50/80"><li><span className="mr-2 text-emerald-300">✓</span>Keep your details together</li><li><span className="mr-2 text-emerald-300">✓</span>Request trusted home services</li><li><span className="mr-2 text-emerald-300">✓</span>Get help coordinated for you</li></ul></aside>;
}
