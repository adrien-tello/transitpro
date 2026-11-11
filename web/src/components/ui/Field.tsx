import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';

// Label + control + hint/error, like the design forms. The error replaces the hint and turns the border red.

interface Wrap {
  label: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
}

const control = (error?: string) =>
  `h-11 w-full rounded-[10px] border bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-soft ${
    error ? 'border-danger' : 'border-field'
  }`;

function Frame({ id, label, hint, error, className = '', children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold text-body">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextField = forwardRef<HTMLInputElement, Wrap & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, hint, error, className, ...input },
  ref,
) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <input ref={ref} id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-msg` : undefined} className={control(error)} {...input} />
    </Frame>
  );
});

export function PasswordField({ label, hint, error, className, ...input }: Wrap & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={`${control(error)} pr-12`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-soft"
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={18} />
        </button>
      </div>
    </Frame>
  );
}

export function SelectField({ label, hint, error, className, children, ...select }: Wrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <select id={id} aria-invalid={!!error} className={`${control(error)} px-2.5`} {...select}>
        {children}
      </select>
    </Frame>
  );
}

export function TextArea({ label, hint, error, className, ...area }: Wrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Frame id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        aria-invalid={!!error}
        className={`min-h-24 w-full rounded-[10px] border bg-white p-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 ${
          error ? 'border-danger' : 'border-field'
        }`}
        {...area}
      />
    </Frame>
  );
}

// A whole-form error (wrong password, server down...) shown above the submit button
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-tint px-3.5 py-3 text-sm font-semibold text-danger">
      <Icon name="alert" size={18} className="mt-px" />
      <span>{message}</span>
    </div>
  );
}
