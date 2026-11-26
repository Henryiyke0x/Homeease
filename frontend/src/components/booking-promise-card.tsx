export default function BookingPromiseCard() {
  return (
    <aside className="booking-aside h-fit rounded-3xl bg-emerald-950 p-7 text-white lg:sticky lg:top-28">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">The HomeEase way</p>
      <h2 className="mt-4 text-2xl font-semibold">You tell us. We coordinate.</h2>
      <ul className="mt-6 space-y-5 text-sm leading-6 text-emerald-50/80">
        <li><span className="mr-2 text-emerald-300">✓</span>Vetted professionals for your request</li>
        <li><span className="mr-2 text-emerald-300">✓</span>Clear details before the service</li>
        <li><span className="mr-2 text-emerald-300">✓</span>Support through the whole process</li>
      </ul>
      <p className="mt-8 border-t border-emerald-800 pt-5 text-sm leading-6 text-emerald-100/70">No need to search through profiles or negotiate. We’ll help coordinate the right service for your home.</p>
    </aside>
  );
}
