import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { AgencyListItem, AgencyProfile, Paginated } from '@contracts/api-types';
import { agencies as mockAgencies, agencyProfile as mockAgencyProfile } from '@contracts/mocks';

// ── Keys ──────────────────────────────────────────────────────────────────────
export const agencyKeys = {
  list: (q?: string) => ['agencies', 'list', q ?? ''] as const,
  profile: (slug: string) => ['agencies', 'profile', slug] as const,
};

// ── GET /agencies ─────────────────────────────────────────────────────────────
export function useAgencies(q?: string) {
  return useQuery<Paginated<AgencyListItem>>({
    queryKey: agencyKeys.list(q),
    queryFn: async () => {
      try {
        const qs = q ? `?q=${encodeURIComponent(q)}` : '';
        return await api<Paginated<AgencyListItem>>(`/agencies${qs}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockAgencies;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

// ── GET /agencies/:slug ───────────────────────────────────────────────────────
export function useAgencyProfile(slug: string) {
  return useQuery<AgencyProfile>({
    queryKey: agencyKeys.profile(slug),
    queryFn: async () => {
      try {
        return await api<AgencyProfile>(`/agencies/${slug}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockAgencyProfile;
        throw e;
      }
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}
