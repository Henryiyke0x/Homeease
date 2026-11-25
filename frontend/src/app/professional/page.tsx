"use client";

import { type FormEvent, useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import { apiRequest } from "@/lib/api";

const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";
type ServiceOption = { id: string; name: string };

type ApplicationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  yearsExperience: string;
  about: string;
  password: string;
};

const emptyForm: ApplicationForm = {
  firstName: "", lastName: "", email: "", phone: "", city: "", state: "", yearsExperience: "", about: "", password: "",
};

export default function ProfessionalPage() {
  const [form, setForm] = useState(emptyForm);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<ServiceOption[]>("/services").then(setServiceOptions).catch(() => setServiceOptions([]));
  }, []);

  function update(field: keyof ApplicationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleService(service: string) {
    setServices((current) => current.includes(service)
      ? current.filter((item) => item !== service)
      : [...current, service]);
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const result = await apiRequest<{ id: string }>("/professional-applications", {
        method: "POST",
        body: JSON.stringify({ ...form, yearsExperience: Number(form.yearsExperience), services }),
      });
      setApplicationId(result.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn't send your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="booking-page min-h-screen">
      <SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
        <section className="max-w-3xl">
          <a className="text-sm font-medium text-emerald-800 hover:text-emerald-950" href="/">← Back to HomeEase</a>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" /> Work with HomeEase
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-emerald-950 sm:text-5xl">Good work deserves to be seen.</h1>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">Join a team that values your skills, gives you clear requests, and helps build steady work around what you do best.</p>

          {applicationId ? (
            <section aria-live="polite" className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-7 sm:p-9">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-800 text-xl text-white" aria-hidden="true">✓</div>
              <h2 className="mt-5 text-2xl font-semibold text-emerald-950">Application received</h2>
              <p className="mt-2 leading-7 text-stone-700">Thanks, {form.firstName}. Your application is in our review queue.</p>
              <p className="mt-3 text-sm text-stone-600">Reference: <span className="font-semibold text-emerald-950">{applicationId}</span></p>
              <p className="mt-4 text-sm text-stone-600">After approval, sign in to view and manage assigned jobs.</p>
              <a className="mt-5 inline-flex rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900" href="/professional/jobs">Professional sign in</a>
            </section>
          ) : (
            <form className="booking-form-panel mt-8 space-y-8 rounded-[2rem] p-5 sm:p-8 lg:p-9" onSubmit={submitApplication}>
              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">Your details</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="firstName">First name<input className={inputClass} id="firstName" autoComplete="given-name" required value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="lastName">Last name<input className={inputClass} id="lastName" autoComplete="family-name" required value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="email">Email address<input className={inputClass} id="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="phone">Phone number<input className={inputClass} id="phone" type="tel" autoComplete="tel" placeholder="e.g. +234 800 000 0000" required value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">What do you do?</legend>
                <p className="mt-1 text-sm text-stone-600">Choose all the services you can provide.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {serviceOptions.map((service) => (
                    <label key={service.id} className={`booking-service-option flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${services.includes(service.name) ? "border-emerald-800 bg-emerald-50 ring-1 ring-emerald-800" : "border-stone-200 bg-white hover:border-stone-400"}`}>
                      <input className="size-4 accent-emerald-800" type="checkbox" checked={services.includes(service.name)} onChange={() => toggleService(service.name)} />
                      <span className="text-sm font-semibold text-emerald-950">{service.name}</span>
                    </label>
                  ))}
                </div>
                {serviceOptions.length === 0 && <p className="mt-2 text-xs text-stone-500">No services are available at the moment. Please check back later.</p>}
                {services.length === 0 && serviceOptions.length > 0 && <p className="mt-2 text-xs text-stone-500">Select at least one service to continue.</p>}
              </fieldset>

              <fieldset>
                <legend className="text-lg font-semibold text-emerald-950">Your location and experience</legend>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm font-medium text-stone-700" htmlFor="city">City<input className={inputClass} id="city" autoComplete="address-level2" required value={form.city} onChange={(event) => update("city", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="state">State<input className={inputClass} id="state" autoComplete="address-level1" required value={form.state} onChange={(event) => update("state", event.target.value)} /></label>
                  <label className="block text-sm font-medium text-stone-700" htmlFor="yearsExperience">Years of experience<input className={inputClass} id="yearsExperience" type="number" min="0" max="60" required value={form.yearsExperience} onChange={(event) => update("yearsExperience", event.target.value)} /></label>
                </div>
                <label className="mt-4 block text-sm font-medium text-stone-700" htmlFor="about">Tell us about your work</label>
                <textarea className={`${inputClass} min-h-32 resize-y`} id="about" minLength={20} maxLength={2000} placeholder="What experience or skills should we know about?" required value={form.about} onChange={(event) => update("about", event.target.value)} />
              </fieldset>

              <label className="block text-sm font-medium text-stone-700" htmlFor="applicationPassword">Create a password for your professional account<input className={inputClass} id="applicationPassword" type="password" autoComplete="new-password" minLength={10} required value={form.password} onChange={(event) => update("password", event.target.value)} /><span className="mt-1 block text-xs font-normal text-stone-500">You can sign in after your application is approved.</span></label>

              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
              <button className="w-full rounded-full bg-emerald-800 px-7 py-4 font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={isSubmitting || services.length === 0} type="submit">
                {isSubmitting ? "Sending application…" : "Submit application"}
              </button>
              <p className="-mt-5 text-xs leading-5 text-stone-500">We’ll review your information and contact you about next steps.</p>
            </form>
          )}
        </section>

        <aside className="booking-aside h-fit rounded-3xl bg-emerald-950 p-7 text-white lg:sticky lg:top-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">A better way to work</p>
          <h2 className="mt-4 text-2xl font-semibold">Bring your skill. We’ll bring structure.</h2>
          <ul className="mt-6 space-y-5 text-sm leading-6 text-emerald-50/80">
            <li><span className="mr-2 text-emerald-300">✓</span>Clear job details before you accept</li>
            <li><span className="mr-2 text-emerald-300">✓</span>A team to coordinate with</li>
            <li><span className="mr-2 text-emerald-300">✓</span>Work that builds your reputation</li>
          </ul>
          <p className="mt-8 border-t border-emerald-800 pt-5 text-sm leading-6 text-emerald-100/70">We’re building a reliable system for professionals and the people who count on them.</p>
        </aside>
      </div>
    </main>
  );
}
