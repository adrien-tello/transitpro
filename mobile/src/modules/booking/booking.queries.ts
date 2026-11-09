import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type {
  CreateTicketInput,
  SeatMap,
  Ticket,
  TripSearchResult,
} from '@contracts/api-types';
import { seatMap as mockSeatMap, ticket as mockTicket, tripSearchResults as mockTrips } from '@contracts/mocks';

// ── Keys ──────────────────────────────────────────────────────────────────────
export const bookingKeys = {
  myTickets: ['booking', 'tickets', 'mine'] as const,
  tripSearch: (params: TripSearchParams) => ['booking', 'trips', 'search', params] as const,
  seatMap: (tripId: string) => ['booking', 'trips', tripId, 'seats'] as const,
};

export interface TripSearchParams {
  from: string;
  to: string;
  date: string;
  sort?: 'earliest' | 'cheapest' | 'rating';
}

// ── GET /booking/tickets/mine ─────────────────────────────────────────────────
export function useMyTickets() {
  return useQuery<Ticket[]>({
    queryKey: bookingKeys.myTickets,
    queryFn: async () => {
      try {
        return await api<Ticket[]>('/booking/tickets/mine');
      } catch (e) {
        // Endpoint not built yet — fall back to mock so UI renders
        if (e instanceof ApiError && e.status === 501) return [mockTicket];
        throw e;
      }
    },
    staleTime: 30_000,
  });
}

// ── GET /booking/trips/search ─────────────────────────────────────────────────
export function useTripSearch(params: TripSearchParams, enabled = true) {
  return useQuery<TripSearchResult[]>({
    queryKey: bookingKeys.tripSearch(params),
    queryFn: async () => {
      try {
        return await api<TripSearchResult[]>(
          `/booking/trips/search?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}&date=${params.date}&sort=${params.sort ?? 'earliest'}`,
        );
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockTrips;
        throw e;
      }
    },
    enabled,
    staleTime: 30_000,
  });
}

// ── GET /booking/trips/:id/seats ──────────────────────────────────────────────
export function useSeatMap(tripId: string) {
  return useQuery<SeatMap>({
    queryKey: bookingKeys.seatMap(tripId),
    queryFn: async () => {
      try {
        return await api<SeatMap>(`/booking/trips/${tripId}/seats`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 501) return mockSeatMap;
        throw e;
      }
    },
    enabled: !!tripId,
    staleTime: 30_000,
  });
}

// ── POST /booking/tickets ─────────────────────────────────────────────────────
export function useCreateTicket() {
  return useMutation<Ticket, ApiError, CreateTicketInput>({
    mutationFn: (body) => api<Ticket>('/booking/tickets', { method: 'POST', body }),
  });
}
