import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { ParcelStatus } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon';
import { ago } from '../../lib/format';
import { StatusBadge } from './parcel-ui';
import { useParcels } from './parcels.api';

const TABS: { label: string; status?: ParcelStatus }[] = [
  { label: 'All' },
  { label: 'Registered', status: 'REGISTERED' },
  { label: 'In transit', status: 'IN_TRANSIT' },
  { label: 'At the branch', status: 'ARRIVED' },
  { label: 'Out for delivery', status: 'OUT_FOR_DELIVERY' },
  { label: 'On hold', status: 'ON_HOLD' },
  { label: 'Delivered', status: 'DELIVERED' },
];

// Filters live in the URL (?status=&q=&page=): back button, refresh and shared links keep them
export function ParcelsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as ParcelStatus | null) ?? undefined;
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const list = useParcels({ status, q: q || undefined, page });
  const set = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p, { replace: true });
  };

  // Search while typing, 300 ms after the last key
  useEffect(() => {
    if (text === q) return;
    const t = setTimeout(() => set({ q: text.trim() || undefined }), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.limit)) : 1;

  return (
    <>
      <PageHeader
        title="Parcels"
        subtitle="Parcels leaving from or arriving at your branch. Click one to see its full history."
        actions={
          <Link to="/parcels/new" className="flex h-11 items-center gap-2 rounded-full bg-primary px-[18px] text-sm font-bold text-white hover:bg-primary-dark hover:text-white">
            <Icon name="plus" size={18} /> Register parcel
          </Link>
        }
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div role="tablist" aria-label="Status" className="flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const active = t.status === status;
              return (
                <button
                  key={t.label}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => set({ status: t.status })}
                  className={`h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors ${active ? 'bg-ink text-white' : 'bg-soft text-body hover:bg-chip'}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <label className="ml-auto flex h-10 min-w-[220px] flex-[0_1_300px] items-center gap-2 rounded-full border border-field px-3.5">
            <Icon name="search" size={16} className="text-muted" />
            <span className="sr-only">Search</span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tracking code or phone" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>

        {list.isPending ? (
          <SkeletonRows rows={8} cols={5} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={q ? 'search' : 'box'}
            title={q ? `No parcel matches "${q}"` : status ? 'No parcel with this status' : 'No parcel yet'}
            text={q ? 'Check the tracking code (TP-DOU-XXXXX) or the phone number.' : 'Registered parcels of your branch appear here.'}
          />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.5px] text-muted">
                  <th className="px-4 py-3">Tracking code</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Sender → receiver</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Responsible now</th>
                  <th className="px-4 py-3 text-right">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {list.data.items.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/parcels/${p.trackingCode}`)} className="cursor-pointer hover:bg-soft">
                    <td className="px-4 py-3.5">
                      <Link to={`/parcels/${p.trackingCode}`} onClick={(e) => e.stopPropagation()} className="font-mono font-bold text-ink">
                        {p.trackingCode}
                      </Link>
                      {p.codAmount ? <span className="ml-2 rounded bg-warning-tint px-1.5 py-0.5 text-[10px] font-extrabold text-warning">COD</span> : null}
                    </td>
                    <td className="px-4 py-3.5 text-body">
                      {p.from.city} → {p.to.city}
                    </td>
                    <td className="px-4 py-3.5 text-body">
                      {p.senderName} → {p.receiverName}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3.5 text-body">{p.currentHolder ? `${p.currentHolder.name} · ${p.currentHolder.jobTitle}` : '—'}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted">{ago(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list.data && list.data.total > list.data.limit && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
            <span className="text-muted">
              Page {page} of {pages} · {list.data.total} parcels
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>
                Previous
              </Button>
              <Button variant="secondary" disabled={page >= pages} onClick={() => set({ page: String(page + 1) })}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
