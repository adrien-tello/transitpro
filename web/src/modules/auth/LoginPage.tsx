import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { FormError, PasswordField, TextField } from '../../components/ui/Field';
import { ApiError, errorMessage, fieldError } from '../../lib/api';
import { AuthShell, GoogleButton } from './AuthShell';
import { useLogin } from './auth.api';

export function LoginPage() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!login.isPending) login.mutate({ email, password });
  }

  const err = login.error;
  // 401 = wrong email or password (one message for both, on purpose); field errors go under the fields
  const formError = err && !(err instanceof ApiError && err.code === 'VALIDATION_ERROR') ? errorMessage(err) : null;

  return (
    <AuthShell>
      <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        <div>
          <h2 className="text-[30px] font-extrabold tracking-[-0.6px] text-ink">Welcome back</h2>
          <p className="mt-1.5 text-[15px] text-muted">Sign in to your agency workspace.</p>
        </div>
        <GoogleButton />
        <div className="flex items-center gap-3 text-[13px] font-semibold text-muted">
          <span className="h-px flex-1 bg-line" />
          or with email
          <span className="h-px flex-1 bg-line" />
        </div>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError(err, 'email')}
          className="[&_input]:h-[50px] [&_input]:rounded-[14px]"
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError(err, 'password')}
          className="[&_input]:h-[50px] [&_input]:rounded-[14px]"
        />
        <div className="flex justify-end text-sm">
          <Link to="/forgot-password" className="font-bold">
            Forgot password?
          </Link>
        </div>
        <FormError message={formError} />
        <Button type="submit" size="lg" loading={login.isPending} disabled={!email || !password}>
          Sign in
        </Button>
        <p className="text-center text-[13px] text-muted">Staff accounts are created by your agency owner.</p>
        <div className="border-t border-line pt-[18px] text-center text-sm text-body">
          Running a bus agency?{' '}
          <Link to="/register-agency" className="font-bold">
            Register your agency
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
