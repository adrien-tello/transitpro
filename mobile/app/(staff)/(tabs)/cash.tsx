// Courier only (hidden for drivers in the tabs layout).
import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { CashScreen } from '@/modules/staff/components/CashScreen';

export default function StaffCashScreen() {
  const me = useStaffMe();
  if (!me || me.role !== 'COURIER') return null;
  return <CashScreen me={me} />;
}
