import { useEffect, useState, type FormEvent } from 'react';
import type { Me } from '@contracts/api-types';
import { Button } from '../../components/ui/Button';
import { Badge, Card, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { FormError, SelectField, TextField } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { errorMessage, fieldError } from '../../lib/api';
import { dateTime, fcfa } from '../../lib/format';
import { PaymentLine, WaitingForPhone } from '../parcels/parcel-ui';
import { VerifiedCard, VerifiedSeal } from '../../components/ui/VerifiedBadge';
import { useBadge, useBuyBadge } from './agencies.api';

// The OPTIONAL paid "Verified" badge (owner). Every agency is checked for free before it can work; the badge
// is extra visibility: customers see TransitPro's seal next to the agency's name. Bought while the agency is
// still waiting for verification, it also puts the agency first in the team's queue.

const ADVANTAGES: (readonly [IconName, string])[] = [
  ['shield', 'A "Verified" mark next to your name in the customer app: search results, your profile and the e-ticket.'],
  ['users', 'Customers see that TransitPro checked your papers: they book and send parcels with more confidence.'],
  ['ticket', 'It sets you apart from agencies without the badge when customers compare trips.'],
  ['cal', 'Valid one year. Renew in the last 2 months, nothing to send again.'],
];

export function BadgeCard({ me }: { me: Me }) {
  const q = useBadge();
  const waiting = me.agency?.status === 'PENDING' || me.agency?.status === 'REJECTED';
  const advantages: (readonly [IconName, string])[] = waiting
    ? [['clock', 'Checked first: the TransitPro team reviews agencies with the badge before the others.'], ...ADVANTAGES]
    : [...ADVANTAGES];
  return (
    <Card
      title="Verified badge"
      subtitle={waiting ? 'Optional. Get checked first, and show customers TransitPro’s seal from day one.' : 'Optional. Your agency works normally without it.'}
      className="scroll-mt-24"
    >
      <div id="badge" />
      {q.isPending ? (
        <SkeletonRows rows={3} cols={2} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="tp-fade flex flex-col gap-4">
          <VerifiedCard name={me.agency?.name ?? ''} until={q.data.activeUntil} preview={!q.data.active} />
          {/* How it looks in the customer app */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-soft p-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-tint text-[13px] font-extrabold text-warning">
              {me.agency?.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-[15px] font-extrabold text-ink">
                {me.agency?.name}
                <VerifiedSeal size={18} muted={!q.data.active} />
              </span>
              <span className="block text-xs text-muted">In the customer app {q.data.active ? 'now' : 'with the badge'}: search results, profile, e-ticket</span>
            </span>
            {q.data.active ? (
              <Badge tone="green">Active until {dateTime(q.data.activeUntil!).split(' · ')[0]}</Badge>
            ) : (
              <Badge tone="grey">Not active</Badge>
            )}
          </div>
          {q.data.active && waiting && (
            <p className="rounded-xl bg-primary-tint px-3 py-2.5 text-[13px] font-semibold text-primary-dark">Paid: your agency is first in the TransitPro team’s queue.</p>
          )}

          <ul className="flex flex-col gap-2.5">
            {advantages.map(([icon, text]) => (
              <li key={text} className="flex gap-3 text-sm text-body">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary-dark">
                  <Icon name={icon} size={16} strokeWidth={2} />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>

          {!q.data.active && (
            <p className="rounded-xl bg-warning-tint px-3 py-2.5 text-[13px] text-warning">
              Without the badge, customers do not see that your agency was checked. Some customers choose only agencies they can trust at a glance.
            </p>
          )}

          <BuyBadge data={q.data} />
        </div>
      )}
    </Card>
  );
}

function BuyBadge({ data }: { data: NonNullable<ReturnType<typeof useBadge>['data']> }) {
  const buy = useBuyBadge();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'MTN_MOMO' | 'ORANGE_MONEY'>('MTN_MOMO');
  const [number, setNumber] = useState('');
  const pending = data.payment?.status === 'PENDING' ? data.payment : null;
  const renewSoon = data.activeUntil && new Date(data.activeUntil).getTime() - Date.now() <= 60 * 86_400_000;
  const canBuy = !data.active || renewSoon;

  // The payment settled (live update): say so once
  const [watching, setWatching] = useState<string | null>(null);
  useEffect(() => {
    if (!watching || data.payment?.id !== watching || data.payment.status === 'PENDING') return;
    if (data.payment.status === 'SUCCEEDED') toast('Payment received: your Verified badge is active');
    else toast('The payment did not go through, you can try again', 'error');
    setWatching(null);
  }, [data.payment, watching, toast]);

  if (pending)
    return (
      <div className="flex flex-col gap-2">
        <WaitingForPhone p={pending} />
      </div>
    );

  function submit(e: FormEvent) {
    e.preventDefault();
    buy.mutate(
      { method, payerPhone: number },
      {
        onSuccess: (d) => {
          setOpen(false);
          if (d.payment) setWatching(d.payment.id);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.payment && data.payment.status === 'FAILED' && <PaymentLine p={data.payment} />}
      {!canBuy ? (
        <p className="text-[13px] text-muted">You can renew in the last 2 months before {dateTime(data.activeUntil!).split(' · ')[0]}.</p>
      ) : !open ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button icon="shield" onClick={() => setOpen(true)}>
            {data.active ? `Renew for ${fcfa(data.price)}` : `Get the badge · ${fcfa(data.price)} / year`}
          </Button>
          <span className="text-[13px] text-muted">Optional: you can do it later from Settings.</span>
        </div>
      ) : (
        <form onSubmit={submit} className="tp-fade flex flex-col gap-3 rounded-2xl bg-soft p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            <SelectField label="Pay with" value={method} onChange={(e) => setMethod(e.target.value as 'MTN_MOMO')}>
              <option value="MTN_MOMO">MTN Mobile Money</option>
              <option value="ORANGE_MONEY">Orange Money</option>
            </SelectField>
            <TextField label="Number that pays" inputMode="tel" placeholder="6XX XX XX XX" value={number} onChange={(e) => setNumber(e.target.value)} error={fieldError(buy.error, 'payerPhone')} required />
          </div>
          <p className="text-[13px] text-body">
            {fcfa(data.price)} for {data.months} months. You approve the payment on that phone; the badge appears as soon as it is confirmed.
          </p>
          <FormError message={buy.isError && !fieldError(buy.error, 'payerPhone') ? errorMessage(buy.error) : null} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" icon="send" loading={buy.isPending} disabled={!number.trim()}>
              Pay {fcfa(data.price)}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
