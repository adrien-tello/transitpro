import { useNavigate } from 'react-router';
import type { Me } from '@contracts/api-types';
import { Badge } from '../../components/ui/Feedback';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { useLogout, useMe } from '../auth/auth.api';

// An agency that is not APPROVED lands here: what is missing, what happens next.
// The server refuses every agency action (403) until approval, whatever this page shows.
const DOCS: { t: string; sub: string; icon: IconName }[] = [
  { t: 'Trade register certificate (RCCM)', sub: 'PDF or photo, every number readable', icon: 'file' },
  { t: 'Taxpayer card (NIU)', sub: 'PDF or photo', icon: 'file' },
  { t: 'Owner CNI, front', sub: 'Photo of the ID card', icon: 'file' },
  { t: 'Owner CNI, back', sub: 'Photo of the ID card', icon: 'file' },
  { t: 'Transport licence (Ministry of Transport)', sub: 'Required for intercity passenger transport', icon: 'file' },
];

export function PendingPage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const refresh = useMe();
  const rejected = me.agency?.status === 'REJECTED';
  const suspended = me.agency?.status === 'SUSPENDED';

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-canvas p-5">
      <header className="flex flex-wrap items-center gap-3 rounded-[22px] bg-surface px-[22px] py-3.5">
        <span className="flex-1">
          <Logo />
        </span>
        <span className="text-sm text-muted max-sm:hidden">{me.fullName}</span>
        <Button variant="secondary" icon="out" loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}>
          Log out
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-[1_1_420px]">
            <div className="mb-2">
              {rejected ? <Badge tone="red">Not approved</Badge> : suspended ? <Badge tone="red">Suspended</Badge> : <Badge tone="amber">Waiting for verification</Badge>}
            </div>
            <h1 className="text-[30px] font-extrabold tracking-[-0.6px] text-ink">
              {rejected ? `We could not verify ${me.agency?.name}` : suspended ? `${me.agency?.name} is suspended` : `Welcome, ${me.agency?.name}`}
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {rejected
                ? 'Fix what is described below, then contact the TransitPro team to be checked again.'
                : suspended
                  ? 'Your agency cannot sell tickets or carry parcels for now. Contact the TransitPro team.'
                  : 'Before customers can see your agency, the TransitPro team checks that it is a real, licensed transport company.'}
            </p>
          </div>
          <Button variant="secondary" icon="refresh" loading={refresh.isFetching} onClick={() => refresh.refetch()}>
            Check my status
          </Button>
        </div>

        {rejected && me.agency?.rejectionReason && (
          <div role="alert" className="flex gap-3 rounded-2xl border border-danger/20 bg-danger-tint p-4">
            <Icon name="alert" className="mt-0.5 text-danger" />
            <div>
              <div className="text-sm font-bold text-danger">Reason given by the TransitPro team</div>
              <p className="mt-0.5 text-[15px] text-ink">{me.agency.rejectionReason}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start gap-4">
          <section aria-label="Documents" className="flex min-w-0 flex-[3_1_560px] flex-col gap-3.5 rounded-[22px] bg-surface p-6">
            <div>
              <h2 className="text-[19px] font-extrabold text-ink">Legal documents</h2>
              <p className="mt-1 text-sm text-muted">The TransitPro team needs these 5 documents to approve your agency.</p>
            </div>
            {DOCS.map((d) => (
              <div key={d.t} className="flex flex-wrap items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-primary/60 bg-primary-soft p-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-dark">
                  <Icon name={d.icon} />
                </span>
                <span className="min-w-0 flex-[1_1_220px]">
                  <span className="block text-[15px] font-bold text-ink">{d.t}</span>
                  <span className="block text-[13px] text-muted">{d.sub}</span>
                </span>
                <Badge tone="grey">Upload opens soon</Badge>
              </div>
            ))}
            <p className="text-[13px] text-muted">Document upload is the next step we are building. Until then, the TransitPro team contacts you by email.</p>
          </section>

          <section aria-label="What happens next" className="flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 rounded-[22px] bg-inverse p-[22px] text-white">
            <h2 className="text-[17px] font-bold">What happens next</h2>
            {[
              'You upload your documents.',
              'Our team checks them, usually within 48 hours. You get an email with the decision.',
              'Once approved, this page opens your dashboard: add branches, staff and trips, then start selling.',
            ].map((t, i) => (
              <div key={t} className="flex gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-extrabold">{i + 1}</span>
                <span className="text-sm leading-snug text-white/80">{t}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

// Drivers, couriers and customers work in the mobile app
export function MobileOnlyPage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const logout = useLogout();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-5">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] bg-surface p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-tint text-primary-dark">
          <Icon name="phone" size={26} />
        </span>
        <h1 className="text-2xl font-extrabold text-ink">Use the TransitPro app</h1>
        <p className="text-[15px] text-muted">
          Hi {me.fullName.split(' ')[0]}, this dashboard is for agency staff.{' '}
          {me.role === 'CUSTOMER' ? 'You can book trips and track your parcels in the TransitPro mobile app.' : 'Your scans and deliveries are in the TransitPro staff app.'} Sign in there with the same account.
        </p>
        {me.role === 'CUSTOMER' && (
          <p className="text-[13px] text-muted">
            Work for an agency? Ask your agency owner to add <span className="font-semibold text-body">{me.email}</span> to the staff. Own an agency? Log out, then choose “Register your agency” on the sign-in page.
          </p>
        )}
        <Button variant="secondary" icon="out" loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })}>
          Log out
        </Button>
      </div>
    </div>
  );
}
