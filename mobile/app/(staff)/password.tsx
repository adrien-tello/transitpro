// Staff · Change password, opened from Profile.
import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { ChangePasswordScreen } from '@/modules/staff/components/ChangePasswordScreen';

export default function PasswordRoute() {
  const me = useStaffMe();
  if (!me) return null;
  return <ChangePasswordScreen />;
}
