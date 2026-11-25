export default function SiteFooter() {
  return (
    <footer className="px-6 pb-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 border-t border-stone-200 pt-6 text-sm text-stone-500 sm:flex-row">
        <a href="/" aria-label="HomeEase home" className="font-semibold text-emerald-950">homeease<span className="text-emerald-700">.</span></a>
        <span>Your home. Handled.</span>
      </div>
    </footer>
  );
}
