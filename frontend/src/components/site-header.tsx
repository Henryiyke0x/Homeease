const navigation = [
  { label: "Services", href: "/#services" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "About", href: "/#about" },
  { label: "Sign in", href: "/account" },
];

function NavigationLinks({ className }: { className: string }) {
  return (
    <nav aria-label="Main navigation" className={className}>
      {navigation.map((item) => (
        <a
          key={item.href}
          className="transition-colors hover:text-emerald-800"
          href={item.href}
        >
          {item.label}
        </a>
      ))}
      <a
        className="transition-colors hover:text-emerald-800"
        href="/professional"
      >
        Become a professional
      </a>
    </nav>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#fbfaf6]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a
          aria-label="HomeEase home"
          className="text-2xl font-bold tracking-tight text-emerald-950"
          href="/"
        >
          homeease<span className="text-emerald-700">.</span>
        </a>

        <NavigationLinks className="hidden items-center gap-8 text-sm font-medium text-stone-600 md:flex" />

        <div className="flex items-center gap-3">
          <a
            className="hidden rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:inline-flex"
            href="/customer"
          >
            Book a service
          </a>

          <details className="group relative md:hidden">
            <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-stone-300 text-emerald-950 hover:bg-white [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Toggle navigation</span>
              <span className="text-xl leading-none" aria-hidden="true">
                ☰
              </span>
            </summary>
            <div className="absolute right-0 top-14 w-64 rounded-2xl border border-stone-200 bg-white p-5 shadow-xl">
              <NavigationLinks className="flex flex-col gap-5 text-sm font-medium text-stone-700" />
              <a
                className="mt-5 inline-flex w-full justify-center rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
                href="/customer"
              >
                Book a service
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
