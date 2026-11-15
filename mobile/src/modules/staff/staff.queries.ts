// TanStack Query hooks for the staff app.
// Each hook returns mock data when EXPO_PUBLIC_STAFF_MOCKS=1 and calls api() otherwise.
// When an endpoint ships, only its query function changes; the screens stay the same.
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { ParcelDetail, ParcelListItem } from '@contracts/api-types';
import type {
  BoardingCheck,
  BoardingResult,
  CourierDay,
  DriverTrip,
  ParcelScanView,
  StopDetail,
} from './staff.types';
import { isSameDay } from './staff.format';
import {
  USE_MOCKS,
  mockCourierDay,
  mockCourierParcels,
  mockDelay,
  mockDriverTrips,
  mockBoard,
  mockCheckTicket,
  mockLoadParcel,
  mockParcelForScan,
  mockSetTripStatus,
  mockStopDetail,
} from './staff.mock';

export const staffKeys = {
  driverTrips: ['staff', 'trips', 'driver'] as const,
  // Shared with the scanner and the passenger list: invalidate after each boarding.
  trip: (tripId: string) => ['staff', 'trip', tripId] as const,
  myParcels: ['staff', 'parcels', 'mine'] as const,
  stop: (code: string) => ['staff', 'parcels', 'stop', code] as const,
  courierDay: ['staff', 'courier', 'day'] as const,
};

// ── Driver ────────────────────────────────────────────────────────────────────

// GET /booking/trips/driver → DriverTrip[] (not built yet: Joy)
export function useDriverTrips() {
  return useQuery<DriverTrip[], ApiError>({
    queryKey: staffKeys.driverTrips,
    queryFn: () =>
      USE_MOCKS ? mockDelay(mockDriverTrips()) : api<DriverTrip[]>('/booking/trips/driver'),
  });
}

// PATCH /booking/trips/:id/status { status } (not built yet: Joy)
export function useSetTripStatus() {
  const qc = useQueryClient();
  return useMutation<DriverTrip, ApiError, { tripId: string; status: DriverTrip['status'] }>({
    mutationFn: ({ tripId, status }) =>
      USE_MOCKS
        ? mockDelay(mockSetTripStatus(tripId, status))
        : api<DriverTrip>(`/booking/trips/${encodeURIComponent(tripId)}/status`, {
            method: 'PATCH',
            body: { status },
          }),
    onSuccess: (trip) => {
      qc.invalidateQueries({ queryKey: staffKeys.driverTrips });
      qc.invalidateQueries({ queryKey: staffKeys.trip(trip.id) });
    },
  });
}

// POST /fleet/trips/:tripId/location { lat, lng } (not built yet: Sweet)
export async function sendTripLocation(tripId: string, lat: number, lng: number): Promise<void> {
  if (USE_MOCKS) return;
  await api<unknown>(`/fleet/trips/${encodeURIComponent(tripId)}/location`, {
    method: 'POST',
    body: { lat, lng },
  });
}

// ── Courier ───────────────────────────────────────────────────────────────────

// GET /parcels/mine → ParcelListItem[] (works today)
export function useMyParcels() {
  return useQuery<ParcelListItem[], ApiError>({
    queryKey: staffKeys.myParcels,
    queryFn: () => (USE_MOCKS ? mockDelay(mockCourierParcels) : api<ParcelListItem[]>('/parcels/mine')),
  });
}

// GET /parcels/:code → ParcelDetail (works today). Courier · Today shows each stop's area,
// the next stop's full address and seal, which ParcelListItem does not have.
async function fetchStopDetail(code: string): Promise<StopDetail> {
  if (USE_MOCKS) return mockDelay(mockStopDetail[code] ?? { deliveryAddress: null, sealNumber: '–' });
  const d = await api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}`);
  return { deliveryAddress: d.deliveryAddress, sealNumber: d.security.sealNumber };
}

export function useStopDetails(codes: string[]) {
  return useQueries({
    queries: codes.map((code) => ({
      queryKey: staffKeys.stop(code),
      queryFn: () => fetchStopDetail(code),
    })),
  });
}

// Courier · Today stat tiles (Delivered, Refused, Cash to remit). No endpoint yet:
// mocks show the design values, the real app shows "–" until the Lead / Finance add one.
export function useCourierDay() {
  return useQuery<CourierDay, ApiError>({
    queryKey: staffKeys.courierDay,
    queryFn: () =>
      USE_MOCKS ? mockDelay(mockCourierDay) : Promise.resolve({ delivered: null, refused: null, cashToRemit: null }),
  });
}

// Today's trip = the first trip leaving today that is not finished.
export function pickTodayTrip(trips: DriverTrip[]): DriverTrip | undefined {
  return trips
    .filter((t) => isSameDay(t.departureAt) && t.status !== 'ARRIVED' && t.status !== 'CANCELLED')
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt))[0];
}

// ── Boarding (not built yet on the server: Joy) ───────────────────────────────

// GET /booking/tickets/:code/check?tripId= → BoardingCheck
export function useCheckTicket() {
  return useMutation<BoardingCheck, ApiError, { code: string; tripId: string }>({
    mutationFn: ({ code, tripId }) =>
      USE_MOCKS
        ? mockDelay(mockCheckTicket(code, tripId))
        : api<BoardingCheck>(
            `/booking/tickets/${encodeURIComponent(code)}/check?tripId=${encodeURIComponent(tripId)}`,
          ),
  });
}

// POST /booking/tickets/:code/board { tripId } → BoardingResult
export function useBoardTicket() {
  const qc = useQueryClient();
  return useMutation<BoardingResult, ApiError, { code: string; tripId: string }>({
    mutationFn: ({ code, tripId }) =>
      USE_MOCKS
        ? mockDelay(mockBoard(code, tripId))
        : api<BoardingResult>(`/booking/tickets/${encodeURIComponent(code)}/board`, {
            method: 'POST',
            body: { tripId },
          }),
    // Today, the scan sheet and the passenger list read the same counters.
    onSuccess: (_r, { tripId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.driverTrips });
      qc.invalidateQueries({ queryKey: staffKeys.trip(tripId) });
    },
  });
}

// ── Parcel scan (works today on the server) ───────────────────────────────────

function toScanView(d: ParcelDetail): ParcelScanView {
  return {
    trackingCode: d.trackingCode,
    status: d.status,
    fromCity: d.from.city,
    fromBranch: d.from.branch,
    toCity: d.to.city,
    homeDelivery: d.homeDelivery,
    weightKg: d.weightKg,
    sealNumber: d.security.sealNumber,
    feePaid: d.payments.some((p) => p.purpose === 'PARCEL_FEE' && p.status === 'SUCCEEDED'),
  };
}

// GET /parcels/:code. A driver may only read parcels they already carry (403 otherwise),
// so null = "not readable yet": the sheet shows the code and the server checks it on "Load".
export function useLookupParcel() {
  return useMutation<ParcelScanView | null, ApiError, { code: string }>({
    mutationFn: async ({ code }) => {
      if (USE_MOCKS) {
        const p = mockParcelForScan(code);
        if (!p) throw new ApiError(404, 'NOT_FOUND', 'Unknown parcel code');
        return mockDelay(p);
      }
      try {
        return toScanView(await api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}`));
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) return null;
        throw e;
      }
    },
  });
}

// POST /parcels/:code/scan { type: "LOADED", tripId } → ParcelDetail
export function useLoadParcel() {
  const qc = useQueryClient();
  return useMutation<ParcelScanView, ApiError, { code: string; tripId: string }>({
    mutationFn: async ({ code, tripId }) =>
      USE_MOCKS
        ? mockDelay(mockLoadParcel(code, tripId))
        : toScanView(
            await api<ParcelDetail>(`/parcels/${encodeURIComponent(code)}/scan`, {
              method: 'POST',
              body: { type: 'LOADED', tripId },
            }),
          ),
    onSuccess: (_r, { tripId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.driverTrips });
      qc.invalidateQueries({ queryKey: staffKeys.trip(tripId) });
    },
  });
}
