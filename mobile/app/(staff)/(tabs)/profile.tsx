import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { ProfileScreen } from '@/modules/staff/components/ProfileScreen';

export default function StaffProfileScreen() {
  const me = useStaffMe();
  if (!me || (me.role !== 'DRIVER' && me.role !== 'COURIER')) return null;
  return <ProfileScreen me={me} />;
}
