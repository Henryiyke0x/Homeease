"use client";

import { usePublicServices } from "@/hooks/use-public-services";

const servicePresentation: Record<string, { symbol: string; tone: string }> = {
  "Home cleaning": { symbol: "⌂", tone: "mint" },
  Laundry: { symbol: "✳", tone: "peach" },
  "Grocery shopping": { symbol: "↗", tone: "blue" },
  "Home maintenance": { symbol: "+", tone: "lilac" },
};

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function ServicesSection() {
  const { services, isLoading, error } = usePublicServices();

  return (
    <section id="services" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="section-kicker">What we take care of</p><h2 className="section-title mt-4">Your list, <span>lightened.</span></h2></div>
          <p className="max-w-md leading-7 text-stone-600">From everyday resets to the little jobs you’ve been putting off, get trusted help that fits your life.</p>
        </div>
        {error && <p className="mt-8 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900" role="status">Service prices are temporarily unavailable. Please try again shortly.</p>}
        {isLoading ? (
          <p className="mt-10 text-sm text-stone-500" role="status">Loading services and prices…</p>
        ) : services.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => {
              const presentation = servicePresentation[service.name] ?? { symbol: "⌂", tone: "mint" };
              return (
                <a key={service.id} href="/customer" className={`service-card service-${presentation.tone} group rounded-[1.75rem] border border-stone-200/70 p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/5`}>
                  <div className="flex items-start justify-between"><span className="service-symbol flex size-12 items-center justify-center rounded-2xl text-2xl">{presentation.symbol}</span><span className="text-xs font-semibold tracking-widest text-stone-400">{String(index + 1).padStart(2, "0")}</span></div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-emerald-950">{service.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">{service.description}</p>
                  <p className="mt-5 text-lg font-semibold tracking-tight text-emerald-950">From {money.format(Number(service.basePrice))}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">Request a service <span className="transition-transform group-hover:translate-x-1">→</span></span>
                </a>
              );
            })}
          </div>
        ) : !error ? (
          <p className="mt-10 text-sm text-stone-600">No services are currently available.</p>
        ) : null}
      </div>
    </section>
  );
}
