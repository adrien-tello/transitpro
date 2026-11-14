import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import type { Me, ParcelDetail, PaymentMethod } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormError, TextArea, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { ApiError, errorMessage } from '../../lib/api';
import { dateTime, fcfa, phone } from '../../lib/format';
import { METHOD_LABEL, PaymentLine, StatusBadge, TrackingQr, WaitingForPhone } from './parcel-ui';
import { useCodPayment, useDeliver, useFeePayment, useParcel, useRefuse, useReleaseHold, useScan } from './parcels.api';

const EVENT_LABEL: Record<string, string> = {
  REGISTERED: 'Registered and sealed',
  LOADED: 'Loaded on the bus',
  DEPARTED: 'Bus departed',
  ARRIVED: 'Arrived, weighed again',
  HANDED_TO_COURIER: 'Handed to the courier',
  DELIVERY_ATTEMPT: 'Wrong delivery code',
  DELIVERED: 'Delivered with the receiver’s code',
  REFUSED: 'Refused by the receiver',
  HELD: 'Put on hold',
};

export function ParcelDetailPage({ me }: { me: Me }) {
  const { id = '' } = useParams();
  const q = useParcel(id);

  if (q.isPending) return <DetailSkeleton />;
  if (q.isError)
    return (
      <Card>
        <ErrorState
          error={q.error instanceof ApiError && q.error.status === 404 ? new ApiError(404, 'NOT_FOUND', `No parcel ${id} in your agency`) : q.error}
          onRetry={() => q.refetch()}
        />
      </Card>
    );
  return <Detail p={q.data} me={me} />;
}

function Detail({ p, me }: { p: ParcelDetail; me: Me }) {
  const s = p.security;
  const weightTone = s.weightOk === false ? 'red' : s.weightOk ? 'green' : 'grey';
  const fee = [...p.payments].reverse().find((x) => x.purpose === 'PARCEL_FEE');
  const pending = p.payments.find((x) => x.status === 'PENDING');

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/">Dashboard</Link> / <Link to="/parcels">Parcels</Link> / {p.trackingCode}
          </>
        }
        title={p.trackingCode}
        subtitle={`${p.from.city} ${p.from.branch} → ${p.to.city} ${p.to.branch}${p.trip ? ` · Trip ${dateTime(p.trip.departureAt)}` : ''} · ${p.homeDelivery ? 'Home delivery' : 'Pickup at the branch'}`}
        actions={
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>
            Print label
          </Button>
        }
      />
      <div className="-mt-2 flex flex-wrap gap-2">
        <StatusBadge status={p.status} />
        {s.weightOk === false && <Badge tone="red">Weight mismatch</Badge>}
        {p.codAmount ? <Badge tone="amber">Cash on delivery {fcfa(p.codAmount)}</Badge> : null}
        {fee?.status !== 'SUCCEEDED' && <Badge tone="red">Fee not paid</Badge>}
      </div>

      {pending && <WaitingForPhone p={pending} />}

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <NextStep p={p} me={me} />

          <Card title="Security checks">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              <Check tone="grey" label="Seal" value={s.sealNumber} text="Check it is intact before the code" />
              <Check
                tone={weightTone}
                label="Weight"
                value={s.weightAtArrivalKg == null ? `${s.weightAtRegistrationKg} kg` : `${s.weightAtRegistrationKg} → ${s.weightAtArrivalKg} kg`}
                text={s.weightOk == null ? 'Weighed again on arrival' : s.weightOk ? 'Same weight (±0.1 kg)' : `${s.weightDifferenceKg} kg of difference`}
              />
              <Check
                tone={p.status === 'DELIVERED' ? 'green' : s.deliveryAttempts > 0 ? 'amber' : 'grey'}
                label="Delivery code"
                value={p.status === 'DELIVERED' ? 'Used' : `${s.deliveryAttempts}/${s.maxAttempts} wrong`}
                text={p.status === 'DELIVERED' ? `Delivered ${dateTime(p.delivery.deliveredAt)}` : `Valid until ${dateTime(s.codeExpiresAt)}`}
              />
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[13px] font-bold text-muted">Photos taken at registration (before sealing)</div>
              <div className="flex flex-wrap gap-2.5">
                {s.photoUrls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-[104px] w-[140px] overflow-hidden rounded-xl bg-chip">
                    <img src={url} alt={`Contents photo ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </a>
                ))}
                {p.delivery.photoUrl && (
                  <a href={p.delivery.photoUrl} target="_blank" rel="noreferrer" className="relative block h-[104px] w-[140px] overflow-hidden rounded-xl bg-chip">
                    <img src={p.delivery.photoUrl} alt="Proof of delivery" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-success-solid px-2 py-0.5 text-[11px] font-bold text-white">Proof of delivery</span>
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card title="Parcel information">
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-6 gap-y-3.5">
              <Info k="Sender" v={`${p.sender.name} · ${phone(p.sender.phone)}`} />
              <Info k="Receiver" v={`${p.receiver.name} · ${phone(p.receiver.phone)}`} />
              <Info k="Declared contents" v={p.declaredContents} />
              <Info k="Declared value" v={fcfa(p.declaredValue)} />
              <Info k="Price" v={`${fcfa(p.price.total)}${p.insured ? ' · insured' : ''}`} />
              <Info k="Delivery" v={p.homeDelivery ? `Home · ${p.deliveryAddress}` : 'Pickup at the branch'} />
              <Info k="Registered by" v={`${p.registeredBy.name} · ${p.registeredBy.jobTitle}`} />
              <Info k="Responsible now" v={p.currentHolder ? `${p.currentHolder.name} · ${p.currentHolder.jobTitle}` : '—'} />
            </dl>
          </Card>

          <Card title="Payments" subtitle="Fee paid by the sender; cash on delivery paid by the receiver and held until the code is given">
            <div className="flex flex-col gap-2">
              {p.payments.map((x) => (
                <PaymentLine key={x.id} p={x} />
              ))}
              {p.escrow && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                  <span className="flex-1 text-sm">
                    <b className="text-ink">Escrow {fcfa(p.escrow.amount)}</b>{' '}
                    <span className="text-muted">for the sender ({phone(p.escrow.beneficiaryPhone)})</span>
                  </span>
                  <Badge tone={p.escrow.status === 'RELEASED' ? 'green' : p.escrow.status === 'HELD' ? 'amber' : 'grey'}>
                    {p.escrow.status === 'HELD' ? 'Held' : p.escrow.status === 'RELEASED' ? 'Released to the sender' : 'Refunded to the receiver'}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {p.claims.length > 0 && (
            <Card title="Claims">
              {p.claims.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-tint px-3.5 py-3">
                  <span className="flex-1 text-sm text-ink">{c.reason}</span>
                  <Badge tone="red">{c.status.replace('_', ' ').toLowerCase()}</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <Card title="Chain of custody" subtitle="Every scan: who, when, where. The last person is responsible.">
            <ol className="flex flex-col">
              {p.events.map((e, i) => {
                const bad = e.type === 'HELD' || e.type === 'REFUSED' || e.type === 'DELIVERY_ATTEMPT';
                const last = i === p.events.length - 1;
                return (
                  <li key={i} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-[3px] ${bad ? 'border-danger-tint bg-danger' : 'border-primary-tint bg-primary'}`} />
                      {!last && <span className="min-h-[34px] w-0.5 flex-1 bg-line" />}
                    </div>
                    <div className="pb-4">
                      <div className="text-sm font-bold text-ink">{EVENT_LABEL[e.type] ?? e.type}</div>
                      <div className="text-[13px] text-muted">
                        {e.by.name}, {e.by.jobTitle.toLowerCase()}
                        {e.branch ? ` · ${e.branch.branch}` : ''}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {dateTime(e.at)}
                        {e.weightKg != null ? ` · ${e.weightKg} kg` : ''}
                        {e.lat != null ? ' · GPS saved' : ''}
                      </div>
                      {e.note && <div className={`mt-1 text-xs font-semibold ${bad ? 'text-danger' : 'text-body'}`}>{e.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <TrackingQr code={p.trackingCode} size={96} />
              <div>
                <div className="text-xs font-semibold text-muted">Printed label</div>
                <div className="font-mono text-lg font-extrabold text-ink">{p.trackingCode}</div>
                <div className="text-[13px] text-muted">Scan to update the status. Customers type the code to track.</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="tp-print hidden print:block">
        <div style={{ border: '2px solid #0E1726', borderRadius: 12, padding: 16, width: 360, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>TransitPro · Parcel label</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
            <TrackingQr code={p.trackingCode} size={120} />
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800 }}>{p.trackingCode}</div>
              <div>
                {p.from.city} → {p.to.city} ({p.to.branch})
              </div>
              <div>
                Seal {s.sealNumber} · {p.weightKg} kg
              </div>
              <div>{p.homeDelivery ? 'HOME DELIVERY' : 'PICKUP AT BRANCH'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// The one thing to do now, depending on the status and on who is looking.
// The server checks the same rules (right branch, right role): an error here is shown as is.
function NextStep({ p, me }: { p: ParcelDetail; me: Me }) {
  const owner = me.role === 'AGENCY_OWNER';
  const fee = [...p.payments].reverse().find((x) => x.purpose === 'PARCEL_FEE');
  const feePending = fee?.status === 'PENDING';

  if (p.status === 'REGISTERED' && fee?.status !== 'SUCCEEDED' && !feePending) return <RetryFee p={p} />;
  if (p.status === 'REGISTERED' && fee?.status === 'SUCCEEDED')
    return (
      <Panel icon="bus" title="Ready to travel" tone="blue">
        The fee is paid. The driver or the counter agent scans the label when loading it on a bus going to {p.to.city}.
      </Panel>
    );
  if (p.status === 'IN_TRANSIT' || p.status === 'LOADED') return <Receive p={p} />;
  if (p.status === 'ON_HOLD') return me.role === 'BRANCH_MANAGER' || owner ? <ReleaseHold p={p} /> : (
    <Panel icon="alert" title="On hold" tone="red">
      The branch manager of {p.to.branch} must check this parcel before anything else.
    </Panel>
  );
  if (p.status === 'ARRIVED') return <HandOver p={p} />;
  if (p.status === 'OUT_FOR_DELIVERY')
    return (
      <Panel icon="pin" title="With the courier" tone="amber">
        {p.courier?.name ?? 'The courier'} delivers it with the receiver&apos;s code, a photo and the GPS position, from the staff app.
      </Panel>
    );
  if (p.status === 'DELIVERED')
    return (
      <Panel icon="check" title="Delivered" tone="green">
        Handed over {dateTime(p.delivery.deliveredAt)} with the receiver&apos;s code{p.escrow?.status === 'RELEASED' ? ', and the cash on delivery was released to the sender' : ''}.
      </Panel>
    );
  return null;
}

function Panel({ icon, title, tone, children }: { icon: 'bus' | 'alert' | 'pin' | 'check'; title: string; tone: 'blue' | 'red' | 'amber' | 'green'; children: ReactNode }) {
  const t = { blue: 'bg-primary-tint text-primary-dark', red: 'bg-danger-tint text-danger', amber: 'bg-warning-tint text-warning', green: 'bg-success-tint text-success' }[tone];
  return (
    <section className="flex gap-3.5 rounded-2xl border border-line bg-surface p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t}`}>
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        <p className="mt-0.5 text-sm text-body">{children}</p>
      </div>
    </section>
  );
}

function ActionCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-primary/30 bg-surface p-5">
      <div className="mb-1 text-xs font-extrabold uppercase tracking-[0.6px] text-primary">Next step</div>
      <h2 className="text-[17px] font-bold text-ink">{title}</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">{subtitle}</p>
      {children}
    </section>
  );
}

function MethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['CASH', 'MTN_MOMO', 'ORANGE_MONEY'] as const).map((m) => (
        <label key={m} className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm ${value === m ? 'border-2 border-primary font-bold text-ink' : 'border border-field font-semibold text-body'}`}>
          <input type="radio" checked={value === m} onChange={() => onChange(m)} className="accent-primary" />
          {METHOD_LABEL[m]}
        </label>
      ))}
    </div>
  );
}

function RetryFee({ p }: { p: ParcelDetail }) {
  const pay = useFeePayment(p.id);
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [number, setNumber] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    pay.mutate({ method, payerPhone: method === 'CASH' ? undefined : number || undefined }, { onSuccess: () => toast(method === 'CASH' ? 'Fee paid in cash' : 'Prompt sent to the phone') });
  }
  return (
    <ActionCard title="Take the fee payment again" subtitle={`The last payment did not go through. ${fcfa(p.price.total)} to pay before the parcel can travel.`}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <MethodPicker value={method} onChange={setMethod} />
        {method !== 'CASH' && <TextField label="Number that pays" type="tel" placeholder={phone(p.sender.phone)} hint="Empty = the sender's phone" value={number} onChange={(e) => setNumber(e.target.value)} className="max-w-xs" />}
        <FormError message={pay.isError ? errorMessage(pay.error) : null} />
        <div>
          <Button type="submit" loading={pay.isPending}>
            {method === 'CASH' ? 'Cash received' : 'Send the prompt'}
          </Button>
        </div>
      </form>
    </ActionCard>
  );
}

function Receive({ p }: { p: ParcelDetail }) {
  const scan = useScan(p.id);
  const toast = useToast();
  const [kg, setKg] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    scan.mutate(
      { type: 'ARRIVED', weightKg: Number(kg) },
      { onSuccess: (r) => toast(r.status === 'ON_HOLD' ? 'Weight differs: parcel put on hold' : 'Parcel received at the branch', r.status === 'ON_HOLD' ? 'error' : 'success') },
    );
  }
  return (
    <ActionCard title={`Receive it at ${p.to.branch}`} subtitle={`Weigh it again. It weighed ${p.weightKg} kg at registration: more than 0.1 kg of difference puts it on hold.`}>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <TextField label="Weight now (kg)" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))} className="w-44" autoFocus />
        <Button type="submit" icon="scale" loading={scan.isPending} disabled={!(Number(kg) > 0)}>
          Weigh and receive
        </Button>
        <div className="w-full">
          <FormError message={scan.isError ? errorMessage(scan.error) : null} />
        </div>
      </form>
    </ActionCard>
  );
}

function HandOver({ p }: { p: ParcelDetail }) {
  const cod = useCodPayment(p.id);
  const deliver = useDeliver(p.id);
  const refuse = useRefuse(p.id);
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const codPending = p.payments.some((x) => x.purpose === 'COD_COLLECTION' && x.status === 'PENDING');
  const needsCod = !!p.codAmount && p.escrow?.status !== 'HELD';

  if (p.homeDelivery && !needsCod)
    return (
      <Panel icon="pin" title="Waiting for a courier" tone="blue">
        Hand it to a courier from the staff app (scan the label, choose the courier). The receiver can also collect it here with the code.
      </Panel>
    );

  if (refusing)
    return (
      <ActionCard title="The receiver refuses the parcel" subtitle="A claim is opened and any cash on delivery goes back to the receiver.">
        <div className="flex flex-col gap-3">
          <TextArea label="Why (seal broken, contents differ…)" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          <FormError message={refuse.isError ? errorMessage(refuse.error) : null} />
          <div className="flex gap-2.5">
            <Button variant="ghost" onClick={() => setRefusing(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={refuse.isPending} disabled={reason.trim().length < 3} onClick={() => refuse.mutate({ reason }, { onSuccess: () => toast('Parcel refused, claim opened', 'error') })}>
              Confirm the refusal
            </Button>
          </div>
        </div>
      </ActionCard>
    );

  if (needsCod)
    return (
      <ActionCard title={`The receiver pays ${fcfa(p.codAmount)} first`} subtitle="Cash on delivery: the money is held by TransitPro and given to the sender only when the receiver gives the code.">
        {codPending ? (
          <p className="text-sm font-semibold text-warning">Waiting for the receiver to approve on their phone…</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              cod.mutate({ method, payerPhone: method === 'CASH' ? undefined : number || undefined }, { onSuccess: () => toast(method === 'CASH' ? 'Cash on delivery received and held' : 'Prompt sent to the receiver') });
            }}
            className="flex flex-col gap-3"
          >
            <MethodPicker value={method} onChange={setMethod} />
            {method !== 'CASH' && <TextField label="Receiver's Mobile Money number" type="tel" placeholder={phone(p.receiver.phone)} hint="Empty = the receiver's phone" value={number} onChange={(e) => setNumber(e.target.value)} className="max-w-xs" />}
            <FormError message={cod.isError ? errorMessage(cod.error) : null} />
            <div className="flex flex-wrap gap-2.5">
              <Button type="submit" loading={cod.isPending}>
                {method === 'CASH' ? 'Cash received' : 'Send the prompt'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRefusing(true)}>
                Receiver refuses
              </Button>
            </div>
          </form>
        )}
      </ActionCard>
    );

  return (
    <ActionCard title="Hand it over at the counter" subtitle={`Show the parcel. The receiver checks seal ${p.security.sealNumber} and the contents, then gives the 4-digit code.`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          deliver.mutate({ otp: code }, { onSuccess: () => toast('Parcel delivered'), onError: () => setCode('') });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label="Receiver's code"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="w-44 [&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-[8px]"
          autoFocus
        />
        <Button type="submit" icon="check" loading={deliver.isPending} disabled={code.length !== 4}>
          Deliver
        </Button>
        <Button type="button" variant="secondary" onClick={() => setRefusing(true)}>
          Receiver refuses
        </Button>
        <div className="w-full">
          <FormError message={deliver.isError ? errorMessage(deliver.error) : null} />
        </div>
      </form>
    </ActionCard>
  );
}

function ReleaseHold({ p }: { p: ParcelDetail }) {
  const release = useReleaseHold(p.id);
  const [note, setNote] = useState('');
  const held = [...p.events].reverse().find((e) => e.type === 'HELD');
  if (release.data)
    return (
      <section className="rounded-2xl bg-inverse p-5 text-white">
        <div className="text-sm font-bold">Released. New delivery code, for the sender only</div>
        <p className="mt-1 text-[13px] text-white/80">The old code no longer works. Give this one to the sender (shown once).</p>
        <div className="mt-3 w-fit rounded-2xl bg-white/10 px-5 py-3 font-mono text-[36px] font-extrabold tracking-[10px]">{release.data.deliveryCode}</div>
      </section>
    );
  return (
    <ActionCard title="Check this parcel, then release it" subtitle={held?.note ?? 'The parcel was stopped by a safety check.'}>
      <div className="flex flex-col gap-3">
        <TextArea label="What you checked" placeholder="Opened with the receiver: extra packaging, contents complete." value={note} onChange={(e) => setNote(e.target.value)} />
        <FormError message={release.isError ? errorMessage(release.error) : null} />
        <div>
          <Button loading={release.isPending} disabled={note.trim().length < 5} onClick={() => release.mutate({ note })}>
            Release and make a new code
          </Button>
        </div>
      </div>
    </ActionCard>
  );
}

function Check({ tone, label, value, text }: { tone: 'grey' | 'green' | 'red' | 'amber'; label: string; value: string; text: string }) {
  const t = { grey: 'bg-chip text-body', green: 'bg-success-tint text-success', red: 'bg-danger-tint text-danger', amber: 'bg-warning-tint text-warning' }[tone];
  return (
    <div className={`rounded-xl p-3.5 ${t}`}>
      <div className="text-xs font-bold">{label}</div>
      <div className="mt-1 text-[19px] font-extrabold text-ink">{value}</div>
      <div className="text-[13px]">{text}</div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted">{k}</dt>
      <dd className="mt-0.5 break-words text-sm font-bold text-ink">{v}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-9 w-72" />
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
