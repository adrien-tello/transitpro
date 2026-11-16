// The logged-in staff member, for the staff screens.
// A customer gets `undefined` here, so a customer never sees staff screens.
import type { Me } from '@contracts/api-types';
import { useMe } from '@/modules/auth/auth.queries';

export function useStaffMe(): Me | undefined {
  const me = useMe();
  if (me.data) return me.data.role === 'CUSTOMER' ? undefined : me.data;
  return undefined;
}
