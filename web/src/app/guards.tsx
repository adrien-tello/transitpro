import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Me } from '@contracts/api-types';
import { Skeleton } from '../components/ui/Feedback';
import { useMe } from '../modules/auth/auth.api';
import { WEB_ROLES } from './nav';

// Who goes where (the server enforces the same rules on every request):
//   not logged in ............ /login
//   TransitPro team .......... /admin
//   driver, courier, customer  /mobile-only (they use the mobile app)
//   agency not APPROVED ...... /pending (documents, waiting for verification)
//   everyone else ............ the agency dashboard

export function homeFor(me: Me): string {
  if (me.role === 'PLATFORM_ADMIN') return '/admin';
  if (!WEB_ROLES.includes(me.role)) return '/mobile-only';
  if (me.agency?.status !== 'APPROVED') return '/pending';
  return '/';
}

// Full-page skeleton while we ask the server who is logged in (no flash of the login page)
export function AppSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen gap-5 bg-canvas p-5">
      <div className="flex w-[232px] shrink-0 flex-col gap-4 rounded-3xl bg-white p-5 max-[900px]:hidden">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-[50px] w-full max-w-[420px] rounded-full" />
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[22px]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

// Pages only for logged-in users of a given area. `area` decides where a wrong user is sent.
export function RequireUser({ area, children }: { area: 'agency' | 'admin' | 'pending' | 'mobile-only'; children: (me: Me) => ReactNode }) {
  const { data: me, isPending } = useMe();
  const location = useLocation();
  if (isPending) return <AppSkeleton />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const home = homeFor(me);
  const allowed =
    (area === 'admin' && home === '/admin') ||
    (area === 'agency' && home === '/') ||
    (area === 'pending' && home === '/pending') ||
    (area === 'mobile-only' && home === '/mobile-only');
  if (!allowed) return <Navigate to={home} replace />;
  return <>{children(me)}</>;
}

// Login, sign-up, forgot password: a logged-in user goes back to their home
export function PublicOnly({ children }: { children: ReactNode }) {
  const { data: me, isPending } = useMe();
  const location = useLocation();
  if (isPending) return <AppSkeleton />;
  if (me) {
    const from = (location.state as { from?: string } | null)?.from;
    const home = homeFor(me);
    return <Navigate to={from && home === '/' ? from : home} replace />;
  }
  return <>{children}</>;
}
