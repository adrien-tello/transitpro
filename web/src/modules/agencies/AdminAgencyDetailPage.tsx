import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { AdminAgencyDetail } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormError, TextArea } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { errorMessage } from '../../lib/api';
import { dateTime, fcfa, phone } from '../../lib/format';
import { AGENCY_STATUS } from './AdminAgencyListPage';
import { BalanceBreakdown, CHANNEL_LABEL } from './AgencyMoney';
import { DOCS } from './PendingPage';
import { documentFileUrl, useAdminAgency, useSuspendAgency } from './agencies.api';

// TransitPro team: one agency. Documents to check, activity, money, suspend / reactivate.
export function AdminAgencyDetailPage() {
  const { id = '' } = useParams();
  const q = useAdminAgency(id);

  if (q.isPending)
    return (
      <>
        <Skeleton className="h-10 w-72" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-72 flex-[2_1_480px] rounded-2xl" />
          <Skeleton className="h-72 flex-[1_1_300px] rounded-2xl" />
        </div>
      </>
    );
  if (q.isError)
    return (
      <Card>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </Card>
    );
  return <Detail a={q.data} />;
}

function Detail({ a }: { a: AdminAgencyDetail }) {
  const s = AGENCY_STATUS[a.status];
  return (
    <>
      <PageHeader
        crumbs={
          <>
            <Link to="/admin/agencies">All agencies</Link> / {a.name}
          </>
        }
        title={a.name}
        subtitle={
          <>
            <Badge tone={s.tone}>{s.label}</Badge> <span className="ml-1">{a.headOffice} · signed up {dateTime(a.createdAt)}{a.verifiedAt ? ` · verified ${dateTime(a.verifiedAt)}` : ''}</span>
          </>
        }
        actions={a.status === 'PENDING' ? <Link to="/admin/verify" className="flex h-11 items-center gap-2 rounded-full bg-primary px-[18px] text-sm font-bold text-white hover:bg-primary-hover hover:text-white"><Icon name="shield" size={18} /> Verify it</Link> : undefined}
      />
      {(a.rejectionReason || a.suspensionReason) && (
        <div className="rounded-2xl border border-danger/20 bg-danger-tint px-4 py-3 text-sm text-ink">
          <span className="font-bold text-danger">{a.status === 'SUSPENDED' ? 'Suspended: ' : 'Rejected: '}</span>
          {a.status === 'SUSPENDED' ? a.suspensionReason : a.rejectionReason}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[2_1_480px] flex-col gap-4">
          <Card title="Documents" subtitle="Open each one and compare it with the numbers the agency typed.">
            <div className="flex flex-col gap-2.5">
              {DOCS.map((d) => {
                const file = a.documents.find((f) => f.type === d.type);
                return (
                  <div key={d.type} className="flex flex-wrap items-center gap-3 rounded-xl bg-soft px-3.5 py-3">
                    <Icon name={file ? 'check' : 'file'} className={file ? 'text-success' : 'text-muted'} strokeWidth={file ? 2.4 : 1.8} />
                    <span className="min-w-0 flex-[1_1_200px]">
                      <span className="block text-sm font-bold text-ink">{d.t}</span>
                      <span className="block text-xs text-muted">{file ? `${file.mime === 'application/pdf' ? 'PDF' : 'Photo'} · ${dateTime(file.uploadedAt)}` : 'Not uploaded'}</span>
                    </span>
                    {file && (
                      <a href={documentFileUrl(file.id)} target="_blank" rel="noopener" className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink hover:text-ink">
                        <Icon name="eye" size={16} /> Open
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2.5">
              {[
                ['RCCM typed', a.rccmNumber ?? 'not given'],
                ['NIU typed', a.niuNumber ?? 'not given'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line px-3 py-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-mono text-sm font-bold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Money" subtitle="What TransitPro owes this agency.">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="text-[26px] font-extrabold text-ink">{fcfa(a.balance.available)}</div>
                <Link to="/admin/payouts" className="text-sm font-bold">
                  Go to payouts
                </Link>
              </div>
              <BalanceBreakdown balance={a.balance} />
              <p className="text-[13px] text-muted">
                Payout account:{' '}
                {a.payoutAccount ? (
                  <span className="font-semibold text-body">
                    {a.payoutAccount.name} · {CHANNEL_LABEL[a.payoutAccount.channel]} · {phone(a.payoutAccount.phone)}
                  </span>
                ) : (
                  'not set yet (the owner adds it in Settings)'
                )}
              </p>
            </div>
          </Card>
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Card title="Contact">
            <dl className="flex flex-col gap-2.5 text-sm">
              {[
                ['Owner', a.owner ? a.owner.fullName : '—'],
                ['Owner email', a.owner?.email ?? '—'],
                ['Owner phone', phone(a.owner?.phone)],
                ['Agency email', a.email],
                ['Agency phone', phone(a.phone)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Activity">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Branches', a.branches],
                ['Staff', a.staff],
                ['Parcels', a.parcels],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-soft px-3 py-2.5 text-center">
                  <div className="text-xl font-extrabold text-ink">{v}</div>
                  <div className="text-xs text-muted">{k}</div>
                </div>
              ))}
            </div>
          </Card>
          {(a.status === 'APPROVED' || a.status === 'SUSPENDED') && <SuspendCard a={a} />}
        </div>
      </div>
    </>
  );
}

function SuspendCard({ a }: { a: AdminAgencyDetail }) {
  const act = useSuspendAgency();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const suspended = a.status === 'SUSPENDED';

  if (suspended)
    return (
      <Card title="Suspended" subtitle="Its staff are blocked and customers cannot book it.">
        <FormError message={act.isError ? errorMessage(act.error) : null} />
        <Button icon="refresh" loading={act.isPending} onClick={() => act.mutate({ id: a.id, suspend: false }, { onSuccess: () => toast(`${a.name} is active again, they got an email`) })}>
          Reactivate the agency
        </Button>
      </Card>
    );

  return (
    <Card title="Suspend" subtitle="Blocks its staff at once and hides it from customers. Money owed is still paid.">
      {!open ? (
        <Button variant="secondary" icon="alert" onClick={() => setOpen(true)}>
          Suspend this agency
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <TextArea label="Reason (sent to the agency)" placeholder="Example: transport licence expired on 1 Nov." value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          <FormError message={act.isError ? errorMessage(act.error) : null} />
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 5}
              loading={act.isPending}
              onClick={() => act.mutate({ id: a.id, suspend: true, reason }, { onSuccess: () => (toast(`${a.name} is suspended, they got the reason by email`), setOpen(false)) })}
            >
              Suspend and send the reason
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
