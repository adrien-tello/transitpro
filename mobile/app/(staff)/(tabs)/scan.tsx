import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { ScanScreen } from '@/modules/staff/components/ScanScreen';

export default function StaffScanScreen() {
  const me = useStaffMe();
  if (!me || (me.role !== 'DRIVER' && me.role !== 'COURIER')) return null;
  return <ScanScreen me={me} />;
}
