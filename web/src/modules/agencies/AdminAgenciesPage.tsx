import { useState } from 'react';
import type { PendingAgency } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { Button } from '../../components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormError, TextArea } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { errorMessage } from '../../lib/api';
import { ago, initials, phone } from '../../lib/format';
import { useDecideAgency, usePendingAgencies } from './agencies.api';

// TransitPro team: agencies waiting for verification, oldest first. Approve, or reject with a reason
// (the agency gets an email either way).
export function AdminAgenciesPage() {
  const list = usePendingAgencies();
  return (
    <>
      <PageHeader title="Agencies to verify" subtitle="Check each agency's documents and numbers before it can sell tickets or carry parcels." />
      {list.isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : list.isError ? (
        <Card>
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        </Card>
      ) : list.data.length === 0 ? (
        <Card>
          <EmptyState icon="check" title="Nothing to verify" text="New agency sign-ups appear here. You also get them by refreshing this page." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.data.map((a) => (
            <AgencyRow key={a.id} agency={a} />
          ))}
        </div>
      )}
    </>
  );
}

const DOC_LABEL: Record<string, string> = {
  RCCM: 'RCCM',
  NIU: 'NIU',
  OWNER_CNI_FRONT: 'CNI front',
  OWNER_CNI_BACK: 'CNI back',
  TRANSPORT_LICENCE: 'Licence',
};

function AgencyRow({ agency: a }: { agency: PendingAgency }) {
  const decide = useDecideAgency();
  const toast = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const approve = () =>
    decide.mutate({ id: a.id, approve: true }, { onSuccess: () => toast(`${a.name} is approved, they got an email`) });
  const reject = () =>
    decide.mutate({ id: a.id, approve: false, reason }, { onSuccess: () => toast(`${a.name} was rejected, they got the reason by email`) });

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-warning-tint font-extrabold text-warning">{initials(a.name)}</span>
        <div className="min-w-0 flex-[1_1_260px]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-extrabold text-ink">{a.name}</h2>
            <Badge tone="amber">Signed up {ago(a.createdAt)}</Badge>
          </div>
          <p className="text-[13px] text-muted">
            {a.headOffice} · {phone(a.phone)} · {a.email}
          </p>
          <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            {[
              ['Owner', a.owner ? `${a.owner.fullName} · ${phone(a.owner.phone)}` : '—'],
              ['Owner email', a.owner?.email ?? '—'],
              ['RCCM', a.rccmNumber ?? 'not given'],
              ['NIU', a.niuNumber ?? 'not given'],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl bg-soft px-3 py-2.5">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 truncate text-sm font-bold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(DOC_LABEL).map((t) => (
              <Badge key={t} tone={a.documentTypes.includes(t) ? 'green' : 'grey'}>
                {a.documentTypes.includes(t) ? '✓' : '·'} {DOC_LABEL[t]}
              </Badge>
            ))}
          </div>
        </div>
        {!rejecting && (
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={() => setRejecting(true)} disabled={decide.isPending}>
              Reject
            </Button>
            <Button icon="check" onClick={approve} loading={decide.isPending && decide.variables?.approve}>
              Approve
            </Button>
          </div>
        )}
      </div>
      {rejecting && (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          <TextArea
            label="Reason (sent to the agency)"
            placeholder="Example: the RCCM number does not match the uploaded document."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <FormError message={decide.isError ? errorMessage(decide.error) : null} />
          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={reject} disabled={reason.trim().length < 5} loading={decide.isPending}>
              Reject and send the reason
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
