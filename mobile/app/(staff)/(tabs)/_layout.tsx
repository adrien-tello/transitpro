// Staff tabs. Driver: Today · Scan · Trips · Profile. Courier: Today · Scan · Cash · Profile.
// Other staff roles get no tab bar: Today shows "Use the web dashboard".
// Customers never reach this group (see app/_layout.tsx).
import React from 'react';
import { Tabs } from 'expo-router';
import { useStaffMe } from '@/modules/staff/use-staff-me';
import { COURIER_TABS, DRIVER_TABS, StaffTabBar, type StaffTab } from '@/modules/staff/components/StaffTabBar';

export default function StaffTabsLayout() {
  const me = useStaffMe();
  const tabs = me?.role === 'DRIVER' ? DRIVER_TABS : me?.role === 'COURIER' ? COURIER_TABS : null;
  // href: null removes a tab the role does not have (no link, no deep link).
  const only = (name: StaffTab) => ({ href: tabs?.includes(name) ? undefined : null });

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (tabs ? <StaffTabBar {...props} tabs={tabs} /> : null)}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', ...only('scan') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', ...only('trips') }} />
      <Tabs.Screen name="cash" options={{ title: 'Cash', ...only('cash') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', ...only('profile') }} />
    </Tabs>
  );
}
