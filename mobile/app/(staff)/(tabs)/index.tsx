// Staff · Today. The role from GET /auth/me picks the screen.
import React from 'react';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { DriverToday } from '@/modules/staff/components/DriverToday';
import { CourierToday } from '@/modules/staff/components/CourierToday';
import { WebDashboardOnly } from '@/modules/staff/components/WebDashboardOnly';

export default function StaffTodayScreen() {
  // undefined = not logged in, or a customer: render nothing. The gate in app/_layout.tsx
  // redirects, and a customer must never see staff screens, even for one frame.
  const me = useStaffMe();
  if (!me) return null;

  if (me.role === 'DRIVER') return <DriverToday me={me} />;
  if (me.role === 'COURIER') return <CourierToday me={me} />;
  return <WebDashboardOnly />;
}
