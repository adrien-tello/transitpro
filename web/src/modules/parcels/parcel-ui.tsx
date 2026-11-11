import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { ParcelStatus, PaymentView } from '@contracts/api-types';
import { Badge } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon';
import { Spinner } from '../../components/ui/Button';
import { fcfa, phone } from '../../lib/format';

// Small pieces shared by the parcel pages

const STATUS: Record<ParcelStatus, { label: string; tone: 'blue' | 'green' | 'amber' | 'red' | 'grey' | 'violet' }> = {
  REGISTERED: { label: 'Registered', tone: 'grey' },
  LOADED: { label: 'On the bus', tone: 'blue' },
  IN_TRANSIT: { label: 'In transit', tone: 'blue' },
  ARRIVED: { label: 'At the branch', tone: 'violet' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'amber' },
  DELIVERED: { label: 'Delivered', tone: 'green' },
  ON_HOLD: { label: 'On hold', tone: 'red' },
  REFUSED: { label: 'Refused', tone: 'red' },
  RETURNED: { label: 'Returned', tone: 'grey' },
};

export const statusLabel = (s: ParcelStatus) => STATUS[s].label;
export function StatusBadge({ status }: { status: ParcelStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

export const METHOD_LABEL = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money' } as const;

const FAIL_TEXT: Record<string, string> = {
  FAILED: 'Refused: not enough money, or the account is blocked',
  EXPIRED: 'No answer on the phone in time',
  CANCELED: 'The payer cancelled on the phone',
  PROVIDER_ERROR: 'Mobile Money is unavailable right now',
};

// One line per payment: waiting (with a live dot), paid, failed and why
export function PaymentLine({ p }: { p: PaymentView }) {
  const what = p.purpose === 'COD_COLLECTION' ? 'Cash on delivery' : 'Parcel fee';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-soft px-3.5 py-3">
      <span className="min-w-0 flex-[1_1_200px]">
        <span className="block text-sm font-bold text-ink">
          {what} · {fcfa(p.amount)}
        </span>
        <span className="block text-xs text-muted">
          {METHOD_LABEL[p.method]}
          {p.payerPhone ? ` · ${phone(p.payerPhone)}` : ''}
          {p.platformFee > 0 ? ` · TransitPro ${fcfa(p.platformFee)}` : ''}
        </span>
        {p.status === 'FAILED' && p.failureReason && <span className="mt-0.5 block text-xs font-semibold text-danger">{FAIL_TEXT[p.failureReason]}</span>}
      </span>
      {p.status === 'PENDING' ? (
        <Badge tone="amber">
          <Spinner className="!h-3 !w-3" /> Waiting for the phone
        </Badge>
      ) : p.status === 'SUCCEEDED' ? (
        <Badge tone="green">Paid</Badge>
      ) : p.status === 'REFUNDED' ? (
        <Badge tone="grey">Refunded</Badge>
      ) : (
        <Badge tone="red">Failed</Badge>
      )}
    </div>
  );
}

// "Approve on your phone" panel, shown while a Mobile Money payment is PENDING
export function WaitingForPhone({ p }: { p: PaymentView }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div role="status" className="flex items-center gap-4 rounded-2xl border border-warning/25 bg-warning-tint p-4">
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-warning">
        <Icon name="phone" size={22} />
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-accent motion-reduce:animate-none" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-ink">Waiting for approval on {phone(p.payerPhone)}</div>
        <div className="text-[13px] text-warning">
          {METHOD_LABEL[p.method]} sent a prompt for {fcfa(p.amount)}. Ask the payer to approve it on their phone. {seconds > 0 && `(${seconds}s)`}
        </div>
      </div>
    </div>
  );
}

// QR code of the tracking code, drawn in the browser (what the staff app scans)
export function TrackingQr({ code, size = 112 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    QRCode.toDataURL(code, { margin: 1, width: size * 2, color: { dark: '#0E1726', light: '#FFFFFF' } }).then(setSrc);
  }, [code, size]);
  return src ? <img src={src} width={size} height={size} alt={`QR code for ${code}`} className="shrink-0 rounded-lg" /> : <span className="tp-skeleton block shrink-0 rounded-lg" style={{ width: size, height: size }} />;
}
