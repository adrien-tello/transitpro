import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { CourierStats, CourierStop, ParcelDetail, ParcelListItem, ParcelTracking } from '@contracts/api-types';
import {
  courierStats as mockCourierStats,
  courierStops as mockCourierStops,
  parcelDetail as mockParcelDetail,
  parcelsMine as mockParcelsMine,
  parcelTracking as mockParcelTracking,
} from '@contracts/mocks';

export const parcelKeys = {
  track: (code: string) => ['parcels', 'track', code] as const,
  mine: ['parcels', 'mine'] as const,
  detail: (id: string) => ['parcels', 'detail', id] as const,
  stops: ['parcels', 'mine', 'stops'] as const,
  stats: ['parcels', 'mine', 'stats'] as const,
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

// ── GET /parcels/mine (DRIVER, COURIER, agents) ────────────────────────────────
// Parcels the signed-in staff member holds right now: on the bus (driver) or out for delivery (courier).
export function useParcelsMine(enabled = true) {
  return useQuery<ParcelListItem[]>({
    queryKey: parcelKeys.mine,
    queryFn: async () => {
      try {
        return await api<ParcelListItem[]>('/parcels/mine');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockParcelsMine;
        throw e;
      }
    },
    enabled,
    staleTime: 15_000,
  });
}

// ── GET /parcels/:id (id or tracking code) ─────────────────────────────────────
export function useParcel(id: string, enabled = true) {
  return useQuery<ParcelDetail>({
    queryKey: parcelKeys.detail(id),
    queryFn: async () => {
      try {
        return await api<ParcelDetail>(`/parcels/${encodeURIComponent(id)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockParcelDetail;
        throw e;
      }
    },
    enabled: enabled && !!id,
    staleTime: 15_000,
  });
}

function invalidateParcel(qc: ReturnType<typeof useQueryClient>, id: string) {
  qc.invalidateQueries({ queryKey: parcelKeys.detail(id) });
  qc.invalidateQueries({ queryKey: parcelKeys.mine });
}

// ── POST /parcels/:id/scan { type, tripId? | weightKg? | courierId? } ─────────
// Driver: scans a parcel's QR to load it on the bus ({ type: 'LOADED', tripId }).
export function useScanParcel(id: string) {
  const qc = useQueryClient();
  return useMutation<ParcelDetail, ApiError, { type: 'LOADED' | 'DEPARTED' | 'ARRIVED' | 'HANDED_TO_COURIER'; tripId?: string; weightKg?: number; courierId?: string }>({
    mutationFn: (body) => api<ParcelDetail>(`/parcels/${encodeURIComponent(id)}/scan`, { method: 'POST', body }),
    onSuccess: () => invalidateParcel(qc, id),
  });
}

// ── POST /parcels/:id/cod-payment { method, payerPhone? } ─────────────────────
// Receiver pays cash-on-delivery before the parcel is handed over.
export function useCodPayment(id: string) {
  const qc = useQueryClient();
  return useMutation<ParcelDetail, ApiError, { method: 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH'; payerPhone?: string }>({
    mutationFn: (body) => api<ParcelDetail>(`/parcels/${encodeURIComponent(id)}/cod-payment`, { method: 'POST', body }),
    onSuccess: () => invalidateParcel(qc, id),
  });
}

// ── POST /parcels/:id/deliver { otp, photoUrl?, lat?, lng? } ──────────────────
// Courier: confirms delivery with the receiver's 4-digit code (plus proof: handover photo and GPS).
export function useDeliverParcel(id: string) {
  const qc = useQueryClient();
  return useMutation<ParcelDetail, ApiError, { otp: string; photoUrl?: string; lat?: number; lng?: number }>({
    mutationFn: (body) => api<ParcelDetail>(`/parcels/${encodeURIComponent(id)}/deliver`, { method: 'POST', body }),
    onSuccess: () => invalidateParcel(qc, id),
  });
}

// ── GET /parcels/mine/stops (COURIER) ──────────────────────────────────────────
export function useCourierStops(enabled = true) {
  return useQuery<CourierStop[]>({
    queryKey: parcelKeys.stops,
    queryFn: async () => {
      try {
        return await api<CourierStop[]>('/parcels/mine/stops');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockCourierStops;
        throw e;
      }
    },
    enabled,
    staleTime: 15_000,
  });
}

// ── GET /parcels/mine/stats (COURIER) ──────────────────────────────────────────
export function useCourierStats(enabled = true) {
  return useQuery<CourierStats>({
    queryKey: parcelKeys.stats,
    queryFn: async () => {
      try {
        return await api<CourierStats>('/parcels/mine/stats');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockCourierStats;
        throw e;
      }
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── POST /parcels/:id/refuse { reason } ────────────────────────────────────────
export function useRefuseParcel(id: string) {
  const qc = useQueryClient();
  return useMutation<ParcelDetail, ApiError, { reason: string }>({
    mutationFn: (body) => api<ParcelDetail>(`/parcels/${encodeURIComponent(id)}/refuse`, { method: 'POST', body }),
    onSuccess: () => invalidateParcel(qc, id),
  });
}
