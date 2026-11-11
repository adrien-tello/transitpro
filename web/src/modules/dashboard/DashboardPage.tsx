import { Link, useNavigate } from 'react-router';
import type { Me, ParcelStatus } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Card, EmptyState, ErrorState, Skeleton, SkeletonRows } from '../../components/ui/Feedback';
import { Icon, type IconName } from '../../components/ui/Icon';
import { ago } from '../../lib/format';
import { StatusBadge } from '../parcels/parcel-ui';
import { useParcelCount, useParcels } from '../parcels/parcels.api';

const OFFICE = ['COUNTER_AGENT', 'BRANCH_MANAGER', 'AGENCY_OWNER'];

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Douala', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage({ me }: { me: Me }) {
  const first = me.fullName.split(' ')[0];
  const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Douala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const office = OFFICE.includes(me.role);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${first}`}
        subtitle={`${today} · here is what is happening at ${me.agency?.name}`}
        actions={
          office && (
            <Link to="/parcels/new" className="flex h-11 items-center gap-2 rounded-full bg-primary px-[18px] text-sm font-bold text-white hover:bg-primary-dark hover:text-white">
              <Icon name="plus" size={18} /> Register parcel
            </Link>
          )
        }
      />
      {office ? (
        <>
          <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
            <Kpi status="IN_TRANSIT" label="Parcels in transit" icon="bus" tint="bg-primary-tint text-primary-dark" hint="On a bus right now" />
            <Kpi status="ARRIVED" label="Waiting at the branch" icon="box" tint="bg-violet-tint text-violet" hint="Ready for pickup or courier" />
            <Kpi status="OUT_FOR_DELIVERY" label="Out for delivery" icon="pin" tint="bg-warning-tint text-warning" hint="With a courier" />
            <Kpi status="ON_HOLD" label="On hold" icon="alert" tint="bg-danger-tint text-danger" hint="Needs the branch manager" alert />
          </section>
          <RecentParcels />
        </>
      ) : (
        <Card>
          <EmptyState
            icon="dash"
            title="Your module is being built"
            text="Your screens (fleet, staff or finance) arrive in the next versions of the dashboard. Your account is ready."
          />
        </Card>
      )}
    </>
  );
}

function Kpi({ status, label, icon, tint, hint, alert = false }: { status: ParcelStatus; label: string; icon: IconName; tint: string; hint: string; alert?: boolean }) {
  const count = useParcelCount(status);
  const n = count.data ?? 0;
  return (
    <Link to={`/parcels?status=${status}`} className="flex flex-col gap-3.5 rounded-[22px] bg-white px-5 py-[18px] text-ink transition-shadow hover:text-ink hover:shadow-[0_6px_24px_rgba(14,23,38,0.08)]">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-[34px] w-[34px] items-center justify-center rounded-full ${tint}`}>
          <Icon name={icon} size={18} strokeWidth={1.9} />
        </span>
        <span className="text-[15px] font-bold">{label}</span>
      </div>
      <div>
        {count.isPending ? <Skeleton className="h-10 w-16" /> : <span className="text-[34px] font-extrabold tracking-[-1px]">{count.isError ? '—' : n}</span>}
        <span className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${alert && n > 0 ? 'bg-danger-tint text-danger' : 'bg-chip text-body'}`}>{hint}</span>
      </div>
    </Link>
  );
}

function RecentParcels() {
  const navigate = useNavigate();
  const list = useParcels({ page: 1, limit: 6 });
  return (
    <Card title="Latest parcels" subtitle="The most recently updated parcels of your branch" padded={false} actions={<Link to="/parcels" className="text-sm font-bold">See all</Link>}>
      {list.isPending ? (
        <SkeletonRows rows={5} cols={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          title="No parcel yet"
          text="Register the first parcel of your branch: it appears here with its status."
          action={
            <Link to="/parcels/new" className="text-sm font-bold">
              Register a parcel
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.data.items.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => navigate(`/parcels/${p.trackingCode}`)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-soft">
                <span className="w-36 font-mono text-sm font-bold text-ink">{p.trackingCode}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-body">
                  {p.from.city} → {p.to.city} · {p.receiverName}
                </span>
                <StatusBadge status={p.status} />
                <span className="w-24 text-right text-xs text-muted">{ago(p.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
