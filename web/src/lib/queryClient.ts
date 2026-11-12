import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

// React Query keeps server data in a cache:
// - a page opened again shows its data at once, then refreshes it quietly in the background
// - the same data used by two components is fetched once
// - after a change (register, scan...) we invalidate the keys that changed
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // fresh for 30 s: no refetch when switching pages quickly
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      // Retry network hiccups, never 4xx answers (they will not change)
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: { retry: false },
  },
});

// One place for every cache key, so invalidation never misses one
export const keys = {
  me: ['me'] as const,
  branches: ['branches'] as const,
  parcels: (filters?: object) => (filters ? (['parcels', filters] as const) : (['parcels'] as const)),
  parcel: (id: string) => ['parcel', id] as const,
  payment: (id: string) => ['payment', id] as const,
  parcelStats: ['parcels', 'stats'] as const, // under 'parcels': refreshed with the lists after every change
  pendingAgencies: ['admin', 'pending-agencies'] as const,
  overview: ['admin', 'overview'] as const,
  myDocuments: ['documents', 'mine'] as const,
  myPayouts: ['payouts', 'mine'] as const,
  adminAgencies: (filters?: object) => (filters ? (['admin', 'agencies', filters] as const) : (['admin', 'agencies'] as const)),
  adminAgency: (id: string) => ['admin', 'agency', id] as const,
  adminPayments: (filters: object) => ['admin', 'payments', filters] as const,
  payoutAgencies: ['admin', 'payouts', 'agencies'] as const,
  payoutHistory: (filters: object) => ['admin', 'payouts', 'history', filters] as const,
};
