import { Tabs } from 'expo-router';
import { Colors } from '@/theme';

// Stub layout for staff screens (owned by Fidel).
// Customer screens are in (customer) — customers never reach this group.
export default function StaffTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
    </Tabs>
  );
}
