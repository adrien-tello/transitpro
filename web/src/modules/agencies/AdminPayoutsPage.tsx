import { useState } from 'react';
import { Link } from 'react-router';
import type { AdminPayoutAgencyRow, PayoutView } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/Feedback';
import { FormError, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { FilterTabs, Pager, useUrlFilters } from '../../components/ui/ListTools';
import { useToast } from '../../components/ui/Toast';
import { errorMessage } from '../../lib/api';
import { ago, compact, dateTime, fcfa, phone } from '../../lib/format';
import { CHANNEL_LABEL, PAYOUT_STATUS } from './AgencyMoney';
import { usePayAgency, usePayoutAgencies, usePayoutHistory } from './agencies.api';

// TransitPro team: send each agency what we owe it (Notch Pay transfer to its Mobile Money account),
// and follow every transfer, including cash-on-delivery money sent to parcel senders.

export function AdminPayoutsPage() {
  const agencies = usePayoutAgencies();
  const owed = agencies.data?.reduce((n, a) => n + a.balance.available, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Payouts"
        subtitle="Customers' Mobile Money comes to TransitPro. Send each agency its part (after our commission) to its Mobile Money account."
      />
      <section className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {[
          ['We owe agencies', agencies.data ? `${compact(owed)} FCFA` : null, 'wallet'],
          ['Ready to pay', agencies.data ? String(agencies.data.filter((a) => a.account && a.balance.available >= a.balance.minimumPayout).length) : null, 'send'],
          ['Minimum payout', agencies.data?.[0] ? fcfa(agencies.data[0].balance.minimumPayout) : agencies.data ? '—' : null, 'chart'],
        ].map(([k, v, icon]) => (
          <div key={k} className="flex items-center gap-3 rounded-[22px] bg-surface px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-tint text-primary-dark">
              <Icon name={icon as 'wallet'} size={18} />
            </span>
            <div>
              <div className="text-xs font-semibold text-muted">{k}</div>
              {v === null ? <Skeleton className="mt-1 h-6 w-24" /> : <div className="text-xl font-extrabold text-ink">{v}</div>}
            </div>
          </div>
        ))}
      </section>

      <Card title="Agencies" subtitle="Biggest balance first." padded={false}>
        {agencies.isPending ? (
          <SkeletonRows rows={4} cols={5} />
        ) : agencies.isError ? (
          <ErrorState error={agencies.error} onRetry={() => agencies.refetch()} />
        ) : agencies.data.length === 0 ? (
          <EmptyState icon="building" title="No verified agency yet" />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {agencies.data.map((a) => (
              <AgencyPayoutRow key={a.agencyId} a={a} />
            ))}
          </ul>
        )}
      </Card>

      <History />
    </>
  );
}

function AgencyPayoutRow({ a }: { a: AdminPayoutAgencyRow }) {
  const pay = usePayAgency();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const b = a.balance;
  const ready = !!a.account && b.available >= b.minimumPayout;

  const send = () =>
    pay.mutate(
      { agencyId: a.agencyId, amount: amount ? Number(amount) : undefined },
      {
        onSuccess: (p) => {
          toast(p.status === 'FAILED' ? `The transfer to ${a.agencyName} failed` : `${fcfa(p.amount)} on its way to ${a.agencyName}`, p.status === 'FAILED' ? 'error' : 'success');
          setOpen(false);
          setAmount('');
        },
      },
    );

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-[1_1_240px]">
          <Link to={`/admin/agencies/${a.agencyId}`} className="font-bold text-ink hover:text-ink">
            {a.agencyName}
          </Link>
          {a.status === 'SUSPENDED' && <Badge tone="grey">Suspended</Badge>}
          <div className="text-xs text-muted">
            {a.account ? `${CHANNEL_LABEL[a.account.channel]} · ${phone(a.account.phone)} · ${a.account.name}` : 'No payout account yet'}
            {a.lastPayoutAt ? ` · last payout ${ago(a.lastPayoutAt)}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold text-ink">{fcfa(b.available)}</div>
          <div className="text-xs text-muted">
            MoMo {compact(b.mobileMoneyNet)} − cash fees {compact(b.cashCommission)} − paid {compact(b.paidOut)}
          </div>
        </div>
        {!open && (
          <Button icon="send" disabled={!ready} title={!a.account ? 'The owner must add a payout account in Settings' : !ready ? `Below the ${fcfa(b.minimumPayout)} minimum` : undefined} onClick={() => setOpen(true)}>
            Pay agency
          </Button>
        )}
      </div>
      {open && (
        <div className="tp-fade mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-soft p-4">
          <TextField
            label={`Amount (empty = everything, ${fcfa(b.available)})`}
            inputMode="numeric"
            placeholder={String(b.available)}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            className="w-64"
          />
          <p className="min-w-0 flex-[1_1_220px] text-[13px] text-body">
            Sends {fcfa(amount ? Number(amount) : b.available)} to {a.account?.name} on {a.account && CHANNEL_LABEL[a.account.channel]} {a.account && phone(a.account.phone)}. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button icon="send" loading={pay.isPending} onClick={send}>
              Send the money
            </Button>
          </div>
          <FormError message={pay.isError ? errorMessage(pay.error) : null} />
        </div>
      )}
    </li>
  );
}

const KIND_TABS: { label: string; value?: PayoutView['kind'] }[] = [
  { label: 'All transfers' },
  { label: 'To agencies', value: 'AGENCY_PAYOUT' },
  { label: 'Cash on delivery to senders', value: 'COD_TO_SENDER' },
];
const FAIL: Record<string, string> = {
  FAILED: 'Refused by the operator',
  CANCELED: 'Cancelled',
  PROVIDER_ERROR: 'Notch Pay unavailable',
  NOT_SENT: 'Never sent',
};

function History() {
  const f = useUrlFilters();
  const kind = f.get('kind') as PayoutView['kind'] | undefined;
  const list = usePayoutHistory({ kind, page: f.page });
  return (
    <Card title="Transfers" subtitle="Rows on their way update by themselves." padded={false}>
      <div className="border-b border-line px-4 pb-4">
        <FilterTabs label="Kind" tabs={KIND_TABS} value={kind} onChange={(v) => f.set({ kind: v })} />
      </div>
      {list.isPending ? (
        <SkeletonRows rows={4} cols={5} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="send" title="No transfer yet" text="Payouts and cash-on-delivery transfers appear here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.5px] text-muted">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {list.data.items.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-soft">
                  <td className="whitespace-nowrap px-4 py-3 text-body">{dateTime(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-ink">{p.recipientName}</span>
                    <span className="block text-xs text-muted">
                      {CHANNEL_LABEL[p.channel]} · {phone(p.phone)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-body">
                    {p.kind === 'AGENCY_PAYOUT' ? `Payout · ${p.agencyName}` : 'Cash on delivery'}
                    {p.parcelCode && <span className="ml-1.5 font-mono text-xs text-muted">{p.parcelCode}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{fcfa(p.amount)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</Badge>
                    {p.failureReason && <span className="mt-0.5 block text-xs text-danger">{FAIL[p.failureReason] ?? p.failureReason}</span>}
                    {p.settledAt && p.status === 'SUCCEEDED' && <span className="mt-0.5 block text-xs text-muted">{ago(p.settledAt)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pager page={f.page} total={list.data.total} limit={list.data.limit} noun="transfers" onPage={(p) => f.set({ page: String(p) })} />}
    </Card>
  );
}
