// Query hooks for Passengers, On the road, My trips, Cash, Profile and Invite.
// Same rule as staff.queries.ts: mock data when EXPO_PUBLIC_STAFF_MOCKS=1, api() otherwise.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { InvitePreview, Me, SessionResponse } from '@contracts/api-types';
import { invitePreview as mockInvite } from '@contracts/mocks';
import { authKeys } from '@/modules/auth/auth.queries';
import type { CourierCash, DriverTrip, StaffStats, TripManifest, TripStop } from './staff.types';
import { USE_MOCKS, mockCourierCash, mockDelay, mockManifest, mockStats, mockTripStops } from './staff.mock';
import { staffKeys } from './staff.queries';

const MANIFEST_REFRESH_MS = 20_000; // the counter agent can board people too

// GET /booking/trips/:id/manifest → TripManifest (not built yet: Joy)
export function useTripManifest(tripId: string) {
  return useQuery<TripManifest, ApiError>({
    queryKey: staffKeys.trip(tripId),
    enabled: !!tripId,
    queryFn: () =>
      USE_MOCKS ? mockDelay(mockManifest(tripId)) : api<TripManifest>(`/booking/trips/${encodeURIComponent(tripId)}/manifest`),
    // While passengers are boarding, keep the list fresh.
    refetchInterval: (q) => (q.state.data?.trip.status === 'BOARDING' ? MANIFEST_REFRESH_MS : false),
  });
}

// Stops for "On the road". No endpoint has the stops in between: origin and destination only.
export function tripStops(trip: DriverTrip): TripStop[] {
  return (
    (USE_MOCKS ? mockTripStops(trip.id) : null) ?? [
      { city: trip.originCity, plannedAt: trip.departureAt },
      { city: trip.destinationCity, plannedAt: trip.arrivalEta },
    ]
  );
}

// Courier · Cash to remit. No endpoint yet (Finance): null = "not available yet".
export function useCourierCash() {
  return useQuery<CourierCash | null, ApiError>({
    queryKey: ['staff', 'courier', 'cash'],
    queryFn: () => (USE_MOCKS ? mockDelay(mockCourierCash) : Promise.resolve(null)),
  });
}

// Staff · Profile stat cards. No endpoint yet: null = hide the cards.
export function useStaffStats(role: Me['role']) {
  return useQuery<StaffStats | null, ApiError>({
    queryKey: ['staff', 'stats', role],
    queryFn: () =>
      USE_MOCKS && (role === 'DRIVER' || role === 'COURIER') ? mockDelay(mockStats[role]) : Promise.resolve(null),
  });
}

// POST /auth/password/change { currentPassword, newPassword } → SessionResponse (works today)
export function useChangePassword() {
  return useMutation<SessionResponse | null, ApiError, { currentPassword: string; newPassword: string }>({
    mutationFn: (body) =>
      USE_MOCKS ? mockDelay(null, 700) : api<SessionResponse>('/auth/password/change', { method: 'POST', body }),
  });
}

// ── Invite (HR, not built yet: Joy) ───────────────────────────────────────────

// GET /hr/invites/:token → InvitePreview (public)
export function useInvite(token: string) {
  return useQuery<InvitePreview, ApiError>({
    queryKey: ['hr', 'invite', token],
    enabled: !!token,
    retry: false,
    queryFn: () =>
      USE_MOCKS
        ? // The design says "expires in 47 h": the mock date is moved so it never looks expired.
          mockDelay({ ...mockInvite, expiresAt: new Date(Date.now() + 47.5 * 3_600_000).toISOString() })
        : api<InvitePreview>(`/hr/invites/${encodeURIComponent(token)}`),
  });
}

// POST /hr/invites/:token/accept { password } → SessionResponse, sets the session cookie.
// Then /auth/me is fetched again: its role makes the gate in app/_layout.tsx open the staff app.
export function useAcceptInvite(token: string) {
  const qc = useQueryClient();
  return useMutation<SessionResponse, ApiError, { password: string; invite: InvitePreview }>({
    mutationFn: ({ password, invite }) =>
      USE_MOCKS
        ? mockDelay({
            user: { id: 'usr_invited', fullName: invite.fullName, email: invite.email, phone: null, role: invite.role, agencyId: 'ag_etoile' },
          })
        : api<SessionResponse>(`/hr/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body: { password } }),
    onSuccess: async (session, { invite }) => {
      if (USE_MOCKS) {
        // No server session in mock mode: show the staff app as the invited person.
        const me: Me = {
          ...session.user,
          agency: { id: 'ag_etoile', name: invite.agencyName, status: 'APPROVED', rejectionReason: null, suspensionReason: null, badgeUntil: null },
          employee: { id: 'emp_invited', jobTitle: invite.role === 'DRIVER' ? 'Driver' : 'Courier', branchId: null, active: true },
          masterAdmin: false,
        };
        qc.setQueryData(authKeys.me, me);
        return;
      }
      await qc.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
