import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Icon, type IconName } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { S } from '@/theme/staff';

// Floating white pill bar: inactive tabs show just the icon, the active one gets a filled
// blue pill with icon + label (see the "Staff app" mockups).
function TabIcon({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  if (!focused) return <Icon name={icon} size={22} color="#475569" />;
  return (
    <View style={styles.activePill}>
      <Icon name={icon} size={18} color={S.onBlue} strokeWidth={2} />
      <Text style={styles.activeLabel}>{label}</Text>
    </View>
  );
}

// Driver and courier share Today / Scan / Profile but differ on the 3rd tab:
// a driver gets "Trips" (My trips, live map, passengers), a courier gets "Cash" (remittances).
// Other staff roles fall back to Today / Scan / Profile only.
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
      {/* The scanner is full screen: no tab bar over the camera, its own close button returns. */}
      <Tabs.Screen
        name="scan"
        options={{ tabBarStyle: { display: 'none' }, tabBarIcon: ({ focused }) => <TabIcon icon="scan" label="Scan" focused={focused} /> }}
      />
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
    bottom: 18,
    height: 66,
    borderRadius: 33,
    backgroundColor: S.card,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: '#1F4FD8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    paddingHorizontal: 6,
    paddingBottom: 0,
  },
  item: { height: 66, paddingVertical: 0, justifyContent: 'center' },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: S.blue,
    borderRadius: 26,
    paddingHorizontal: 15,
    height: 50,
    justifyContent: 'center',
  },
  activeLabel: { fontSize: 15, fontWeight: '800', color: S.onBlue },
});
