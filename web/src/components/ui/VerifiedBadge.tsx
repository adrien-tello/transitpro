// TransitPro's own "Verified" seal: a scalloped rosette in the brand blue, a white check, and the orange
// "stop" dot of the logo. Customers learn to recognise it; nobody else uses this shape.
// Mobile app (Adrien): same drawing with react-native-svg, path below (24×24 box), colors #1E4FD8 / #F59E0B / white.

function sealPath(points = 16, outer = 11, inner = 9.7, cx = 12, cy = 12) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
}
export const SEAL_PATH = sealPath();

// The seal alone (next to a name, in a list)
export function VerifiedSeal({ size = 18, title = 'Verified by TransitPro', muted = false }: { size?: number; title?: string; muted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title} className="shrink-0">
      <title>{title}</title>
      <path d={SEAL_PATH} fill={muted ? 'var(--color-field)' : '#1E4FD8'} stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.8" />
      <path d="M7.9 12.2l2.7 2.7 5.5-5.6" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      {!muted && <circle cx="18.9" cy="18.9" r="2.6" fill="#F59E0B" stroke="#ffffff" strokeWidth="1.2" />}
    </svg>
  );
}

// The pill: seal + "Verified" (agency cards, tables)
export function VerifiedPill({ year }: { year?: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint py-0.5 pl-0.5 pr-2 text-[11px] font-extrabold text-primary-dark">
      <VerifiedSeal size={16} />
      Verified{year ? ` · ${year}` : ''}
    </span>
  );
}

// The big version (Settings, the pending page): what the agency buys
export function VerifiedCard({ name, until, preview = false }: { name: string; until?: string | null; preview?: boolean }) {
  const year = until ? new Date(until).getFullYear() : new Date().getFullYear() + 1;
  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[#0e1726] px-5 py-4 text-white">
      {/* soft rings behind the seal */}
      <svg aria-hidden="true" width="180" height="180" viewBox="0 0 24 24" className="pointer-events-none absolute -right-10 -top-10 opacity-[0.12]">
        <path d={SEAL_PATH} fill="none" stroke="#ffffff" strokeWidth="0.4" />
        <path d={sealPath(16, 8, 7, 12, 12)} fill="none" stroke="#ffffff" strokeWidth="0.4" />
      </svg>
      <span className={preview ? 'opacity-80' : ''}>
        <VerifiedSeal size={56} />
      </span>
      <div className="relative min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#F59E0B]">TransitPro Verified</div>
        <div className="truncate text-[18px] font-extrabold">{name}</div>
        <div className="text-xs text-white/70">{preview ? `Your badge until ${year}` : `Papers checked by TransitPro · valid until ${new Date(until!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}</div>
      </div>
    </div>
  );
}
