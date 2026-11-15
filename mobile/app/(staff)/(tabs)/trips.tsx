// Driver only (hidden for couriers in the tabs layout).
import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { MyTripsScreen } from '@/modules/staff/components/MyTripsScreen';

export default function StaffTripsScreen() {
  const me = useStaffMe();
  if (!me || me.role !== 'DRIVER') return null;
  return <MyTripsScreen me={me} />;
}
