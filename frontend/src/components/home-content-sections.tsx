import CareMatchIllustration from "@/components/care-match-illustration";

const services = [
  { symbol: "⌂", name: "Home cleaning", detail: "Come home to a space that feels fresh again.", tone: "mint" },
  { symbol: "✳", name: "Laundry", detail: "The washing, drying and folding—handled.", tone: "peach" },
  { symbol: "↗", name: "Grocery shopping", detail: "Your list picked, packed and brought home.", tone: "blue" },
  { symbol: "+", name: "Home maintenance", detail: "Small fixes that make a big difference.", tone: "lilac" },
];

const steps = [
  { number: "01", title: "Tell us what you need", detail: "Share your list and choose a time that works for you." },
  { number: "02", title: "We find the right help", detail: "We match the request with a trusted professional." },
  { number: "03", title: "Put your feet up", detail: "We coordinate the details and check in after the job." },
];

export function ServicesSection() {
  return (
    <section id="services" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="section-kicker">What we take care of</p><h2 className="section-title mt-4">Your list, <span>lightened.</span></h2></div>
          <p className="max-w-md leading-7 text-stone-600">From everyday resets to the little jobs you’ve been putting off, get trusted help that fits your life.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <a key={service.name} href="/customer" className={`service-card service-${service.tone} group rounded-[1.75rem] border border-stone-200/70 p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/5`}>
              <div className="flex items-start justify-between"><span className="service-symbol flex size-12 items-center justify-center rounded-2xl text-2xl">{service.symbol}</span><span className="text-xs font-semibold tracking-widest text-stone-400">0{index + 1}</span></div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-emerald-950">{service.name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">{service.detail}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">Request a service <span className="transition-transform group-hover:translate-x-1">→</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section id="how-it-works" className="process-section relative overflow-hidden px-6 py-20 text-white sm:py-28">
      <div className="process-orb" />
      <div className="relative mx-auto max-w-7xl">
        <p className="section-kicker !text-emerald-300">The easy part starts here</p>
        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A few details from you.<br /><span className="text-emerald-300">Everything else from us.</span></h2>
          <a className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold transition hover:bg-white/10" href="/customer">Start a request <span aria-hidden="true">↗</span></a>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step) => <article key={step.number} className="process-step border-t border-white/20 pt-5"><span className="font-mono text-sm text-emerald-300">{step.number}</span><h3 className="mt-7 text-xl font-semibold">{step.title}</h3><p className="mt-3 max-w-xs leading-7 text-emerald-50/70">{step.detail}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" className="px-6 py-20 sm:py-28">
      <div className="about-card mx-auto flex max-w-7xl flex-col justify-between gap-8 rounded-[2rem] px-7 py-10 sm:px-12 sm:py-14 lg:flex-row lg:items-center">
        <div className="max-w-2xl"><p className="section-kicker">A calmer way to care for home</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-emerald-950 sm:text-4xl">Good help should make life feel lighter.</h2><p className="mt-4 max-w-xl leading-7 text-stone-600">HomeEase brings trusted professionals and thoughtful coordination together, so you can spend less time managing household tasks and more time on what matters.</p></div>
        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <CareMatchIllustration />
          <a className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-emerald-900 px-7 py-4 font-semibold text-white transition hover:bg-emerald-950" href="/customer">Let’s get started <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}

