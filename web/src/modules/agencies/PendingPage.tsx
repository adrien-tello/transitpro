import { useRef } from 'react';
import { useNavigate } from 'react-router';
import type { AgencyDocumentView, DocumentType, Me } from '@contracts/api-types';
import { Badge, Skeleton } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon';
import { Logo } from '../../components/ui/Logo';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { errorMessage } from '../../lib/api';
import { ago } from '../../lib/format';
import { useLogout, useMe } from '../auth/auth.api';
import { useRealtime } from '../../lib/realtime';
import { documentFileUrl, useMyDocuments, useResubmit, useUploadDocument } from './agencies.api';

// An agency that is not APPROVED lands here: upload the 5 documents, see the decision, what happens next.
// The server refuses every agency action (403) until approval, whatever this page shows.
export const DOCS: { type: DocumentType; t: string; sub: string }[] = [
  { type: 'RCCM', t: 'Trade register certificate (RCCM)', sub: 'PDF or photo, every number readable' },
  { type: 'NIU', t: 'Taxpayer card (NIU)', sub: 'PDF or photo' },
  { type: 'OWNER_CNI_FRONT', t: 'Owner CNI, front', sub: 'Photo of the ID card' },
  { type: 'OWNER_CNI_BACK', t: 'Owner CNI, back', sub: 'Photo of the ID card' },
  { type: 'TRANSPORT_LICENCE', t: 'Transport licence (Ministry of Transport)', sub: 'Required for intercity passenger transport' },
];

export function PendingPage({ me }: { me: Me }) {
  const navigate = useNavigate();
  const logout = useLogout();
  const refresh = useMe();
  const toast = useToast();
  const docs = useMyDocuments(me.role === 'AGENCY_OWNER');
  useRealtime(me); // approved / rejected while this page is open: it changes by itself
  const resubmit = useResubmit();
  const rejected = me.agency?.status === 'REJECTED';
  const suspended = me.agency?.status === 'SUSPENDED';
  const owner = me.role === 'AGENCY_OWNER';
  const uploaded = docs.data?.length ?? 0;

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

      <div className="tp-page mx-auto flex w-full max-w-[1180px] flex-col gap-5">
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
                ? 'Fix what is described below (for example, upload the right document), then ask for a new check.'
                : suspended
                  ? 'Your agency cannot sell tickets or carry parcels for now. Contact the TransitPro team.'
                  : 'Before customers can see your agency, the TransitPro team checks that it is a real, licensed transport company.'}
            </p>
          </div>
          <Button variant="secondary" icon="refresh" loading={refresh.isFetching} onClick={() => refresh.refetch()}>
            Check my status
          </Button>
        </div>

        {(rejected || suspended) && (me.agency?.rejectionReason || me.agency?.suspensionReason) && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/20 bg-danger-tint p-4">
            <Icon name="alert" className="text-danger" />
            <div className="min-w-0 flex-[1_1_300px]">
              <div className="text-sm font-bold text-danger">Reason given by the TransitPro team</div>
              <p className="mt-0.5 text-[15px] text-ink">{suspended ? me.agency?.suspensionReason : me.agency?.rejectionReason}</p>
            </div>
            {rejected && owner && (
              <Button
                icon="send"
                loading={resubmit.isPending}
                onClick={() => resubmit.mutate(undefined, { onSuccess: () => toast('Sent: the TransitPro team will check your agency again') })}
              >
                Ask for a new check
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-4">
          <section aria-label="Documents" className="flex min-w-0 flex-[3_1_560px] flex-col gap-3.5 rounded-[22px] bg-surface p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-[19px] font-extrabold text-ink">Legal documents</h2>
                <p className="mt-1 text-sm text-muted">
                  {owner ? 'The TransitPro team needs these 5 documents to approve your agency. Photos or PDF, 5 MB max.' : 'Your agency owner uploads these documents.'}
                </p>
              </div>
              {owner && docs.data && (
                <Badge tone={uploaded === DOCS.length ? 'green' : 'amber'}>
                  {uploaded} of {DOCS.length} uploaded
                </Badge>
              )}
            </div>
            {owner && docs.isPending
              ? DOCS.map((d) => <Skeleton key={d.type} className="h-[74px] rounded-2xl" />)
              : DOCS.map((d) => <DocumentRow key={d.type} doc={d} file={docs.data?.find((f) => f.type === d.type)} canUpload={owner && !suspended} />)}
            {docs.isError && <p className="text-sm font-semibold text-danger">{errorMessage(docs.error)}</p>}
          </section>

          <section aria-label="What happens next" className="flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 rounded-[22px] bg-inverse p-[22px] text-white">
            <h2 className="text-[17px] font-bold">What happens next</h2>
            {[
              'You upload your 5 documents on this page.',
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

// One document: empty (dashed, Upload) or uploaded (green, Open + Replace). The file picker accepts photos and PDFs;
// on a phone it also offers the camera.
export function DocumentRow({ doc, file, canUpload }: { doc: (typeof DOCS)[number]; file?: AgencyDocumentView; canUpload: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const toast = useToast();
  const busy = upload.isPending;

  const pick = (f: File | undefined) => {
    if (!f) return;
    upload.mutate({ type: doc.type, file: f }, { onSuccess: () => toast(`${doc.t} uploaded`) });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3.5 rounded-2xl p-3.5 transition-colors duration-200 ${
        file ? 'border border-success/25 bg-success-tint' : 'border-[1.5px] border-dashed border-primary/60 bg-primary-soft'
      }`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${file ? 'bg-surface text-success' : 'bg-primary-tint text-primary-dark'}`}>
        <Icon name={file ? 'check' : 'file'} strokeWidth={file ? 2.4 : 1.8} />
      </span>
      <span className="min-w-0 flex-[1_1_220px]">
        <span className="block text-[15px] font-bold text-ink">{doc.t}</span>
        <span className="block text-[13px] text-muted">
          {upload.isError ? <span className="font-semibold text-danger">{errorMessage(upload.error)}</span> : file ? `${file.mime === 'application/pdf' ? 'PDF' : 'Photo'} · uploaded ${ago(file.uploadedAt)}` : doc.sub}
        </span>
      </span>
      <div className="flex gap-2">
        {file && (
          <a href={documentFileUrl(file.id)} target="_blank" rel="noopener" className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-ink hover:bg-soft hover:text-ink">
            <Icon name="eye" size={16} /> Open
          </a>
        )}
        {canUpload && (
          <>
            <input ref={input} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
            <Button variant={file ? 'secondary' : 'primary'} icon={file ? 'refresh' : 'plus'} loading={busy} onClick={() => input.current?.click()} className="h-10">
              {busy ? 'Uploading…' : file ? 'Replace' : 'Upload'}
            </Button>
          </>
        )}
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
