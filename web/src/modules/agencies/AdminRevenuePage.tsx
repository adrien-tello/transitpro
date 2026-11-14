import { useState } from 'react';
import { Link } from 'react-router';
import type { PlatformRevenue } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { WeekChart } from '../../components/ui/Charts';
import { Badge, Card, ErrorState, Panel, Skeleton } from '../../components/ui/Feedback';
import { FormError, TextField } from '../../components/ui/Field';
import { Icon, type IconName } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { errorMessage } from '../../lib/api';
import { ago, compact, dateTime, fcfa, phone } from '../../lib/format';
import { Kpi, Row } from '../dashboard/DashboardPage';
import { CHANNEL_LABEL, PAYOUT_STATUS } from './AgencyMoney';
import { usePlatformRevenue, useWithdrawPlatform } from './agencies.api';

// TransitPro team: our own money. Where it comes from (10 % of tickets and parcel fees, Verified badges),
// how much of the Notch Pay account is really ours, and the withdrawal (master admin only).

const PURPOSE: Record<string, string> = { TICKET: 'Ticket', PARCEL_FEE: 'Parcel fee', SUBSCRIPTION: 'Verified badge', COD_COLLECTION: 'Cash on delivery' };
const METHOD: Record<string, string> = { CASH: 'Cash', MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money' };

export function AdminRevenuePage() {
  const q = usePlatformRevenue();
  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/admin">Overview</Link> / Revenue
          </>
        }
        title="TransitPro revenue"
        subtitle="Our 10 % on every ticket and parcel sold, plus the Verified badges agencies buy."
      />
      {q.isError ? (
        <Card>
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        </Card>
      ) : !q.data ? (
        <>
          <section className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[150px] rounded-[22px]" />
            ))}
          </section>
          <Skeleton className="h-72 rounded-[22px]" />
        </>
      ) : (
        <Content r={q.data} />
      )}
    </>
  );
}

function Content({ r }: { r: PlatformRevenue }) {
  const t = r.totals;
  const sources: [string, number, IconName, string][] = [
    ['Parcel fees (10 %)', t.fromParcels, 'box', 'bg-accent'],
    ['Tickets (10 %)', t.fromTickets, 'ticket', 'bg-primary'],
    ['Verified badges (100 %)', t.fromBadges, 'shield', 'bg-success'],
  ];
  const max = Math.max(1, ...sources.map((s) => s[1]));
  return (
    <>
      <section aria-label="Key figures" className="tp-fade grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        <Kpi to="/admin/revenue" icon="chart" tint="bg-success-tint text-success" label="Our money, all time" value={compact(t.allTime)} unit="FCFA" pill={{ text: 'Commission + badges', tone: 'green' }} />
        <Kpi
          to="/admin/revenue"
          icon="cal"
          tint="bg-primary-tint text-primary-dark"
          label="Last 30 days"
          value={compact(t.last30Days)}
          unit="FCFA"
          pill={{ text: `${compact(r.days[r.days.length - 1]?.amount ?? 0)} today`, tone: 'grey' }}
          bars={r.days.slice(-7).map((d) => d.amount)}
          barsLabel="Our money per day, last 7 days"
        />
        <Kpi to="/admin/revenue" icon="wallet" tint="bg-violet-tint text-violet" label="Ours to withdraw" value={compact(r.wallet.available)} unit="FCFA" pill={{ text: r.canWithdraw ? 'You can withdraw it' : 'Master admin withdraws', tone: 'grey' }} />
        <Kpi to="/admin/agencies" icon="shield" tint="bg-warning-tint text-warning" label="Verified badges" value={compact(t.fromBadges)} unit="FCFA" pill={{ text: 'Optional, paid by agencies', tone: 'amber' }} />
      </section>

      <Row>
        <Panel label="Last 30 days" title="Our money, last 30 days">
          <WeekChart
            label="TransitPro's money per day, last 30 days"
            height={190}
            format={fcfa}
            bars={r.days.map((d, i) => ({ day: i % 5 === 4 || i === r.days.length - 1 ? d.date.slice(8) : '', highlight: i === r.days.length - 1, parts: [{ value: d.amount, className: 'bg-success', label: 'Our money' }] }))}
          />
        </Panel>
        <Panel label="Where it comes from" title="Where it comes from" className="h-full">
          <ul className="flex flex-col gap-3">
            {sources.map(([k, v, icon, bar]) => (
              <li key={k} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft text-body">
                  <Icon name={icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-[13px]">
                    <span className="font-semibold text-body">{k}</span>
                    <span className="font-extrabold text-ink">{fcfa(v)}</span>
                  </span>
                  <span className="mt-1 block h-1.5 rounded-full bg-chip">
                    <span className={`block h-1.5 rounded-full transition-[width] duration-500 ${bar}`} style={{ width: `${(v / max) * 100}%` }} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-auto text-xs text-muted">Cash on delivery is never cut: it belongs to the sender.</p>
        </Panel>
      </Row>

      <Row>
        <Panel label="Top agencies" title="Top agencies" actions={<Link to="/admin/agencies" className="text-[13px] font-bold">All agencies</Link>}>
          {r.byAgency.length === 0 ? (
            <p className="py-4 text-sm text-muted">No sale yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-[0.5px] text-muted">
                    <th className="py-2">Agency</th>
                    <th className="py-2 text-right">Their sales</th>
                    <th className="py-2 text-right">Our part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {r.byAgency.map((a) => (
                    <tr key={a.agencyId}>
                      <td className="py-2.5">
                        <Link to={`/admin/agencies/${a.agencyId}`} className="font-bold text-ink hover:text-ink">
                          {a.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right text-body">{fcfa(a.sales)}</td>
                      <td className="py-2.5 text-right font-extrabold text-success">{fcfa(a.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <WalletCard r={r} />
      </Row>

      <Row>
        <Panel label="Latest earnings" title="Latest earnings">
          {r.recent.length === 0 ? (
            <p className="py-4 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {r.recent.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">
                      {PURPOSE[p.purpose] ?? p.purpose} · {p.agencyName ?? '—'}
                    </span>
                    <span className="block text-xs text-muted">
                      {METHOD[p.method]} · {fcfa(p.amount)} paid · {ago(p.at)}
                    </span>
                  </span>
                  <span className="text-sm font-extrabold text-success">+{fcfa(p.ourPart)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel label="Withdrawals" title="Our withdrawals">
          {r.withdrawals.length === 0 ? (
            <p className="py-4 text-sm text-muted">No withdrawal yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {r.withdrawals.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{fcfa(w.amount)}</span>
                    <span className="block text-xs text-muted">
                      {CHANNEL_LABEL[w.channel]} · {phone(w.phone)} · {dateTime(w.createdAt)}
                    </span>
                  </span>
                  <Badge tone={PAYOUT_STATUS[w.status].tone}>{PAYOUT_STATUS[w.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </Row>
    </>
  );
}

// The Notch Pay account holds everyone's money: this card shows which part is TransitPro's
function WalletCard({ r }: { r: PlatformRevenue }) {
  const w = r.wallet;
  const withdraw = useWithdrawPlatform();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const value = amount ? Number(amount) : w.available;
  const lines: [string, string, string][] = [
    ['Mobile Money received', fcfa(w.mobileMoneyIn), 'text-ink'],
    ['Already sent out', `− ${fcfa(w.sentOut)}`, 'text-body'],
    ['Owed to agencies', `− ${fcfa(w.owedToAgencies)}`, 'text-body'],
    ['Cash on delivery held', `− ${fcfa(w.codHeld)}`, 'text-body'],
  ];
  return (
    <Panel label="Our wallet" title="Our wallet" className="h-full">
      <dl className="flex flex-col gap-1.5 text-[13px]">
        {lines.map(([k, v, c]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className={`font-semibold ${c}`}>{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2">
          <dt className="font-bold text-ink">Ours, can be withdrawn</dt>
          <dd className="text-[17px] font-extrabold text-success">{fcfa(w.available)}</dd>
        </div>
      </dl>
      {w.providerBalance !== null && <p className="text-xs text-muted">Notch Pay says the account holds {fcfa(w.providerBalance)} (sandbox: 0).</p>}
      {!r.canWithdraw ? (
        <p className="mt-auto flex items-center gap-2 rounded-xl bg-soft px-3 py-2.5 text-[13px] text-body">
          <Icon name="lock" size={16} /> Only the master admin can withdraw TransitPro's money.
        </p>
      ) : !r.account ? (
        <p className="mt-auto rounded-xl bg-warning-tint px-3 py-2.5 text-[13px] text-warning">
          Set TransitPro's Mobile Money account in the server <code>.env</code>: TRANSITPRO_PAYOUT_NAME, TRANSITPRO_PAYOUT_PHONE, TRANSITPRO_PAYOUT_CHANNEL (cm.mtn or cm.orange).
        </p>
      ) : !open ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">
            To {r.account.name} · {CHANNEL_LABEL[r.account.channel]} · {phone(r.account.phone)}
          </span>
          <Button icon="send" disabled={w.available <= 0} onClick={() => setOpen(true)}>
            Withdraw
          </Button>
        </div>
      ) : (
        <div className="tp-fade mt-auto flex flex-col gap-3 rounded-2xl bg-soft p-3.5">
          <TextField label={`Amount (empty = everything, ${fcfa(w.available)})`} inputMode="numeric" placeholder={String(w.available)} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          <p className="text-[13px] text-body">
            Sends {fcfa(value)} to {r.account.name}, {CHANNEL_LABEL[r.account.channel]} {phone(r.account.phone)}. This cannot be undone.
          </p>
          <FormError message={withdraw.isError ? errorMessage(withdraw.error) : null} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="send"
              loading={withdraw.isPending}
              disabled={value <= 0 || value > w.available}
              onClick={() =>
                withdraw.mutate(amount ? Number(amount) : undefined, {
                  onSuccess: (p) => {
                    toast(p.status === 'FAILED' ? 'The withdrawal failed, the money stays in the wallet' : `${fcfa(p.amount)} on its way to TransitPro`, p.status === 'FAILED' ? 'error' : 'success');
                    setOpen(false);
                    setAmount('');
                  },
                })
              }
            >
              Withdraw {fcfa(value)}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
