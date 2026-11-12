import { Link, useNavigate } from 'react-router';
import type { AgencyStatus } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Badge, Card, EmptyState, ErrorState, SkeletonRows } from '../../components/ui/Feedback';
import { FilterTabs, Pager, SearchBox, useUrlFilters } from '../../components/ui/ListTools';
import { VerifiedSeal } from '../../components/ui/VerifiedBadge';
import { ago, initials } from '../../lib/format';
import { useAdminAgencies } from './agencies.api';

// TransitPro team: every agency on the platform. Click one to see its documents, money and to suspend it.
export const AGENCY_STATUS: Record<AgencyStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'grey' }> = {
  APPROVED: { label: 'Verified', tone: 'green' },
  PENDING: { label: 'To verify', tone: 'amber' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  SUSPENDED: { label: 'Suspended', tone: 'grey' },
};

const TABS: { label: string; value?: AgencyStatus }[] = [
  { label: 'All' },
  { label: 'Verified', value: 'APPROVED' },
  { label: 'To verify', value: 'PENDING' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Suspended', value: 'SUSPENDED' },
];

export function AdminAgencyListPage() {
  const navigate = useNavigate();
  const f = useUrlFilters();
  const status = f.get('status') as AgencyStatus | undefined;
  const badge = f.get('badge') as 'active' | 'none' | undefined;
  const q = f.get('q');
  const list = useAdminAgencies({ status, badge, q, page: f.page });

  return (
    <>
      <PageHeader title="All agencies" subtitle="Every agency that signed up on TransitPro. Open one to see its documents and money, or to suspend it." />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <FilterTabs label="Status" tabs={TABS} value={status} onChange={(v) => f.set({ status: v })} />
          <FilterTabs
            label="Badge"
            tabs={[{ label: 'Any badge' }, { label: 'With badge', value: 'active' as const }, { label: 'No badge', value: 'none' as const }]}
            value={badge}
            onChange={(v) => f.set({ badge: v })}
          />
          <SearchBox value={q} onSearch={(v) => f.set({ q: v })} placeholder="Name, city or email" />
        </div>
        {list.isPending ? (
          <SkeletonRows rows={6} cols={5} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState icon="building" title={q ? `No agency matches "${q}"` : 'No agency here'} text="Agencies appear when they register on the sign-up page." />
        ) : (
          <div className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-[0.5px] text-muted">
                  <th className="px-4 py-3">Agency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Branches</th>
                  <th className="px-4 py-3 text-right">Staff</th>
                  <th className="px-4 py-3 text-right">Parcels</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-4 py-3 text-right">Signed up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {list.data.items.map((a) => (
                  <tr key={a.id} onClick={() => navigate(`/admin/agencies/${a.id}`)} className="cursor-pointer transition-colors hover:bg-soft">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-warning-tint text-[12px] font-extrabold text-warning">{initials(a.name)}</span>
                        <span className="min-w-0">
                          <Link to={`/admin/agencies/${a.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 font-bold text-ink hover:text-ink">
                            {a.name}
                            {a.badgeUntil && new Date(a.badgeUntil) > new Date() && <VerifiedSeal size={16} title="Paid Verified badge" />}
                          </Link>
                          <span className="block text-xs text-muted">{a.headOffice}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={AGENCY_STATUS[a.status].tone}>{AGENCY_STATUS[a.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-body">{a.branches}</td>
                    <td className="px-4 py-3 text-right font-semibold text-body">{a.staff}</td>
                    <td className="px-4 py-3 text-right font-semibold text-body">{a.parcels}</td>
                    <td className="px-4 py-3">
                      <Badge tone={a.documents === 5 ? 'green' : a.documents === 0 ? 'grey' : 'amber'}>{a.documents} of 5</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted">{ago(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pager page={f.page} total={list.data.total} limit={list.data.limit} noun="agencies" onPage={(p) => f.set({ page: String(p) })} />}
      </Card>
    </>
  );
}
