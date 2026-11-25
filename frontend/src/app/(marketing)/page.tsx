import SiteHeader from "@/components/site-header";

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

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <SiteHeader />

      <section className="hero-wrap relative px-6">
        <div className="hero-grid mx-auto grid max-w-7xl items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_0.95fr] lg:gap-4 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <div className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-900 shadow-sm">
              <span className="size-2 rounded-full bg-emerald-500" /> A little more ease, every day
            </div>
            <h1 className="hero-title mt-7 text-[clamp(3.5rem,8vw,6.8rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-emerald-950">
              Your home.<br /><span>Handled.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-stone-600 sm:text-xl">
              The help you need at home, without the work of finding it. Tell us what needs doing—we’ll take it from there.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a className="hero-cta inline-flex items-center gap-3 rounded-full bg-emerald-900 px-7 py-4 font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-emerald-950" href="/customer">
                Book a service <span aria-hidden="true">↗</span>
              </a>
              <a className="inline-flex items-center gap-2 rounded-full border border-stone-300/90 bg-white/60 px-6 py-4 font-semibold text-emerald-950 transition hover:border-emerald-800 hover:bg-white" href="/professional">
                Join as a professional
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2"><span className="text-amber-500">★★★★★</span><span>Care you can count on</span></span>
              <span className="inline-flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-900">✓</span>Vetted professionals</span>
            </div>
          </div>

          <div className="home-scene-wrap relative mx-auto w-full max-w-[590px]" aria-label="Illustration of a peaceful home with a scheduled HomeEase service" role="img">
            <div className="scene-glow" />
            <div className="home-scene">
              <div className="scene-sun" />
              <div className="scene-frame">
                <div className="scene-window"><span /><span /><span /><span /></div>
                <div className="scene-wall-art"><i /><b /></div>
                <div className="scene-plant"><i /><i /><i /><i /><span /></div>
                <div className="scene-sofa"><span /><i /><b /></div>
                <div className="scene-table"><i /><span /></div>
                <div className="scene-rug" />
                <div className="scene-floor" />
              </div>
              <div className="scene-float-card scene-match-card">
                <span className="match-avatar">M</span>
                <span><b>Matched with care</b><small>Your home helper is ready</small></span>
                <span className="match-check">✓</span>
              </div>
              <div className="scene-float-card scene-task-card">
                <span className="task-icon">✳</span>
                <span><small>ON YOUR LIST</small><b>A fresher, calmer home</b></span>
              </div>
              <span className="scene-sparkle sparkle-one">✦</span>
              <span className="scene-sparkle sparkle-two">✧</span>
            </div>
          </div>
        </div>
        <div className="hero-bottom-line mx-auto flex max-w-7xl items-center justify-between border-t border-emerald-950/10 py-5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          <span>Less chasing. More living.</span><a className="transition hover:text-emerald-900" href="#services">Explore our services ↓</a>
        </div>
      </section>

      <section id="services" className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="section-kicker">What we take care of</p>
              <h2 className="section-title mt-4">Your list, <span>lightened.</span></h2>
            </div>
            <p className="max-w-md leading-7 text-stone-600">From everyday resets to the little jobs you’ve been putting off, get trusted help that fits your life.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <a key={service.name} href="/customer" className={`service-card service-${service.tone} group rounded-[1.75rem] border border-stone-200/70 p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-950/5`}>
                <div className="flex items-start justify-between">
                  <span className="service-symbol flex size-12 items-center justify-center rounded-2xl text-2xl">{service.symbol}</span>
                  <span className="text-xs font-semibold tracking-widest text-stone-400">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-semibold tracking-tight text-emerald-950">{service.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600">{service.detail}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">Request a service <span className="transition-transform group-hover:translate-x-1">→</span></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="process-section relative overflow-hidden px-6 py-20 text-white sm:py-28">
        <div className="process-orb" />
        <div className="relative mx-auto max-w-7xl">
          <p className="section-kicker !text-emerald-300">The easy part starts here</p>
          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">A few details from you.<br /><span className="text-emerald-300">Everything else from us.</span></h2>
            <a className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold transition hover:bg-white/10" href="/customer">Start a request <span aria-hidden="true">↗</span></a>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="process-step border-t border-white/20 pt-5">
                <span className="font-mono text-sm text-emerald-300">{step.number}</span>
                <h3 className="mt-7 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 max-w-xs leading-7 text-emerald-50/70">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-20 sm:py-28">
        <div className="about-card mx-auto flex max-w-7xl flex-col justify-between gap-8 rounded-[2rem] px-7 py-10 sm:px-12 sm:py-14 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="section-kicker">A calmer way to care for home</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-emerald-950 sm:text-4xl">Good help should make life feel lighter.</h2>
            <p className="mt-4 max-w-xl leading-7 text-stone-600">HomeEase brings trusted professionals and thoughtful coordination together, so you can spend less time managing household tasks and more time on what matters.</p>
          </div>
          <a className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-emerald-900 px-7 py-4 font-semibold text-white transition hover:bg-emerald-950" href="/customer">Let’s get started <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="px-6 pb-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-stone-200 pt-6 text-sm text-stone-500 sm:flex-row">
          <span className="font-semibold text-emerald-950">homeease<span className="text-emerald-700">.</span></span>
          <span>Your home. Handled.</span>
        </div>
      </footer>
    </main>
  );
}
