// The TransitPro mark: a T with the orange "stop" dot (from the design canvas)
export function LogoMark({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-[10px] ${inverted ? 'bg-white' : 'bg-primary'}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 15h22M24 15v13" stroke={inverted ? '#1E4FD8' : '#FFFFFF'} strokeWidth="5" strokeLinecap="round" />
        <circle cx="24" cy="35.5" r="3.6" fill="#F59E0B" />
      </svg>
    </span>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-[20px] font-extrabold tracking-[-0.4px] text-ink">
        Transit<span className="text-primary">Pro</span>
      </span>
    </span>
  );
}
