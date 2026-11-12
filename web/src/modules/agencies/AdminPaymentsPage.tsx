import type { AdminPaymentRow } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Field';
import { FilterTabs, Pager, SearchBox, useUrlFilters } from '../../components/ui/ListTools';
import { dateTime, fcfa, phone } from '../../lib/format';
import { useAdminPayments } from './agencies.api';

// TransitPro team: every payment on the platform (tickets, parcel fees, cash on delivery), newest first.
// Pending Mobile Money rows refresh by themselves until the payer answers on their phone.

type Status = AdminPaymentRow['status'];
const STATUS: Record<Status, { label: string; tone: 'grey' | 'green' | 'red' | 'violet' }> = {
  PENDING: { label: 'Waiting', tone: 'grey' },
  SUCCEEDED: { label: 'Paid', tone: 'green' },
  FAILED: { label: 'Failed', tone: 'red' },
  REFUNDED: { label: 'Refunded', tone: 'violet' },
};
const PURPOSE: Record<AdminPaymentRow['purpose'], string> = {
  TICKET: 'Ticket',
  PARCEL_FEE: 'Parcel fee',
  COD_COLLECTION: 'Cash on delivery',
  SUBSCRIPTION: 'Subscription',
};
const METHOD: Record<AdminPaymentRow['method'], string> = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money' };
const FAIL: Record<string, string> = {
  FAILED: 'Refused or not enough money',
  EXPIRED: 'No answer in time',
  CANCELED: 'Cancelled by the payer',
  PROVIDER_ERROR: 'Mobile Money unavailable',
};

const TABS: { label: string; value?: Status }[] = [
  { label: 'All' },
  { label: 'Paid', value: 'SUCCEEDED' },
  { label: 'Waiting', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

export function AdminPaymentsPage() {
  const f = useUrlFilters();
  const status = f.get('status') as Status | undefined;
  const method = f.get('method') as AdminPaymentRow['method'] | undefined;
  const purpose = f.get('purpose') as AdminPaymentRow['purpose'] | undefined;
  const q = f.get('q');
  const list = useAdminPayments({ status, method, purpose, q, page: f.page });

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment on TransitPro, cash and Mobile Money. Our commission is the 10 % kept on tickets and parcel fees." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <FilterTabs label="Status" tabs={TABS} value={status} onChange={(v) => f.set({ status: v })} />
          <SearchBox value={q} onSearch={(v) => f.set({ q: v })} placeholder="Agency, phone, parcel or reference" />
        </div>
        <div className="flex flex-wrap gap-3 border-b border-line px-4 py-3">
          <SelectField label="Method" value={method ?? ''} onChange={(e) => f.set({ method: e.target.value || undefined })} className="w-48">
            <option value="">All methods</option>
            <option value="MTN_MOMO">MTN MoMo</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="CASH">Cash</option>
          </SelectField>
          <SelectField label="For" value={purpose ?? ''} onChange={(e) => f.set({ purpose: e.target.value || undefined })} className="w-52">
            <option value="">Everything</option>
            <option value="TICKET">Tickets</option>
            <option value="PARCEL_FEE">Parcel fees</option>
            <option value="COD_COLLECTION">Cash on delivery</option>
          </SelectField>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={8} cols={6} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState icon="wallet" title="No payment here" text="Payments appear as soon as a ticket or a parcel is paid." />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.5px] text-muted">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Agency</th>
                  <th className="px-4 py-3">For</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Our part</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {list.data.items.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-soft">
                    <td className="whitespace-nowrap px-4 py-3 text-body">{dateTime(p.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{p.agencyName ?? '—'}</td>
                    <td className="px-4 py-3 text-body">
                      {PURPOSE[p.purpose]}
                      {p.parcelCode && <span className="ml-1.5 font-mono text-xs text-muted">{p.parcelCode}</span>}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {METHOD[p.method]}
                      {p.payerPhone && <span className="block text-xs text-muted">{phone(p.payerPhone)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink">{fcfa(p.amount)}</td>
                    <td className="px-4 py-3 text-right text-body">{p.platformFee ? fcfa(p.platformFee) : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                      {p.failureReason && <span className="mt-0.5 block text-xs text-danger">{FAIL[p.failureReason] ?? p.failureReason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pager page={f.page} total={list.data.total} limit={list.data.limit} noun="payments" onPage={(p) => f.set({ page: String(p) })} />}
      </Card>
    </>
  );
}
