import type { ReactNode } from 'react';
import { Icon, type IconName } from '../../components/ui/Icon';
import { LogoMark } from '../../components/ui/Logo';

// Sign-in layout from the design: blue story panel on the left, white form panel on the right
const POINTS: { t: string; icon: IconName }[] = [
  { t: 'Online booking with MoMo and Orange Money', icon: 'ticket' },
  { t: 'Sealed parcels, scanned at every handover', icon: 'shield' },
  { t: 'Delivery only with the receiver’s code', icon: 'lock' },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap gap-5 bg-canvas p-5">
      <section
        aria-label="About TransitPro"
        className="flex min-w-0 flex-[1_1_520px] flex-col gap-8 rounded-[28px] bg-primary px-11 py-10 text-white max-md:px-7 max-md:py-8"
      >
        <div className="flex items-center gap-2.5">
          <LogoMark size={40} inverted />
          <span className="text-[21px] font-extrabold">TransitPro</span>
        </div>
        <div className="max-w-[520px]">
          <h1 className="text-[40px] font-extrabold leading-[1.12] tracking-[-1px] max-md:text-[30px]">
            Every ticket, bus and parcel of your agency, in one place.
          </h1>
          <p className="mt-3.5 text-base leading-relaxed text-[#DCE5FF]">
            Sell seats, track parcels from counter to doorstep, keep buses on the road and close the day&apos;s cash without the notebook.
          </p>
        </div>
        <ul className="flex flex-col gap-3.5">
          {POINTS.map((p) => (
            <li key={p.t} className="flex items-center gap-3">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white/15">
                <Icon name={p.icon} size={18} strokeWidth={2} />
              </span>
              <span className="text-[15px] font-semibold">{p.t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex max-w-[420px] items-center gap-3.5 rounded-[20px] bg-white px-[18px] py-4 text-ink max-md:hidden">
          <span className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-warning-tint text-warning">
            <Icon name="box" size={20} strokeWidth={2} />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold">TP-DOU-48230 delivered</span>
            <span className="block text-xs text-muted">Receiver code confirmed · Yaoundé, Bastos · 13:42</span>
          </span>
          <span className="rounded-full bg-success-tint px-2.5 py-1 text-xs font-bold text-success">Done</span>
        </div>
      </section>
      <section aria-label="Account" className="flex min-w-0 flex-[1_1_440px] flex-col rounded-[28px] bg-white px-11 py-10 max-md:px-6 max-md:py-8">
        <div className="m-auto w-full max-w-[400px]">{children}</div>
      </section>
    </div>
  );
}

export function GoogleButton() {
  // Google sign-in for the web needs Google's script on this page: next step. The server side is ready.
  return (
    <button
      type="button"
      disabled
      title="Coming soon on the web"
      className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-field bg-white text-[15px] font-bold text-ink opacity-60"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </button>
  );
}
