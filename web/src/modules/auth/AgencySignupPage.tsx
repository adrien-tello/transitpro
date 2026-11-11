import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { FormError, PasswordField, TextField } from '../../components/ui/Field';
import { Logo } from '../../components/ui/Logo';
import { ApiError, errorMessage } from '../../lib/api';
import { initials } from '../../lib/format';
import { useRegisterAgency, type RegisterAgencyBody } from './auth.api';

// "Register your agency" from the design: steps on top, the form, a live summary and "what happens next".
// Steps 1-2 here create the agency (PENDING) and log the owner in; documents (3) and review (4) follow.
const STEPS = [
  { t: 'Agency', d: 'Name, head office, contact' },
  { t: 'Owner', d: 'Your account' },
  { t: 'Documents', d: 'RCCM, NIU, CNI, licence' },
  { t: 'Review', d: 'TransitPro checks, 48 h' },
];

const NEXT = [
  'Upload your documents (RCCM, NIU, owner CNI, transport licence).',
  'Our team checks them, usually within 48 hours. You get an email.',
  'Add your branches, buses, routes and staff, then start selling.',
];

export function AgencySignupPage() {
  const navigate = useNavigate();
  const register = useRegisterAgency();
  const [step, setStep] = useState<0 | 1>(0);
  const [agency, setAgency] = useState({ name: '', headOffice: '', phone: '', email: '', rccmNumber: '', niuNumber: '' });
  const [owner, setOwner] = useState({ fullName: '', email: '', phone: '', password: '' });
  const err = register.error;
  // Server field errors come back as "agency.name", "owner.email"...
  const fe = (path: string) => (err instanceof ApiError ? err.details?.[path]?.[0] : undefined);

  const agencyReady = agency.name.trim().length >= 2 && agency.headOffice.trim().length >= 2 && agency.phone.trim().length >= 9 && agency.email.includes('@');
  const ownerReady = owner.fullName.trim().length >= 2 && owner.email.includes('@') && owner.phone.trim().length >= 9 && owner.password.length >= 8;

  function next(e: FormEvent) {
    e.preventDefault();
    if (agencyReady) setStep(1);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ownerReady || register.isPending) return;
    const body: RegisterAgencyBody = {
      agency: {
        name: agency.name,
        headOffice: agency.headOffice,
        phone: agency.phone,
        email: agency.email,
        rccmNumber: agency.rccmNumber || undefined,
        niuNumber: agency.niuNumber || undefined,
      },
      owner,
    };
    register.mutate(body, { onSuccess: () => navigate('/pending', { replace: true }) });
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-canvas p-5">
      <header className="flex flex-wrap items-center gap-3 rounded-[22px] bg-white px-[22px] py-3.5">
        <span className="flex-1">
          <Logo />
        </span>
        <span className="text-sm text-body">
          Already registered?{' '}
          <Link to="/login" className="font-bold">
            Sign in
          </Link>
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.6px] text-ink">Register your agency</h1>
          <p className="mt-1.5 text-[15px] text-muted">The TransitPro team checks every agency before it can sell tickets or carry parcels.</p>
        </div>

        <ol aria-label="Steps" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 rounded-[22px] bg-white p-3.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={s.t} aria-current={current ? 'step' : undefined} className={`flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 ${current ? 'bg-primary-tint' : done ? 'bg-soft' : ''}`}>
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                    done ? 'bg-success-tint text-success' : current ? 'bg-primary text-white' : 'bg-chip text-body'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{s.t}</span>
                  <span className="block text-xs text-muted">{s.d}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-start gap-4">
          <section className="flex min-w-0 flex-[3_1_560px] flex-col gap-4 rounded-[22px] bg-white p-6">
            {step === 0 ? (
              <form onSubmit={next} noValidate className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[19px] font-extrabold text-ink">Your agency</h2>
                  <p className="mt-1 text-sm text-muted">As written on your trade register certificate.</p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                  <TextField label="Agency name" placeholder="Étoile Voyages" value={agency.name} onChange={(e) => setAgency({ ...agency, name: e.target.value })} error={fe('agency.name')} autoFocus />
                  <TextField label="Head office" placeholder="Douala, Akwa" value={agency.headOffice} onChange={(e) => setAgency({ ...agency, headOffice: e.target.value })} error={fe('agency.headOffice')} />
                  <TextField label="Agency phone" type="tel" placeholder="677 00 00 00" value={agency.phone} onChange={(e) => setAgency({ ...agency, phone: e.target.value })} error={fe('agency.phone')} />
                  <TextField label="Agency email" type="email" placeholder="contact@agency.cm" value={agency.email} onChange={(e) => setAgency({ ...agency, email: e.target.value })} error={fe('agency.email')} />
                  <TextField label="RCCM number" hint="Optional now, required for approval" placeholder="RC/DLA/2019/B/1482" value={agency.rccmNumber} onChange={(e) => setAgency({ ...agency, rccmNumber: e.target.value })} />
                  <TextField label="NIU (taxpayer number)" hint="Optional now, required for approval" placeholder="M0519 0000 1482 K" value={agency.niuNumber} onChange={(e) => setAgency({ ...agency, niuNumber: e.target.value })} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="lg" disabled={!agencyReady}>
                    Continue
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[19px] font-extrabold text-ink">The owner&apos;s account</h2>
                  <p className="mt-1 text-sm text-muted">You sign in with it. You add your staff later, from the dashboard.</p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
                  <TextField label="Full name" autoComplete="name" value={owner.fullName} onChange={(e) => setOwner({ ...owner, fullName: e.target.value })} error={fe('owner.fullName')} autoFocus />
                  <TextField label="Phone" type="tel" autoComplete="tel" value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} error={fe('owner.phone')} />
                  <TextField label="Email" type="email" autoComplete="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} error={fe('owner.email')} />
                  <PasswordField label="Password" autoComplete="new-password" hint="8 characters minimum" value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} error={fe('owner.password')} />
                </div>
                <FormError message={err && !(err instanceof ApiError && err.code === 'VALIDATION_ERROR') ? errorMessage(err) : null} />
                <div className="flex flex-wrap justify-between gap-2.5">
                  <Button type="button" variant="secondary" size="lg" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="submit" size="lg" loading={register.isPending} disabled={!ownerReady}>
                    Create my agency
                  </Button>
                </div>
              </form>
            )}
          </section>

          <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
            <section aria-label="Your agency" className="flex flex-col gap-3 rounded-[22px] bg-white p-[22px]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-warning-tint font-extrabold text-warning">
                  {agency.name ? initials(agency.name) : 'TP'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-extrabold text-ink">{agency.name || 'Your agency'}</span>
                  <span className="block text-[13px] text-muted">Head office · {agency.headOffice || '—'}</span>
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-2.5">
                {[
                  ['Phone', agency.phone || '—'],
                  ['Email', agency.email || '—'],
                  ['RCCM', agency.rccmNumber || 'later'],
                  ['NIU', agency.niuNumber || 'later'],
                ].map(([k, v]) => (
                  <div key={k} className="min-w-0 rounded-xl bg-soft px-3 py-2.5">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="mt-0.5 truncate text-sm font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-label="What happens next" className="flex flex-col gap-3.5 rounded-[22px] bg-ink p-[22px] text-white">
              <h2 className="text-[17px] font-bold">What happens next</h2>
              {NEXT.map((t, i) => (
                <div key={t} className="flex gap-3">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-white/15 text-[13px] font-extrabold">{i + 1}</span>
                  <span className="text-sm leading-snug text-[#DCE3EE]">{t}</span>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
