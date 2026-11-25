import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { BoardResult, DriverPassengerRow, DriverSchedule, DriverTripView, OkResponse } from '@contracts/api-types';
import { driverPassengers as mockDriverPassengers, driverSchedule as mockDriverSchedule, driverTrip as mockDriverTrip } from '@contracts/mocks';

// Driver "Today" / "Trips" / "Scan" screens. The server side of /booking/trips/mine and
// /booking/trips/:id/passengers is not built yet (see docs/API.md) — same 501-fallback-to-mock
// convention as every other module, so the screens render now and switch to real data for free
// once Joy ships the endpoint.

export const staffKeys = {
  myTrip: ['staff', 'trips', 'mine'] as const,
  schedule: ['staff', 'trips', 'mine', 'schedule'] as const,
  passengers: (tripId: string) => ['staff', 'trips', tripId, 'passengers'] as const,
};

// ── GET /booking/trips/mine (DRIVER) ───────────────────────────────────────────
export function useMyTrip(enabled = true) {
  return useQuery<DriverTripView | null>({
    queryKey: staffKeys.myTrip,
    queryFn: async () => {
      try {
        return await api<DriverTripView>('/booking/trips/mine');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockDriverTrip;
        if (e instanceof ApiError && e.status === 404) return null; // no trip today
        throw e;
      }
    },
    enabled,
    staleTime: 15_000,
  });
}

// ── GET /booking/trips/mine/schedule (DRIVER) ──────────────────────────────────
// "My trips": next days + last trips. Empty lists (not an error) when the driver has none.
export function useMySchedule(enabled = true) {
  return useQuery<DriverSchedule>({
    queryKey: staffKeys.schedule,
    queryFn: async () => {
      try {
        return await api<DriverSchedule>('/booking/trips/mine/schedule');
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockDriverSchedule;
        if (e instanceof ApiError && e.status === 404) return { upcoming: [], done: [] };
        throw e;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

// ── GET /booking/trips/:id/passengers ──────────────────────────────────────────
export function usePassengers(tripId: string, enabled = true) {
  return useQuery<DriverPassengerRow[]>({
    queryKey: staffKeys.passengers(tripId),
    queryFn: async () => {
      try {
        return await api<DriverPassengerRow[]>(`/booking/trips/${encodeURIComponent(tripId)}/passengers`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockDriverPassengers;
        throw e;
      }
    },
    enabled: enabled && !!tripId,
    staleTime: 10_000,
  });
}

// ── POST /booking/tickets/:code/board { tripId } ───────────────────────────────
export function useBoardTicket() {
  const qc = useQueryClient();
  return useMutation<BoardResult, ApiError, { code: string; tripId: string }>({
    mutationFn: ({ code, tripId }) => api<BoardResult>(`/booking/tickets/${encodeURIComponent(code)}/board`, { method: 'POST', body: { tripId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.myTrip });
    },
  });
}

// ── PATCH /booking/trips/:id/status ────────────────────────────────────────────
export function useSetTripStatus(tripId: string) {
  const qc = useQueryClient();
  return useMutation<DriverTripView, ApiError, { status: 'BOARDING' | 'DEPARTED' | 'ARRIVED' }>({
    mutationFn: (body) => api<DriverTripView>(`/booking/trips/${encodeURIComponent(tripId)}/status`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.myTrip }),
  });
}

// ── POST /fleet/trips/:tripId/location { lat, lng } ───────────────────────────
// Sent every 30 s while "Start trip · share live location" is on (see Trips tab).
export function useShareLocation(tripId: string) {
  return useMutation<OkResponse | void, ApiError, { lat: number; lng: number }>({
    mutationFn: async (body) => {
      try {
        return await api<OkResponse>(`/fleet/trips/${encodeURIComponent(tripId)}/location`, { method: 'POST', body });
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return undefined; // not built yet: fail silently, UI already shows "sharing"
        throw e;
      }
    },
  });
}

// ── POST /fleet/breakdowns { tripId, note? } ───────────────────────────────────
export function useReportBreakdown() {
  return useMutation<OkResponse, ApiError, { tripId: string; note?: string }>({
    mutationFn: async (body) => {
      try {
        return await api<OkResponse>('/fleet/breakdowns', { method: 'POST', body });
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return { ok: true };
        throw e;
      }
    },
  });
}
