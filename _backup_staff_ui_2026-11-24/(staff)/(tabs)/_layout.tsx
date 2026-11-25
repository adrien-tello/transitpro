import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, type IconName } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';

// Floating white pill bar: inactive tabs show just the icon, the active one gets a filled
// blue pill with icon + label — same "active = filled pill" language as the web sidebar.
function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  if (!focused) return <Icon name={icon} size={22} color={Colors.inkSecondary} />;
  return (
    <View style={styles.activePill}>
      <Icon name={icon} size={17} color={Colors.white} />
      <Text style={styles.activeLabel}>{label}</Text>
    </View>
  );
}

// Driver and courier share the Today / Scan / Profile tabs but differ on the 4th:
// a driver gets "Trips" (live map, passengers), a courier gets "Cash" (remittances).
// Other staff roles (counter agent, manager...) are not covered by this redesign yet,
// so they fall back to Today/Scan/Profile only — same as before.
export default function StaffTabsLayout() {
  const { data: me } = useMe();
  const isDriver = me?.role === 'DRIVER';
  const isCourier = me?.role === 'COURIER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="cal" label="Today" focused={focused} /> }} />
      <Tabs.Screen name="scan" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="scan" label="Scan" focused={focused} /> }} />
      <Tabs.Screen
        name="trips"
        options={{ href: isDriver ? undefined : null, tabBarIcon: ({ focused }) => <TabIcon icon="bus" label="Trips" focused={focused} /> }}
      />
      <Tabs.Screen
        name="cash"
        options={{ href: isCourier ? undefined : null, tabBarIcon: ({ focused }) => <TabIcon icon="wallet" label="Cash" focused={focused} /> }}
      />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="user" label="Profile" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    paddingHorizontal: 6,
  },
  item: { height: 68, paddingVertical: 0 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
  },
  activeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.white },
});
