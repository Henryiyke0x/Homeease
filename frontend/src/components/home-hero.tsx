"use client";

import { useSceneTilt } from "@/hooks/use-scene-tilt";

export default function HomeHero() {
  const sceneRef = useSceneTilt<HTMLDivElement>();

  return (
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

        <div ref={sceneRef} className="home-scene-wrap relative mx-auto w-full max-w-[590px]" aria-label="Illustration of a peaceful home with a scheduled HomeEase service" role="img">
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
  );
}
