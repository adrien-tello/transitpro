// The logged-in staff member, for the staff screens.
//
// Preview mode (developers only): with EXPO_PUBLIC_STAFF_MOCKS=1 and
// EXPO_PUBLIC_STAFF_PREVIEW=DRIVER or COURIER in mobile/.env, the staff screens can be viewed
// with a fake user when the server cannot be reached (no database on this computer yet).
// It never applies when /auth/me answers: a real customer still gets `undefined` here,
// so a customer never sees staff screens.
import type { Me } from '@contracts/api-types';
import { meCourier } from '@contracts/mocks';
import { useMe } from '@/modules/auth/auth.queries';
import { USE_MOCKS } from './staff.mock';

const PREVIEW_ROLE = process.env.EXPO_PUBLIC_STAFF_PREVIEW;

const meDriver: Me = {
  id: 'usr_jean',
  fullName: 'Jean Fotso',
  email: 'driver@etoile.test',
  phone: null,
  role: 'DRIVER',
  agencyId: 'ag_etoile',
  agency: meCourier.agency,
  employee: { id: 'emp_jean', jobTitle: 'Driver', branchId: 'br_akwa', active: true },
  masterAdmin: false,
};

export const STAFF_PREVIEW_ON = USE_MOCKS && (PREVIEW_ROLE === 'DRIVER' || PREVIEW_ROLE === 'COURIER');

// The fake user shown in preview mode, or null when preview mode is off.
// `as` lets one link pick the role: /preview?as=COURIER (preview mode only).
export function previewMe(as?: string): Me | null {
  if (!STAFF_PREVIEW_ON) return null;
  const role = as === 'DRIVER' || as === 'COURIER' ? as : PREVIEW_ROLE;
  return role === 'DRIVER' ? meDriver : meCourier;
}

export function useStaffMe(): Me | undefined {
  const me = useMe();
  if (me.data) return me.data.role === 'CUSTOMER' ? undefined : me.data;
  // Server unreachable (network error), not "logged out" (that is data === null).
  if (STAFF_PREVIEW_ON && me.isError) return PREVIEW_ROLE === 'DRIVER' ? meDriver : meCourier;
  return undefined;
}
