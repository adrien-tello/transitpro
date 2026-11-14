import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Me, ParcelRegistered, PaymentMethod } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button, Spinner } from '../../components/ui/Button';
import { Card, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormError, SelectField, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { ApiError, errorMessage, fieldError } from '../../lib/api';
import { fcfa, phone } from '../../lib/format';
import { useBranches } from '../agencies/agencies.api';
import { METHOD_LABEL, PaymentLine, TrackingQr, WaitingForPhone } from './parcel-ui';
import { uploadPhoto, useParcel, useRegisterParcel } from './parcels.api';

// Same price rules as the server (server/src/modules/parcels/parcels.pricing.ts). The server's price is the one charged.
const PRICING = { base: 1000, perKg: 250, homeDelivery: 1000, insuranceRate: 0.02, insuranceMin: 500, commission: 0.1 };

interface Photo {
  id: string;
  preview: string; // local preview while uploading
  url?: string; // server URL once uploaded
  error?: string;
}

const emptyForm = {
  originBranchId: '',
  destinationBranchId: '',
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  receiverName: '',
  receiverPhone: '',
  receiverEmail: '',
  declaredContents: '',
  declaredValue: '',
  weightKg: '',
  sealNumber: '',
  homeDelivery: false,
  deliveryAddress: '',
  insured: false,
  cod: false,
  codAmount: '',
  paymentMethod: 'CASH' as PaymentMethod,
  payerPhone: '',
};

export function RegisterParcelPage({ me }: { me: Me }) {
  const branches = useBranches();
  const register = useRegisterParcel();
  const toast = useToast();
  const [f, setF] = useState(emptyForm);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [result, setResult] = useState<ParcelRegistered | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const originId = me.employee?.branchId ?? f.originBranchId;
  const destinations = (branches.data ?? []).filter((b) => b.id !== originId);
  const origin = branches.data?.find((b) => b.id === originId);
  const destination = branches.data?.find((b) => b.id === f.destinationBranchId);

  const weight = Number(f.weightKg) || 0;
  const value = Number(f.declaredValue) || 0;
  const price = useMemo(() => {
    const transport = weight > 0 ? PRICING.base + PRICING.perKg * Math.ceil(weight) : 0;
    const home = f.homeDelivery ? PRICING.homeDelivery : 0;
    const insurance = f.insured ? Math.max(PRICING.insuranceMin, Math.round(value * PRICING.insuranceRate)) : 0;
    const total = transport + home + insurance;
    return { transport, home, insurance, total, commission: Math.round(total * PRICING.commission) };
  }, [weight, value, f.homeDelivery, f.insured]);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const id = crypto.randomUUID();
      setPhotos((p) => [...p, { id, preview: URL.createObjectURL(file) }]);
      try {
        const url = await uploadPhoto(file);
        setPhotos((p) => p.map((x) => (x.id === id ? { ...x, url } : x)));
      } catch (e) {
        setPhotos((p) => p.map((x) => (x.id === id ? { ...x, error: errorMessage(e) } : x)));
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const uploading = photos.some((p) => !p.url && !p.error);
  const readyPhotos = photos.filter((p) => p.url).map((p) => p.url!);
  const momo = f.paymentMethod !== 'CASH';
  const canSubmit =
    !!originId &&
    !!f.destinationBranchId &&
    f.senderName.trim().length >= 2 &&
    f.senderPhone.trim().length >= 9 &&
    f.receiverName.trim().length >= 2 &&
    f.receiverPhone.trim().length >= 9 &&
    f.declaredContents.trim().length >= 2 &&
    weight > 0 &&
    f.sealNumber.trim().length > 0 &&
    readyPhotos.length > 0 &&
    !uploading &&
    (!f.homeDelivery || f.deliveryAddress.trim().length >= 5) &&
    (!f.cod || Number(f.codAmount) > 0);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || register.isPending) return;
    register.mutate(
      {
        originBranchId: me.employee?.branchId ? undefined : f.originBranchId,
        destinationBranchId: f.destinationBranchId,
        senderName: f.senderName,
        senderPhone: f.senderPhone,
        senderEmail: f.senderEmail || undefined,
        receiverName: f.receiverName,
        receiverPhone: f.receiverPhone,
        receiverEmail: f.receiverEmail || undefined,
        declaredContents: f.declaredContents,
        declaredValue: value,
        weightKg: weight,
        sealNumber: f.sealNumber.trim(),
        photoUrls: readyPhotos,
        homeDelivery: f.homeDelivery,
        deliveryAddress: f.homeDelivery ? f.deliveryAddress : undefined,
        insured: f.insured,
        codAmount: f.cod ? Number(f.codAmount) : undefined,
        paymentMethod: f.paymentMethod,
        payerPhone: momo ? f.payerPhone || f.senderPhone : undefined,
      },
      {
        onSuccess: (r) => {
          setResult(r);
          toast(`Parcel ${r.parcel.trackingCode} registered`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
    );
  }

  if (result) {
    return (
      <Registered
        result={result}
        onAnother={() => {
          setResult(null);
          setF(emptyForm);
          setPhotos([]);
          register.reset();
        }}
      />
    );
  }

  const err = register.error;
  const fe = (k: string) => fieldError(err, k);

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/">Dashboard</Link> / <Link to="/parcels">Parcels</Link> / New
          </>
        }
        title="Register a parcel"
        subtitle="Weigh, photograph and seal before taking payment. The tracking code is generated when you save."
      />
      {branches.isError ? (
        <Card>
          <ErrorState error={branches.error} onRetry={() => branches.refetch()} />
        </Card>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[3_1_540px] flex-col gap-4">
            <Section n={1} title="Sender and receiver">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                <TextField label="Sender name" value={f.senderName} onChange={(e) => set('senderName', e.target.value)} error={fe('senderName')} autoFocus />
                <TextField label="Sender phone" type="tel" placeholder="677 11 22 33" value={f.senderPhone} onChange={(e) => set('senderPhone', e.target.value)} error={fe('senderPhone')} />
                <TextField label="Receiver name" value={f.receiverName} onChange={(e) => set('receiverName', e.target.value)} error={fe('receiverName')} />
                <TextField label="Receiver phone" type="tel" placeholder="699 44 55 66" value={f.receiverPhone} onChange={(e) => set('receiverPhone', e.target.value)} error={fe('receiverPhone')} />
                <TextField label="Receiver email (optional)" type="email" hint="Gets the delivery code by email" value={f.receiverEmail} onChange={(e) => set('receiverEmail', e.target.value)} error={fe('receiverEmail')} />
                <TextField label="Sender email (optional)" type="email" hint="Gets the code and the delivery notice" value={f.senderEmail} onChange={(e) => set('senderEmail', e.target.value)} error={fe('senderEmail')} />
                {!me.employee?.branchId && (
                  <SelectField label="From branch" value={f.originBranchId} onChange={(e) => set('originBranchId', e.target.value)}>
                    <option value="">Choose…</option>
                    {(branches.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.city} · {b.name}
                      </option>
                    ))}
                  </SelectField>
                )}
                {branches.isPending ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-body">Destination branch</span>
                    <Skeleton className="h-11 w-full" />
                  </div>
                ) : (
                  <SelectField label="Destination branch" value={f.destinationBranchId} onChange={(e) => set('destinationBranchId', e.target.value)} error={fe('destinationBranchId')}>
                    <option value="">Choose…</option>
                    {destinations.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.city} · {b.name}
                      </option>
                    ))}
                  </SelectField>
                )}
                <SelectField label="Delivery" value={f.homeDelivery ? 'home' : 'pickup'} onChange={(e) => set('homeDelivery', e.target.value === 'home')}>
                  <option value="pickup">Pickup at the branch</option>
                  <option value="home">Home delivery (+{fcfa(PRICING.homeDelivery)})</option>
                </SelectField>
                {f.homeDelivery && (
                  <TextField label="Delivery address" placeholder="Bastos, rue 1.234, Yaoundé" value={f.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} error={fe('deliveryAddress')} />
                )}
              </div>
            </Section>

            <Section n={2} title="Contents, weight and photos">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
                <TextField label="Declared contents" placeholder="Phone + clothes" value={f.declaredContents} onChange={(e) => set('declaredContents', e.target.value)} error={fe('declaredContents')} />
                <TextField label="Declared value (FCFA)" inputMode="numeric" value={f.declaredValue} onChange={(e) => set('declaredValue', e.target.value.replace(/\D/g, ''))} error={fe('declaredValue')} />
                <TextField
                  label="Weight from the scale (kg)"
                  inputMode="decimal"
                  placeholder="4.2"
                  value={f.weightKg}
                  onChange={(e) => set('weightKg', e.target.value.replace(',', '.').replace(/[^\d.]/g, ''))}
                  error={fe('weightKg')}
                  hint="Weighed again on arrival: more than 0.1 kg of difference stops the parcel"
                  className={weight > 0 ? '[&_input]:border-success [&_input]:bg-success-tint [&_input]:font-extrabold [&_input]:text-success' : ''}
                />
              </div>
              <div className="mt-4">
                <div className="mb-2 text-[13px] font-semibold text-body">Photos of the contents, before sealing (at least one)</div>
                <div className="flex flex-wrap gap-2.5">
                  {photos.map((p) => (
                    <div key={p.id} className="relative h-24 w-[130px] overflow-hidden rounded-xl bg-chip">
                      <img src={p.preview} alt="Contents" className={`h-full w-full object-cover ${p.url ? '' : 'opacity-50'}`} />
                      {!p.url && !p.error && (
                        <span className="absolute inset-0 flex items-center justify-center text-primary">
                          <Spinner />
                        </span>
                      )}
                      {p.error && <span className="absolute inset-x-0 bottom-0 bg-danger-solid px-2 py-1 text-[11px] font-bold text-white">{p.error}</span>}
                      <button
                        type="button"
                        onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                        aria-label="Remove photo"
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex h-24 w-[130px] flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-primary bg-primary-soft text-[13px] font-bold text-primary"
                    >
                      <Icon name="camera" />
                      Take photo
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                </div>
                {fe('photoUrls') && <p className="mt-1.5 text-xs font-semibold text-danger">{fe('photoUrls')}</p>}
              </div>
              <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-ink">
                <input type="checkbox" checked={f.insured} onChange={(e) => set('insured', e.target.checked)} className="h-[18px] w-[18px] accent-primary" />
                Insure this parcel (2% of the declared value{value ? ` = ${fcfa(Math.max(PRICING.insuranceMin, Math.round(value * PRICING.insuranceRate)))}` : ''})
              </label>
            </Section>

            <Section n={3} title="Seal and payment">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                <TextField label="Seal number (scan the bag)" placeholder="S-0057" value={f.sealNumber} onChange={(e) => set('sealNumber', e.target.value.toUpperCase())} error={fe('sealNumber')} className="[&_input]:font-bold" />
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-[13px] font-semibold text-body">Payment of the fee</legend>
                  <div className="flex flex-wrap gap-2">
                    {(['CASH', 'MTN_MOMO', 'ORANGE_MONEY'] as const).map((m) => (
                      <label
                        key={m}
                        className={`flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm ${f.paymentMethod === m ? 'border-2 border-primary font-bold text-ink' : 'border border-field font-semibold text-body'}`}
                      >
                        <input type="radio" name="pay" checked={f.paymentMethod === m} onChange={() => set('paymentMethod', m)} className="accent-primary" />
                        {METHOD_LABEL[m]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {momo && (
                  <TextField
                    label={`${METHOD_LABEL[f.paymentMethod]} number that pays`}
                    type="tel"
                    placeholder={f.senderPhone || '670 00 00 00'}
                    hint="Empty = the sender's phone. The payer approves on their phone."
                    value={f.payerPhone}
                    onChange={(e) => set('payerPhone', e.target.value)}
                    error={fe('payerPhone')}
                  />
                )}
              </div>
              <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold text-ink">
                <input type="checkbox" checked={f.cod} onChange={(e) => set('cod', e.target.checked)} className="h-[18px] w-[18px] accent-primary" />
                Cash on delivery: the receiver pays the goods when collecting
              </label>
              {f.cod && (
                <TextField
                  className="mt-3 max-w-xs"
                  label="Amount the receiver pays (FCFA)"
                  inputMode="numeric"
                  hint="Held by TransitPro, given to the sender only with the receiver's code"
                  value={f.codAmount}
                  onChange={(e) => set('codAmount', e.target.value.replace(/\D/g, ''))}
                  error={fe('codAmount')}
                />
              )}
            </Section>
          </div>

          <aside aria-label="Summary" className="sticky top-5 flex min-w-0 flex-[2_1_320px] flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-[17px] font-bold text-ink">Summary</h2>
            <Row k={`Transport${weight ? ` (${weight} kg${origin && destination ? `, ${origin.city} → ${destination.city}` : ''})` : ''}`} v={price.transport ? fcfa(price.transport) : '—'} />
            {f.homeDelivery && <Row k="Home delivery" v={fcfa(price.home)} />}
            {f.insured && <Row k="Insurance (2%)" v={fcfa(price.insurance)} />}
            <Row k="Of which TransitPro commission (10%)" v={price.total ? fcfa(price.commission) : '—'} muted />
            {f.cod && Number(f.codAmount) > 0 && <Row k="Cash on delivery (paid by the receiver)" v={fcfa(Number(f.codAmount))} muted />}
            <div className="flex items-baseline justify-between border-t border-line pt-3.5">
              <span className="font-bold text-ink">Total now</span>
              <span className="text-2xl font-extrabold text-ink">{price.total ? fcfa(price.total) : '—'}</span>
            </div>
            <div className="rounded-xl bg-soft p-3.5 text-[13px] text-body">
              After saving: the tracking code and QR label are printed, and the <b>4-digit delivery code</b> is shown once for the sender&apos;s receipt.
              {momo && ' The payer gets a Mobile Money prompt on their phone.'}
            </div>
            <FormError message={err && !(err instanceof ApiError && err.code === 'VALIDATION_ERROR') ? errorMessage(err) : err ? 'Some fields need fixing, see the red messages' : null} />
            <Button type="submit" size="lg" loading={register.isPending} disabled={!canSubmit}>
              {momo ? `Send ${METHOD_LABEL[f.paymentMethod]} prompt and save` : 'Take cash payment and save'}
            </Button>
            {!canSubmit && !register.isPending && (
              <p className="text-center text-xs text-muted">{uploading ? 'Wait for the photos to upload…' : 'Fill the sender, receiver, destination, weight, seal and at least one photo.'}</p>
            )}
          </aside>
        </form>
      )}
    </>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-[17px] font-bold text-ink">
        <span className="text-primary">{n}</span> · {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className={muted ? 'text-muted' : 'text-body'}>{k}</span>
      <span className={`whitespace-nowrap font-bold ${muted ? 'text-muted' : 'text-ink'}`}>{v}</span>
    </div>
  );
}

// After saving: code + QR + delivery code (once), live payment status, print, next actions
function Registered({ result, onAnother }: { result: ParcelRegistered; onAnother: () => void }) {
  // Keeps refreshing while a Mobile Money payment is pending
  const live = useParcel(result.parcel.id);
  const p = live.data ?? result.parcel;
  const fee = [...p.payments].reverse().find((x) => x.purpose === 'PARCEL_FEE');

  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/">Dashboard</Link> / <Link to="/parcels">Parcels</Link> / {p.trackingCode}
          </>
        }
        title="Parcel registered"
        subtitle={`${p.from.city} ${p.from.branch} → ${p.to.city} ${p.to.branch} · ${p.homeDelivery ? 'Home delivery' : 'Pickup at the branch'}`}
        actions={
          <>
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print label and receipt
            </Button>
            <Button icon="plus" onClick={onAnother}>
              Register another
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          {fee?.status === 'PENDING' && <WaitingForPhone p={fee} />}
          {fee?.status === 'SUCCEEDED' && fee.method !== 'CASH' && (
            <div role="status" className="flex items-center gap-3 rounded-2xl bg-success-tint p-4 text-success">
              <Icon name="check" strokeWidth={2.4} /> <span className="font-bold">Payment approved: the parcel can travel.</span>
            </div>
          )}
          {fee?.status === 'FAILED' && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-danger-tint p-4">
              <Icon name="alert" className="text-danger" />
              <span className="flex-1 text-sm font-bold text-danger">The fee is not paid: the parcel cannot be loaded on a bus.</span>
              <Link to={`/parcels/${p.trackingCode}`} className="text-sm font-bold">
                Take the payment again
              </Link>
            </div>
          )}

          <Card>
            <div className="flex flex-wrap items-center gap-5">
              <TrackingQr code={p.trackingCode} size={120} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-muted">Tracking code (on the label)</div>
                <div className="font-mono text-[28px] font-extrabold tracking-[1px] text-ink">{p.trackingCode}</div>
                <div className="text-[13px] text-muted">
                  Seal {p.security.sealNumber} · {p.weightKg} kg · {p.security.photoUrls.length} photo(s)
                </div>
              </div>
            </div>
          </Card>

          <section className="rounded-2xl bg-inverse p-5 text-white">
            <div className="flex flex-wrap items-center gap-5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">Delivery code, for the sender&apos;s receipt only</div>
                <p className="mt-1 text-[13px] text-white/80">
                  Shown only this once. Write it on the receipt (never on the parcel). The sender gives it to the receiver, who gives it to the courier at delivery.
                  {p.receiver.email && ` Also emailed to ${p.receiver.email}.`}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-5 py-3 font-mono text-[40px] font-extrabold tracking-[10px]">{result.deliveryCode}</div>
            </div>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[2_1_320px] flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[17px] font-bold text-ink">Payment</h2>
          {p.payments.map((x) => (
            <PaymentLine key={x.id} p={x} />
          ))}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold text-ink">Total</span>
            <span className="text-xl font-extrabold text-ink">{fcfa(p.price.total)}</span>
          </div>
          <Link to={`/parcels/${p.trackingCode}`} className="mt-1 text-center text-sm font-bold">
            Open the parcel
          </Link>
        </aside>
      </div>

      {/* What the printer sees: the label (QR) and the sender's receipt (with the delivery code) */}
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
                Seal {p.security.sealNumber} · {p.weightKg} kg
              </div>
              <div>{p.homeDelivery ? 'HOME DELIVERY' : 'PICKUP AT BRANCH'}</div>
            </div>
          </div>
        </div>
        <div style={{ border: '1px dashed #5B6576', borderRadius: 12, padding: 16, width: 360, marginTop: 24, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Sender&apos;s receipt</div>
          <div>Tracking: {p.trackingCode}</div>
          <div>
            From {p.sender.name} ({phone(p.sender.phone)}) to {p.receiver.name} ({phone(p.receiver.phone)})
          </div>
          <div>Paid: {fcfa(p.price.total)}</div>
          {p.codAmount ? <div>Cash on delivery: {fcfa(p.codAmount)}</div> : null}
          <div style={{ marginTop: 10, fontWeight: 800 }}>DELIVERY CODE: {result.deliveryCode}</div>
          <div style={{ fontSize: 12 }}>Give this code to the receiver only. Never to anyone by phone.</div>
        </div>
      </div>
    </>
  );
}
