import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { ApiError } from '../../lib/api';

// Loading, empty and error states. Every screen that loads data uses these: never a blank page.

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`tp-skeleton block rounded-lg ${className}`} />;
}

// N table rows of grey bars while a list loads
export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-32' : c === cols - 1 ? 'ml-auto w-16' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'box', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-tint text-primary-dark">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-[15px] font-bold text-ink">{title}</p>
        {text && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = error instanceof ApiError && error.code === 'OFFLINE';
  const message = error instanceof ApiError ? error.message : 'Something went wrong';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-tint text-danger">
        <Icon name={offline ? 'wifiOff' : 'alert'} size={22} />
      </span>
      <div>
        <p className="text-[15px] font-bold text-ink">{offline ? 'No internet connection' : 'Could not load this'}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{offline ? 'Check your connection, then try again.' : message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'grey' | 'violet';
const TONES: Record<Tone, string> = {
  blue: 'bg-primary-tint text-primary-dark',
  green: 'bg-success-tint text-success',
  amber: 'bg-warning-tint text-warning',
  red: 'bg-danger-tint text-danger',
  grey: 'bg-chip text-body',
  violet: 'bg-violet-tint text-violet',
};

export function Badge({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${TONES[tone]}`}>{children}</span>;
}

// Dashboard tile of the design: white, 22 px corners, no border (the Card above is for forms and details)
export function Panel({ title, actions, children, className = '', label }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={`flex min-w-0 flex-col gap-3 rounded-[22px] bg-white px-5 py-[18px] ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {title && <h2 className="text-[17px] font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ title, subtitle, actions, children, className = '', padded = true }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white ${padded ? 'p-5' : ''} ${className}`}>
      {(title || actions) && (
        <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${padded ? '' : 'px-5 pt-5'}`}>
          <div>
            {title && <h2 className="text-[17px] font-bold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
