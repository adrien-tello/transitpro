import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:bg-primary/50',
  secondary: 'bg-white text-ink border border-line hover:border-field hover:bg-soft disabled:text-muted',
  danger: 'bg-danger text-white hover:bg-[#931c13] disabled:bg-danger/50',
  ghost: 'bg-transparent text-body hover:bg-soft',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'md' | 'lg';
  loading?: boolean; // spinner + disabled: a request is running, no double submit
  icon?: IconName;
  children: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...rest }: Props) {
  const h = size === 'lg' ? 'h-[52px] rounded-[14px] text-base px-6' : 'h-11 rounded-xl text-sm px-[18px]';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-colors ${h} ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`h-[18px] w-[18px] animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
