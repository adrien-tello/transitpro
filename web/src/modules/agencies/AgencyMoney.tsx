import { useEffect, useState, type FormEvent } from 'react';
import type { AgencyBalance, AgencyPayouts, Me, PayoutChannel, PayoutView } from '@contracts/api-types';
import { Button } from '../../components/ui/Button';
import { Badge, Card, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/Feedback';
import { FormError, SelectField, TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { errorMessage, fieldError } from '../../lib/api';
import { dateTime, fcfa, phone } from '../../lib/format';
import { useMyDocuments, useMyPayouts, useSetPayoutAccount, useWithdraw } from './agencies.api';
import { DOCS, DocumentRow } from './PendingPage';

// Settings cards about the agency's money and papers (owner; the accountant sees the balance).

export const CHANNEL_LABEL: Record<PayoutChannel, string> = { 'cm.mtn': 'MTN Mobile Money', 'cm.orange': 'Orange Money' };

// Cameroon prefixes: MTN 67x, 650-654, 680-684 · Orange 69x, 655-659, 685-689 (same rule as the server)
function operatorOf(p: string): PayoutChannel | null {
  const d = p.replace(/\D/g, '').replace(/^237/, '');
  if (d.length !== 9 || d[0] !== '6') return null;
  const two = Number(d[1]);
  const three = Number(d.slice(1, 3));
  if (two === 7 || (three >= 50 && three <= 54) || (three >= 80 && three <= 84)) return 'cm.mtn';
  if (two === 9 || (three >= 55 && three <= 59) || (three >= 85 && three <= 89)) return 'cm.orange';
  return null;
}

export const PAYOUT_STATUS: Record<PayoutView['status'], { label: string; tone: 'grey' | 'blue' | 'green' | 'red' }> = {
  PENDING: { label: 'Queued', tone: 'grey' },
  PROCESSING: { label: 'On its way', tone: 'blue' },
  SUCCEEDED: { label: 'Sent', tone: 'green' },
  FAILED: { label: 'Failed', tone: 'red' },
};

export function BalanceBreakdown({ balance }: { balance: AgencyBalance }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
      {[
        ['Mobile Money sales, after commission', fcfa(balance.mobileMoneyNet), 'text-ink'],
        ['Commission on cash sales', `− ${fcfa(balance.cashCommission)}`, 'text-ink'],
        ['Already paid out', `− ${fcfa(balance.paidOut)}`, 'text-ink'],
      ].map(([k, v, c]) => (
        <div key={k} className="min-w-0 rounded-xl bg-soft px-3 py-2.5">
          <dt className="text-xs text-muted">{k}</dt>
          <dd className={`mt-0.5 text-sm font-bold ${c}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AgencyMoneyCards({ me }: { me: Me }) {
  const owner = me.role === 'AGENCY_OWNER';
  return (
    <>
      <PayoutsCard owner={owner} />
      {owner && <PayoutAccountCard />}
      {owner && <DocumentsCard />}
    </>
  );
}

function PayoutsCard({ owner }: { owner: boolean }) {
  const q = useMyPayouts();
  return (
    <Card title="What TransitPro owes your agency" subtitle="Customers' Mobile Money goes to TransitPro first. We send you your part, minus our commission.">
      {q.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-16" />
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="tp-fade flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-muted">Available</div>
              <div className="text-[30px] font-extrabold tracking-[-0.5px] text-ink">{fcfa(q.data.balance.available)}</div>
            </div>
            {owner ? (
              <WithdrawButton data={q.data} />
            ) : (
              <Badge tone={q.data.balance.available >= q.data.balance.minimumPayout ? 'green' : 'grey'}>
                {q.data.balance.available >= q.data.balance.minimumPayout ? 'The owner can withdraw it' : `Withdrawals start at ${fcfa(q.data.balance.minimumPayout)}`}
              </Badge>
            )}
          </div>
          <BalanceBreakdown balance={q.data.balance} />
          {q.data.account && owner && (
            <p className="text-[13px] text-muted">
              Paid to {q.data.account.name} · {CHANNEL_LABEL[q.data.account.channel]} · {phone(q.data.account.phone)}
            </p>
          )}
          {!q.data.account && owner && <p className="rounded-xl bg-warning-tint px-3 py-2.5 text-[13px] font-semibold text-warning">Add your payout account below, or we cannot send you money.</p>}
          <div>
            <h3 className="mb-1 text-sm font-bold text-ink">Payouts</h3>
            {q.data.payouts.length === 0 ? (
              <p className="py-3 text-sm text-muted">No payout yet. The TransitPro team sends payouts regularly once you pass the minimum.</p>
            ) : (
              <ul className="divide-y divide-line">
                {q.data.payouts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{fcfa(p.amount)}</span>
                      <span className="block text-xs text-muted">
                        {CHANNEL_LABEL[p.channel]} · {phone(p.phone)} · {dateTime(p.createdAt)}
                      </span>
                    </span>
                    <Badge tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// Withdraw: from the minimum up, to the saved payout account. Explains why it is not possible when it is not.
function WithdrawButton({ data }: { data: AgencyPayouts }) {
  const w = useWithdraw();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const b = data.balance;
  const why = !data.account
    ? 'Add your payout account below first'
    : data.withdrawableAt
      ? `Opens ${dateTime(data.withdrawableAt)} (24 h after a number change, for your safety)`
      : b.available < b.minimumPayout
        ? `Withdrawals start at ${fcfa(b.minimumPayout)}`
        : null;
  const value = amount ? Number(amount) : b.available;

  if (!open)
    return (
      <div className="flex flex-col items-end gap-1">
        <Button icon="send" disabled={!!why} onClick={() => setOpen(true)}>
          Withdraw
        </Button>
        {why && <span className="max-w-[260px] text-right text-xs text-muted">{why}</span>}
      </div>
    );
  return (
    <div className="tp-fade flex w-full flex-wrap items-end gap-3 rounded-2xl bg-soft p-4">
      <TextField
        label={`Amount (empty = everything, ${fcfa(b.available)})`}
        inputMode="numeric"
        placeholder={String(b.available)}
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
        className="w-64"
      />
      <p className="min-w-0 flex-[1_1_220px] text-[13px] text-body">
        {fcfa(value)} goes to {data.account?.name}, {data.account && CHANNEL_LABEL[data.account.channel]} {data.account && phone(data.account.phone)}.
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          icon="send"
          loading={w.isPending}
          disabled={value < b.minimumPayout || value > b.available}
          onClick={() =>
            w.mutate(amount ? Number(amount) : undefined, {
              onSuccess: (p) => {
                toast(p.status === 'FAILED' ? 'The transfer failed, the money is back in your balance' : `${fcfa(p.amount)} on its way to your phone`, p.status === 'FAILED' ? 'error' : 'success');
                setOpen(false);
                setAmount('');
              },
            })
          }
        >
          Withdraw {fcfa(value)}
        </Button>
      </div>
      <FormError message={w.isError ? errorMessage(w.error) : null} />
    </div>
  );
}

function PayoutAccountCard() {
  const q = useMyPayouts();
  const save = useSetPayoutAccount();
  const toast = useToast();
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [channel, setChannel] = useState<PayoutChannel>('cm.mtn');

  // Fill the form with the saved account once it is loaded
  useEffect(() => {
    const a = q.data?.account;
    if (a) {
      setName(a.name);
      setNumber(a.phone.replace(/^\+?237/, ''));
      setChannel(a.channel);
    }
  }, [q.data?.account]);

  // Pick the operator from the number as it is typed
  const detected = operatorOf(number);
  useEffect(() => {
    if (detected) setChannel(detected);
  }, [detected]);

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ name, phone: number, channel }, { onSuccess: () => toast('Payout account saved') });
  }

  return (
    <Card title="Payout account" subtitle="The Mobile Money account where your money is sent. Only the owner can change it; after a new number, withdrawals wait 24 hours.">
      {q.isPending ? (
        <SkeletonRows rows={2} cols={2} />
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <TextField label="Name on the account" placeholder="Étoile Voyages SARL" value={name} onChange={(e) => setName(e.target.value)} error={fieldError(save.error, 'name')} required />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            <TextField
              label="Mobile Money number"
              inputMode="tel"
              placeholder="6XX XX XX XX"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              error={fieldError(save.error, 'phone')}
              hint={detected ? `${CHANNEL_LABEL[detected]} number` : undefined}
              required
            />
            <SelectField label="Operator" value={channel} onChange={(e) => setChannel(e.target.value as PayoutChannel)} error={fieldError(save.error, 'channel')}>
              <option value="cm.mtn">MTN Mobile Money</option>
              <option value="cm.orange">Orange Money</option>
            </SelectField>
          </div>
          <FormError message={save.isError && !fieldError(save.error, 'phone') && !fieldError(save.error, 'channel') && !fieldError(save.error, 'name') ? errorMessage(save.error) : null} />
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!name.trim() || !number.trim()}>
              {q.data?.account ? 'Save changes' : 'Save the account'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function DocumentsCard() {
  const docs = useMyDocuments();
  return (
    <Card title="Legal documents" subtitle="Replace a document when it changes (for example, a renewed transport licence).">
      {docs.isPending ? (
        <SkeletonRows rows={3} cols={2} />
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => docs.refetch()} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {DOCS.map((d) => (
            <DocumentRow key={d.type} doc={d} file={docs.data.find((f) => f.type === d.type)} canUpload />
          ))}
        </div>
      )}
    </Card>
  );
}
