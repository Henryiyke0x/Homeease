export default function CareMatchIllustration() {
  return (
    <div className="care-match-illustration relative isolate mb-7 flex h-32 items-end rounded-2xl px-4 pb-4" aria-label="Illustration showing a trusted HomeEase professional matched to your request" role="img">
      <div className="care-illustration-orbit" />
      <span className="care-avatar care-avatar-one">A</span>
      <span className="care-avatar care-avatar-two">M</span>
      <span className="care-avatar care-avatar-three">T</span>
      <div className="care-match-caption relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5">
        <span className="care-match-check" aria-hidden="true">✓</span>
        <span><b className="block text-xs">Matched with care</b><small className="mt-0.5 block text-[10px]">A trusted helper for your home</small></span>
      </div>
      <span className="care-illustration-spark" aria-hidden="true">✦</span>
    </div>
  );
}
