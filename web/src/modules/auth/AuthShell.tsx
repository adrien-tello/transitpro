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
          <p className="mt-3.5 text-base leading-relaxed text-white/85">
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
        <div className="mt-auto flex max-w-[420px] items-center gap-3.5 rounded-[20px] bg-surface px-[18px] py-4 text-ink max-md:hidden">
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
      <section aria-label="Account" className="flex min-w-0 flex-[1_1_440px] flex-col rounded-[28px] bg-surface px-11 py-10 max-md:px-6 max-md:py-8">
        <div className="m-auto w-full max-w-[400px]">{children}</div>
      </section>
    </div>
  );
}
