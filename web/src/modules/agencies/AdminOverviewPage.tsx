import { Link } from 'react-router';
import type { AgencyStatus, Me, PlatformOverview } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { WeekChart } from '../../components/ui/Charts';
import { Badge, ErrorState, Panel, Skeleton } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon';
import { ago, compact, fcfa, initials, weekday } from '../../lib/format';
import { Kpi, Row } from '../dashboard/DashboardPage';
import { usePlatformOverview } from './agencies.api';

// TransitPro team (PLATFORM_ADMIN): the whole platform at a glance. Same look as the agency dashboard.
// Volume = every successful payment; commission = TransitPro's share (platformFee, 10 %).
export function AdminOverviewPage({ me }: { me: Me }) {
  const o = usePlatformOverview();
  const first = me.fullName.split(' ')[0];
  const pending = o.data?.agencies.pending ?? 0;

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        subtitle="TransitPro team · every agency, parcel and payment on the platform"
        actions={
          <Link to="/admin/verify" className="flex h-11 items-center gap-2 rounded-full bg-primary px-[18px] text-sm font-bold text-white transition-colors hover:bg-primary-hover hover:text-white">
            <Icon name="shield" size={18} /> Verify agencies{pending > 0 ? ` (${pending})` : ''}
          </Link>
        }
      />
      {o.isError ? (
        <Panel>
          <ErrorState error={o.error} onRetry={() => o.refetch()} />
        </Panel>
      ) : !o.data ? (
        <section className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-[22px]" />
          ))}
        </section>
      ) : (
        <Content o={o.data} />
      )}
    </>
  );
}

function Content({ o }: { o: PlatformOverview }) {
  const a = o.agencies;
  return (
    <>
      <section aria-label="Key figures" className="tp-fade grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        <Kpi
          to="/admin/verify"
          icon="shield"
          tint="bg-warning-tint text-warning"
          label="Agencies to verify"
          value={String(a.pending)}
          pill={a.pending > 0 ? { text: 'Waiting for you', tone: 'amber' } : { text: 'Nothing waiting', tone: 'grey' }}
          bars={o.days.map((d) => d.signups)}
          barsLabel="Agency sign-ups per day, last 7 days"
        />
        <Kpi
          to="/admin/agencies"
          icon="building"
          tint="bg-success-tint text-success"
          label="Verified agencies"
          value={String(a.approved)}
          pill={{ text: `${a.rejected} rejected · ${a.suspended} suspended`, tone: 'grey' }}
        />
        <Kpi
          to="/admin/payments"
          icon="wallet"
          tint="bg-primary-tint text-primary-dark"
          label="Payments, 7 days"
          value={compact(o.week.volume)}
          unit="FCFA"
          pill={o.week.failed > 0 ? { text: `${o.week.payments} paid · ${o.week.failed} failed`, tone: 'amber' } : { text: `${o.week.payments} paid`, tone: 'green' }}
          bars={o.days.map((d) => d.volume)}
          barsLabel="Payment volume per day, last 7 days"
        />
        <Kpi
          to="/admin/payouts"
          icon="chart"
          tint="bg-violet-tint text-violet"
          label="Our commission, 7 days"
          value={compact(o.week.commission)}
          unit="FCFA"
          pill={{ text: '10 % of each payment', tone: 'grey' }}
          bars={o.days.map((d) => d.commission)}
          barsLabel="TransitPro commission per day, last 7 days"
        />
      </section>

      <Row>
        <Panel label="Money through TransitPro" className="h-full">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-bold text-ink">Money through TransitPro, last 7 days</h2>
              <div className="mt-1.5 text-[26px] font-extrabold tracking-[-0.5px] text-ink">
                {compact(o.week.volume)} <span className="text-sm font-semibold text-muted">FCFA</span>
              </div>
            </div>
            <div className="flex gap-3.5 text-xs font-semibold text-body">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
                Our commission
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-series" />
                Owed to agencies
              </span>
            </div>
          </div>
          <WeekChart
            label="Payment volume per day, split into commission and the agencies' share"
            format={fcfa}
            bars={o.days.map((d, i) => ({
              day: weekday(d.date),
              highlight: i === o.days.length - 1,
              parts: [
                { value: d.commission, className: 'bg-primary', label: 'Our commission' },
                { value: d.volume - d.commission, className: 'bg-series', label: 'Owed to agencies' },
              ],
            }))}
          />
        </Panel>

        <Panel label="Latest sign-ups" title="Latest sign-ups" className="h-full" actions={<Link to="/admin/verify" className="text-[13px] font-bold">Verify</Link>}>
          {o.latestAgencies.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No agency yet.</p>
          ) : (
            <ul className="tp-fade flex flex-col">
              {o.latestAgencies.map((ag) => (
                <li key={ag.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-warning-tint text-[12px] font-extrabold text-warning">{initials(ag.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{ag.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {ag.headOffice} · {ago(ag.createdAt)}
                    </span>
                  </span>
                  <AgencyBadge status={ag.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Row>

      <Row>
        <Panel label="Parcels on the platform" title="Parcels on the platform" className="h-full">
          <div className="tp-fade grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
            {[
              ['All parcels', o.parcels.total, 'text-ink'],
              ['On the road', o.parcels.inTransit, 'text-primary-dark'],
              ['Delivered, 7 days', o.parcels.deliveredThisWeek, 'text-success'],
              ['On hold', o.parcels.onHold, o.parcels.onHold > 0 ? 'text-danger' : 'text-ink'],
            ].map(([k, v, c]) => (
              <div key={k as string} className="rounded-[14px] bg-soft px-3 py-2.5">
                <div className="text-xs text-muted">{k}</div>
                <div className={`text-[22px] font-extrabold ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-muted">Across every agency. Each agency sees only its own parcels.</p>
        </Panel>

        <Panel label="Payouts" title="Payouts to agencies" className="h-full">
          <p className="text-[13px] text-body">
            What each agency is owed after our commission, paid by Mobile Money once it passes a threshold, with a “Pay agency” button here.
          </p>
          <p className="mt-auto rounded-[14px] bg-primary-tint px-3 py-2.5 text-[13px] text-primary-dark">Next step after the dashboard: balances and Notch Pay transfers.</p>
        </Panel>
      </Row>
    </>
  );
}

function AgencyBadge({ status }: { status: AgencyStatus }) {
  const t = { PENDING: ['amber', 'To verify'], APPROVED: ['green', 'Verified'], REJECTED: ['red', 'Rejected'], SUSPENDED: ['grey', 'Suspended'] } as const;
  return <Badge tone={t[status][0]}>{t[status][1]}</Badge>;
}
