import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { ParcelTracking } from '@contracts/api-types';
import { parcelTracking as mockParcelTracking } from '@contracts/mocks';

export const parcelKeys = {
  track: (code: string) => ['parcels', 'track', code] as const,
};

// ── GET /parcels/track/:code (public, no auth needed) ─────────────────────────
export function useTrackParcel(code: string) {
  return useQuery<ParcelTracking>({
    queryKey: parcelKeys.track(code),
    queryFn: async () => {
      try {
        return await api<ParcelTracking>(`/parcels/track/${encodeURIComponent(code)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockParcelTracking;
        throw e;
      }
    },
    enabled: !!code,
    staleTime: 30_000,
    retry: false,
  });
}
