import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { Me } from '@contracts/api-types';
import { PageHeader } from '../../app/AppLayout';
import { ROLE_LABEL } from '../../app/nav';
import { Button } from '../../components/ui/Button';
import { Badge, Card } from '../../components/ui/Feedback';
import { FormError, PasswordField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { errorMessage, fieldError } from '../../lib/api';
import { initials, phone } from '../../lib/format';
import { useChangePassword } from './auth.api';

// Settings for every web account: my profile, change my password, and (agency staff) the agency.
// Agency settings (prices, documents, notifications) come later: listed at the bottom, not faked.
export function SettingsPage({ me }: { me: Me }) {
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and your security." />
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <Card title="My profile">
            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-lg font-extrabold text-primary-dark">{initials(me.fullName)}</span>
              <div className="min-w-0">
                <div className="truncate text-[17px] font-extrabold text-ink">{me.fullName}</div>
                <div className="text-[13px] text-muted">{me.employee?.jobTitle ?? ROLE_LABEL[me.role]}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
              {[
                ['Email', me.email],
                ['Phone', phone(me.phone)],
                ['Role', ROLE_LABEL[me.role]],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-xl bg-soft px-3 py-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-0.5 truncate text-sm font-bold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[13px] text-muted">To change your name or email, ask your agency owner (or the TransitPro team).</p>
          </Card>

          {me.agency && (
            <Card title="Agency">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-bold text-ink">{me.agency.name}</span>
                <Badge tone={me.agency.status === 'APPROVED' ? 'green' : 'amber'}>{me.agency.status === 'APPROVED' ? 'Verified by TransitPro' : me.agency.status.toLowerCase()}</Badge>
              </div>
              {me.role === 'AGENCY_OWNER' && (
                <p className="mt-2 text-[13px] text-body">
                  Manage your <Link to="/branches" className="font-bold">branches</Link>. Prices, documents and notifications arrive in the next version.
                </p>
              )}
            </Card>
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col">
          <ChangePassword />
        </div>
      </div>
    </>
  );
}

function ChangePassword() {
  const change = useChangePassword();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && confirm !== next;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
          toast('Password changed. Your other devices are logged out.');
        },
      },
    );
  }

  return (
    <Card title="Change my password" subtitle="At least 8 characters. Every other device where you are logged in will be logged out.">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={fieldError(change.error, 'currentPassword')} required />
        <PasswordField label="New password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={fieldError(change.error, 'newPassword')} minLength={8} required />
        <PasswordField label="New password again" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'The two passwords are different' : undefined} required />
        <FormError message={change.isError && !fieldError(change.error, 'currentPassword') && !fieldError(change.error, 'newPassword') ? errorMessage(change.error) : null} />
        <div className="flex justify-end">
          <Button type="submit" loading={change.isPending} disabled={!current || next.length < 8 || mismatch}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
