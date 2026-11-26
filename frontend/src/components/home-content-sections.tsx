const steps = [
  { number: "01", title: "Tell us what you need", detail: "Share your list and choose a time that works for you." },
  { number: "02", title: "We find the right help", detail: "We match the request with a trusted professional." },
  { number: "03", title: "Put your feet up", detail: "We coordinate the details and check in after the job." },
];

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
        <a className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-emerald-900 px-7 py-4 font-semibold text-white transition hover:bg-emerald-950" href="/customer">Let’s get started <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}

