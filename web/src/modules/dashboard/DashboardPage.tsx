import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Me, ParcelStats, ParcelStatus } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { MiniBars, WeekChart } from '../../components/ui/Charts';
import { EmptyState, ErrorState, Panel, Skeleton, SkeletonRows } from '../../components/ui/Feedback';
import { Icon, type IconName } from '../../components/ui/Icon';
import { ago, compact, dateTime, fcfa, weekday } from '../../lib/format';
import { StatusBadge, statusLabel } from '../parcels/parcel-ui';
import { useParcelStats, useParcels } from '../parcels/parcels.api';
import { useMyPayouts } from '../agencies/agencies.api';

// Agency dashboard, laid out like the design canvas ("Web · Agency dashboard"):
// greeting + actions, 4 key figures, live map + alerts, latest parcels + statuses, week revenue + trips.
// Every number is real (GET /parcels/stats). Tiles of modules not built yet say so instead of showing fake data.

const OFFICE = ['COUNTER_AGENT', 'BRANCH_MANAGER', 'AGENCY_OWNER'];
type Period = 'today' | 'week';

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Douala', hour: 'numeric', hour12: false }));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage({ me }: { me: Me }) {
  const [period, setPeriod] = useState<Period>('today');
  const first = me.fullName.split(' ')[0];
  const today = new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Douala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const office = OFFICE.includes(me.role);
  const stats = useParcelStats(office);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${first}`}
        subtitle={`${today} · here is what is happening at ${me.agency?.name}`}
        actions={
          office && (
            <>
              <div role="group" aria-label="Period" className="flex rounded-full bg-surface p-1">
                {(['today', 'week'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                    className={`h-9 rounded-full px-3.5 text-[13px] transition-colors duration-200 ${period === p ? 'bg-inverse font-bold text-white' : 'font-semibold text-body hover:text-ink'}`}
                  >
                    {p === 'today' ? 'Today' : '7 days'}
                  </button>
                ))}
              </div>
              <Link to="/trips" className="flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-ink transition-shadow hover:text-ink hover:shadow-[0_4px_14px_rgba(14,23,38,0.08)]">
                <Icon name="plus" size={18} /> New trip
              </Link>
              <Link to="/parcels/new" className="flex h-11 items-center gap-2 rounded-full bg-primary px-[18px] text-sm font-bold text-white transition-colors hover:bg-primary-hover hover:text-white">
                <Icon name="plus" size={18} /> Register parcel
              </Link>
            </>
          )
        }
      />
      {!office ? (
        // Fleet manager, HR, accountant: no parcel data for them, so the design's trip and bus tiles in their first-day state
        <>
          <Row>
            <LiveMap />
            <TripOnRoad />
          </Row>
          <Row>
            <Departures />
            <BusAttention />
          </Row>
        </>
      ) : stats.isError ? (
        <Panel>
          <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
        </Panel>
      ) : (
        <>
          <Kpis stats={stats.data} period={period} />
          {me.role === 'AGENCY_OWNER' && <MoneyStrip />}
          {me.role === 'AGENCY_OWNER' && !(me.agency?.badgeUntil && new Date(me.agency.badgeUntil) > new Date()) && <BadgeSuggestion />}
          {/* Same order as the design. Booking / Fleet tiles show their empty, first-day state until those modules are connected. */}
          <Row>
            <LiveMap />
            <TripOnRoad />
          </Row>
          <Row>
            <Departures />
            <Alerts stats={stats.data} />
          </Row>
          <Row>
            <Revenue stats={stats.data} />
            <BusAttention />
          </Row>
          <Row>
            <LatestParcels />
            <ByStatus stats={stats.data} />
          </Row>
        </>
      )}
    </>
  );
}

// Two tiles side by side (2 : 1), stacked when the screen is narrow
export function Row({ children }: { children: [ReactNode, ReactNode] }) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex min-w-0 flex-[2_1_520px] flex-col">{children[0]}</div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col">{children[1]}</div>
    </div>
  );
}

// ─── key figures ───

function Kpis({ stats, period }: { stats?: ParcelStats; period: Period }) {
  if (!stats)
    return (
      <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-[22px]" />
        ))}
      </section>
    );
  const days = stats.days;
  const t = days[days.length - 1]!;
  const y = days[days.length - 2];
  const sum = (k: 'registered' | 'revenue') => days.reduce((n, d) => n + d[k], 0);
  const s = stats.byStatus;
  const week = period === 'week';

  const diff = (now: number, before: number | undefined, unit = '') => {
    if (before == null) return { text: 'First day', tone: 'grey' as const };
    const d = now - before;
    if (d === 0) return { text: 'Same as yesterday', tone: 'grey' as const };
    return { text: `${d > 0 ? '+' : '−'}${unit ? compact(Math.abs(d)) : Math.abs(d)}${unit} vs yesterday`, tone: d > 0 ? ('green' as const) : ('amber' as const) };
  };

  return (
    <section aria-label="Key figures" className="tp-fade grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
      {/* Booking (Joy): replace the "—" with the tickets sold today / in 7 days */}
      <Kpi to="/trips" icon="ticket" tint="bg-primary-tint text-primary-dark" label="Tickets sold" value="—" pill={{ text: 'No ticket sold yet', tone: 'grey' }} />
      <Kpi
        to="/parcels?status=IN_TRANSIT"
        icon="box"
        tint="bg-warning-tint text-warning"
        label="Parcels in transit"
        value={String(s.LOADED + s.IN_TRANSIT)}
        pill={{ text: week ? `${sum('registered')} registered in 7 days` : `${t.registered} registered today`, tone: 'amber' }}
        bars={days.map((d) => d.registered)}
        barsLabel="Parcels registered per day, last 7 days"
      />
      {/* Fleet (Sweet): buses on the road / all buses */}
      <Kpi to="/fleet" icon="bus" tint="bg-success-tint text-success" label="Buses on the road" value="—" unit="/ —" pill={{ text: 'Add your buses in Fleet', tone: 'grey' }} />
      <Kpi
        to="/parcels"
        icon="wallet"
        tint="bg-violet-tint text-violet"
        label={week ? 'Revenue, 7 days' : 'Revenue today'}
        value={compact(week ? sum('revenue') : t.revenue)}
        unit="FCFA"
        pill={s.ON_HOLD > 0 ? { text: `${s.ON_HOLD} parcel on hold`, tone: 'red' } : week ? { text: `${compact(t.revenue)} today`, tone: 'grey' } : diff(t.revenue, y?.revenue, ' FCFA')}
        bars={days.map((d) => d.revenue)}
        barsLabel="Revenue per day (parcel fees), last 7 days"
      />
    </section>
  );
}

const PILL = { green: 'bg-lime-tint text-lime', amber: 'bg-warning-tint text-warning', red: 'bg-danger-tint text-danger', grey: 'bg-chip text-body' };

export function Kpi({ to, icon, tint, label, value, unit, pill, bars, barsLabel }: {
  to: string;
  icon: IconName;
  tint: string;
  label: string;
  value: string;
  unit?: string;
  pill: { text: string; tone: keyof typeof PILL };
  bars?: number[];
  barsLabel?: string;
}) {
  return (
    <Link to={to} className="tp-lift flex flex-col gap-3.5 rounded-[22px] bg-surface px-5 py-[18px] text-ink hover:text-ink">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-[34px] w-[34px] items-center justify-center rounded-full ${tint}`}>
          <Icon name={icon} size={18} strokeWidth={1.9} />
        </span>
        <span className="text-[15px] font-bold">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[34px] font-extrabold tracking-[-1px]">{value}</span>
            {unit && <span className="text-sm font-semibold text-muted">{unit}</span>}
          </div>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL[pill.tone]}`}>{pill.text}</span>
        </div>
        {bars && <MiniBars values={bars} label={barsLabel ?? label} />}
      </div>
    </Link>
  );
}

// ─── live map (staff app GPS not connected yet) ───

function LiveMap() {
  return (
    <Panel label="Live map" title="Live map" className="h-full" actions={<span className="rounded-full bg-chip px-2.5 py-1 text-xs font-bold text-body">Coming with the staff app</span>}>
      <div className="relative h-[330px] overflow-hidden rounded-2xl bg-map">
        <svg width="100%" height="100%" viewBox="0 0 600 330" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map of the routes between Douala, Yaoundé, Bafoussam, Bamenda and Kribi">
          <path d="M0 260 C80 240 120 280 200 250 S340 210 420 240 600 220 600 220" style={{ stroke: 'var(--color-map-road)' }} strokeWidth="18" fill="none" />
          <path d="M60 0 C90 80 40 140 90 200 S120 300 100 330" style={{ stroke: 'var(--color-map-road)' }} strokeWidth="10" fill="none" />
          <path d="M300 0 C320 60 280 110 330 160" style={{ stroke: 'var(--color-map-road)' }} strokeWidth="8" fill="none" />
          {['M150 230 C230 210 300 190 450 170', 'M150 230 C190 180 220 120 260 80', 'M260 80 C230 60 200 50 170 40', 'M150 230 C170 260 180 285 200 300'].map((d) => (
            <path key={d} d={d} style={{ stroke: 'var(--color-map-route)' }} strokeWidth="4" fill="none" strokeDasharray="2 8" strokeLinecap="round" />
          ))}
          {[
            [150, 230, 9, 'var(--color-ink)'],
            [450, 170, 7, 'var(--color-primary)'],
            [260, 80, 7, 'var(--color-ink)'],
            [170, 40, 6, 'var(--color-muted)'],
            [200, 300, 6, 'var(--color-muted)'],
          ].map(([cx, cy, r, c]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} style={{ fill: 'var(--color-surface)', stroke: c as string }} strokeWidth="4" />
          ))}
          {[
            [118, 258, 'Douala'],
            [436, 200, 'Yaoundé'],
            [272, 76, 'Bafoussam'],
            [128, 30, 'Bamenda'],
            [212, 318, 'Kribi'],
          ].map(([x, y, t]) => (
            <text key={t} x={x} y={y} fontSize="13" fontWeight="700" style={{ fill: 'var(--color-ink)' }} fontFamily="Plus Jakarta Sans, sans-serif">
              {t}
            </text>
          ))}
        </svg>
        <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center gap-2.5 rounded-[14px] bg-surface px-3 py-2.5 shadow-[0_6px_18px_rgba(14,23,38,0.12)] sm:right-auto">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
          <span className="text-[13px] text-body">Buses and couriers appear here live once drivers use the staff app.</span>
        </div>
      </div>
    </Panel>
  );
}

// ─── alerts ───

const ALERT: Record<string, { label: string; icon: IconName; cls: string }> = {
  ON_HOLD: { label: 'On hold', icon: 'scale', cls: 'bg-danger-tint text-danger' },
  CLAIM: { label: 'Claim open', icon: 'alert', cls: 'bg-chip text-body' },
  LATE_DELIVERY: { label: 'Late delivery', icon: 'clock', cls: 'bg-warning-tint text-warning' },
};

function Alerts({ stats }: { stats?: ParcelStats }) {
  return (
    <Panel
      label="Parcel alerts"
      title="Parcel alerts"
      className="h-full"
      actions={stats && stats.alerts.length > 0 && <span className="rounded-full bg-danger-tint px-2.5 py-[3px] text-xs font-bold text-danger">{stats.alerts.length} open</span>}
    >
      {!stats ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-2xl" />
          ))}
        </div>
      ) : stats.alerts.length === 0 ? (
        <div className="tp-fade flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-tint text-success">
            <Icon name="check" size={20} />
          </span>
          <p className="text-sm font-bold text-ink">All good</p>
          <p className="max-w-[240px] text-[13px] text-muted">Weight mismatches, wrong codes, claims and late deliveries show up here.</p>
        </div>
      ) : (
        <div className="tp-fade flex flex-col gap-2.5">
          {stats.alerts.map((a) => {
            const k = ALERT[a.kind]!;
            return (
              <Link key={a.trackingCode + a.kind} to={`/parcels/${a.trackingCode}`} className="flex gap-3 rounded-2xl bg-soft p-3 text-ink transition-colors hover:bg-soft hover:text-ink">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${k.cls}`}>
                  <Icon name={k.icon} size={18} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={`text-xs font-bold ${k.cls.split(' ')[1]}`}>
                    {k.label} · {a.trackingCode}
                  </span>
                  <span className="text-[13px] text-body">{a.text}</span>
                  <span className="text-xs text-muted">{ago(a.at)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ─── latest parcels (styled like "Today's departures") ───

function LatestParcels() {
  const navigate = useNavigate();
  const list = useParcels({ page: 1, limit: 6 });
  return (
    <Panel label="Latest parcels" title="Latest parcels" className="h-full" actions={<Link to="/parcels" className="text-[13px] font-bold">All parcels</Link>}>
      {list.isPending ? (
        <SkeletonRows rows={5} cols={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState title="No parcel yet" text="Register the first parcel of your branch: it appears here with its status." action={<Link to="/parcels/new" className="text-sm font-bold">Register a parcel</Link>} />
      ) : (
        <div className="tp-fade overflow-x-auto">
          <div className="flex min-w-[600px] flex-col">
            {list.data.items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/parcels/${p.trackingCode}`)}
                className="-mx-2 grid grid-cols-[110px_130px_110px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border-t border-line px-2 py-3 text-left transition-colors first:border-t-0 hover:bg-soft"
              >
                <span className="truncate text-sm font-bold text-ink">{p.from.city}</span>
                <span className="flex items-center gap-1.5">
                  <span className="flex-1 border-t-[1.5px] border-dashed border-field" />
                  <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-bold text-primary-dark">{p.weightKg} kg</span>
                  <span className="flex-1 border-t-[1.5px] border-dashed border-field" />
                </span>
                <span className="truncate text-sm font-bold text-ink">{p.to.city}</span>
                <span className="truncate text-[13px] text-muted">
                  <span className="font-mono font-semibold text-body">{p.trackingCode}</span> · {ago(p.updatedAt)}
                </span>
                <span className="justify-self-end">
                  <StatusBadge status={p.status} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── parcels by status ───

const ORDER: ParcelStatus[] = ['REGISTERED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD', 'REFUSED'];
const BAR: Partial<Record<ParcelStatus, string>> = { ON_HOLD: 'bg-danger', REFUSED: 'bg-danger', DELIVERED: 'bg-success', OUT_FOR_DELIVERY: 'bg-accent', ARRIVED: 'bg-violet' };

function ByStatus({ stats }: { stats?: ParcelStats }) {
  const max = stats ? Math.max(1, ...ORDER.map((s) => stats.byStatus[s])) : 1;
  return (
    <Panel label="Parcels by status" title="Parcels by status" className="h-full">
      {!stats ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      ) : (
        <ul className="tp-fade flex flex-col gap-1">
          {ORDER.map((s) => (
            <li key={s}>
              <Link to={`/parcels?status=${s}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 text-ink transition-colors hover:bg-soft hover:text-ink">
                <span className="w-[118px] shrink-0 text-[13px] font-semibold text-body">{statusLabel(s)}</span>
                <span className="h-1.5 flex-1 rounded-full bg-chip">
                  <span className={`block h-1.5 rounded-full transition-[width] duration-500 ${BAR[s] ?? 'bg-primary'}`} style={{ width: `${(stats.byStatus[s] / max) * 100}%` }} />
                </span>
                <span className="w-8 text-right text-sm font-extrabold">{stats.byStatus[s]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ─── revenue this week ───

function Revenue({ stats }: { stats?: ParcelStats }) {
  const total = stats?.days.reduce((n, d) => n + d.revenue, 0) ?? 0;
  return (
    <Panel label="Revenue this week" className="h-full">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[17px] font-bold text-ink">Revenue, last 7 days</h2>
          {stats ? (
            <div className="mt-1.5 text-[26px] font-extrabold tracking-[-0.5px] text-ink">
              {compact(total)} <span className="text-sm font-semibold text-muted">FCFA</span>
            </div>
          ) : (
            <Skeleton className="mt-2 h-8 w-32" />
          )}
        </div>
        <div className="flex gap-3.5 text-xs font-semibold text-body">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" />
            Parcels
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-series" />
            Tickets (with Booking)
          </span>
        </div>
      </div>
      {stats ? (
        <WeekChart
          label="Parcel fees paid per day, last 7 days"
          format={fcfa}
          bars={stats.days.map((d, i) => ({ day: weekday(d.date), highlight: i === stats.days.length - 1, parts: [{ value: d.revenue, className: 'bg-accent', label: 'Parcels' }] }))}
        />
      ) : (
        <Skeleton className="h-[170px]" />
      )}
    </Panel>
  );
}

// ─── Booking + Fleet tiles: the design's blocks in their empty, first-day state ───
// When Booking (Joy) and Fleet (Sweet) are connected, fill these from their APIs and keep the same layout.

const Dash = () => <span className="text-muted">—</span>;

function TripOnRoad() {
  const stops = ['Departure', 'Stop', 'Arrival'];
  return (
    <Panel
      label="Trip on the road"
      title="Trip on the road"
      className="h-full"
      actions={
        <Link to="/trips" aria-label="Open trips" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-primary-dark transition-colors hover:brightness-95">
          <Icon name="arrowUpRight" size={14} strokeWidth={2.4} />
        </Link>
      }
    >
      <ol className="flex flex-col">
        {stops.map((k, i) => (
          <li key={k} className="flex gap-3">
            <div className="flex w-3.5 flex-col items-center">
              <span className="mt-[3px] h-3 w-3 shrink-0 rounded-full border-[3px] border-field bg-surface" />
              {i < stops.length - 1 && <span className="min-h-[26px] w-0.5 flex-1 bg-line" />}
            </div>
            <div className="pb-2.5">
              <div className="text-xs text-muted">{k}</div>
              <div className="text-sm font-bold">
                <Dash />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2.5">
        {['Passengers', 'Parcels on board', 'Driver', 'Bus'].map((k) => (
          <div key={k} className="rounded-[14px] bg-soft px-3 py-2.5">
            <div className="text-xs text-muted">{k}</div>
            <div className="text-base font-extrabold">
              <Dash />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex h-11 items-center justify-center gap-2 rounded-[14px] bg-primary-tint text-[13px] font-bold text-primary-dark">
        <Icon name="clock" size={16} strokeWidth={2} /> No trip on the road right now
      </div>
    </Panel>
  );
}

function Departures() {
  return (
    <Panel label="Today's departures" title="Today's departures" className="h-full" actions={<Link to="/trips" className="text-[13px] font-bold">All trips</Link>}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-[110px_150px_110px_120px_110px_minmax(0,1fr)] gap-2.5 border-b border-line pb-2 text-xs font-semibold text-muted">
          <span>From</span>
          <span className="text-center">Duration</span>
          <span>To</span>
          <span>Time · bus</span>
          <span>Seats</span>
          <span className="text-right">Status</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-tint text-primary-dark">
          <Icon name="ticket" size={20} />
        </span>
        <p className="text-sm font-bold text-ink">No departure today yet</p>
        <p className="max-w-[340px] text-[13px] text-muted">Trips you schedule appear here with their seats sold and boarding status.</p>
        <Link to="/trips" className="mt-1 text-[13px] font-bold">
          Schedule a trip
        </Link>
      </div>
    </Panel>
  );
}

function BusAttention() {
  const specs = [
    ['Plate', 'file'],
    ['Fuel use', 'wallet'],
    ['Odometer', 'pin'],
    ['Service due', 'cal'],
  ] as const;
  return (
    <Panel
      label="Bus needing attention"
      title="Bus needing attention"
      className="h-full"
      actions={<span className="rounded-full bg-success-tint px-2.5 py-[3px] text-xs font-bold text-success">All clear</span>}
    >
      <div className="flex h-[120px] items-center justify-center rounded-2xl bg-map text-muted">
        <Icon name="bus" size={34} strokeWidth={1.4} />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {specs.map(([k, icon]) => (
          <div key={k} className="flex items-center gap-2.5">
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-chip text-body">
              <Icon name={icon} size={16} strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[11px] text-muted">{k}</span>
              <span className="block text-[13px] font-bold">
                <Dash />
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-auto rounded-[14px] bg-soft px-3 py-2.5 text-[13px] text-body">
        Add your buses in{' '}
        <Link to="/fleet" className="font-bold">
          Fleet
        </Link>
        : a bus due for service shows here, and its trips are blocked from sale.
      </p>
    </Panel>
  );
}

// Owner only: what TransitPro owes the agency, with the way to withdraw it (Settings)
function MoneyStrip() {
  const q = useMyPayouts();
  if (q.isPending) return <Skeleton className="h-[74px] rounded-[22px]" />;
  if (q.isError) return null;
  const b = q.data.balance;
  const ready = b.available >= b.minimumPayout && !!q.data.account && !q.data.withdrawableAt;
  return (
    <section aria-label="Your money" className="tp-fade flex flex-wrap items-center gap-4 rounded-[22px] bg-inverse px-5 py-4 text-white">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
        <Icon name="wallet" size={18} />
      </span>
      <div className="min-w-0 flex-[1_1_220px]">
        <div className="text-xs font-semibold text-white/70">TransitPro owes your agency</div>
        <div className="text-[22px] font-extrabold">{fcfa(b.available)}</div>
      </div>
      <div className="text-xs text-white/70">
        Mobile Money sales after our 10 % ·{' '}
        {ready
          ? 'ready to withdraw'
          : !q.data.account
            ? 'add a payout account to withdraw'
            : q.data.withdrawableAt
              ? `withdrawals open ${dateTime(q.data.withdrawableAt)}`
              : `withdrawals from ${fcfa(b.minimumPayout)}`}
      </div>
      <Link to="/settings" className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-[#0e1726] hover:text-[#0e1726]">
        {ready ? 'Withdraw' : 'See details'} <Icon name="chevronRight" size={16} />
      </Link>
    </section>
  );
}

// Owner without the optional badge: a short suggestion, hidden for 30 days on "Not now" (a per-device convenience)
const HIDE_KEY = 'tp-badge-hint-hidden-until';
function BadgeSuggestion() {
  const [hidden, setHidden] = useState(() => {
    try {
      return Number(localStorage.getItem(HIDE_KEY) ?? 0) > Date.now();
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + 30 * 86_400_000));
    } catch {
      /* private window: hidden until the page reloads */
    }
    setHidden(true);
  };
  return (
    <section aria-label="Verified badge" className="tp-fade flex flex-wrap items-center gap-4 rounded-[22px] border border-primary/25 bg-primary-tint px-5 py-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
        <Icon name="shield" size={18} />
      </span>
      <div className="min-w-0 flex-[1_1_260px]">
        <div className="text-[15px] font-extrabold text-ink">Show customers your agency is verified</div>
        <div className="text-[13px] text-body">An optional badge next to your name in the app. Customers book with more confidence.</div>
      </div>
      <button type="button" onClick={hide} className="text-sm font-semibold text-muted hover:text-body">
        Not now
      </button>
      <Link to="/settings#badge" className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover hover:text-white">
        See the advantages <Icon name="chevronRight" size={16} />
      </Link>
    </section>
  );
}
