import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { FormError, PasswordField, TextField } from '../../components/ui/Field';
import { Icon } from '../../components/ui/Icon';
import { ApiError, errorMessage, fieldError } from '../../lib/api';
import { AuthShell } from './AuthShell';
import { useForgotPassword, useResetPassword } from './auth.api';

// Two steps: email → (6-digit code by email) code + new password. Success logs the user in.
export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const sent = forgot.isSuccess;

  function sendCode(e: FormEvent) {
    e.preventDefault();
    if (!forgot.isPending) forgot.mutate({ email });
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!reset.isPending) reset.mutate({ email, code, password });
  }

  const resetErr = reset.error;
  const resetFormError = resetErr && !(resetErr instanceof ApiError && resetErr.code === 'VALIDATION_ERROR') ? errorMessage(resetErr) : null;

  return (
    <AuthShell>
      <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold">
        <Icon name="arrowLeft" size={16} /> Back to sign in
      </Link>
      {!sent ? (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-[18px]">
          <div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.6px] text-ink">Forgot your password?</h2>
            <p className="mt-1.5 text-[15px] text-muted">Enter your email. We send you a 6-digit code to choose a new password.</p>
          </div>
          <TextField label="Email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError(forgot.error, 'email')} />
          <FormError message={forgot.error && !fieldError(forgot.error, 'email') ? errorMessage(forgot.error) : null} />
          <Button type="submit" size="lg" loading={forgot.isPending} disabled={!email}>
            Send the code
          </Button>
        </form>
      ) : (
        <form onSubmit={save} noValidate className="flex flex-col gap-[18px]">
          <div>
            <h2 className="text-[30px] font-extrabold tracking-[-0.6px] text-ink">Check your inbox</h2>
            <p className="mt-1.5 text-[15px] text-muted">
              If <b className="text-ink">{email}</b> has an account, we sent it a code. It expires in 10 minutes. Look in the spam folder too.
            </p>
          </div>
          <TextField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            error={fieldError(resetErr, 'code')}
            className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-[8px]"
          />
          <PasswordField label="New password" autoComplete="new-password" hint="8 characters minimum" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldError(resetErr, 'password')} />
          <FormError message={resetFormError} />
          <Button type="submit" size="lg" loading={reset.isPending} disabled={code.length !== 6 || password.length < 8}>
            Save and sign in
          </Button>
          <button type="button" onClick={() => forgot.mutate({ email })} disabled={forgot.isPending} className="text-sm font-bold text-primary">
            {forgot.isPending ? 'Sending…' : 'Send a new code'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
