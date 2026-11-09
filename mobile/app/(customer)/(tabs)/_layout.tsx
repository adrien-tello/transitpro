import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '@/theme/colors';

// SVG-free icon set matching the design exactly (home, ticket, box/parcel, person)
function HomeIcon({ active }: { active: boolean }) {
  return <Text style={[styles.icon, { color: active ? Colors.navy : Colors.white }]}>⌂</Text>;
}
function TripsIcon({ active }: { active: boolean }) {
  return <Text style={[styles.icon, { color: active ? Colors.navy : Colors.white }]}>🎫</Text>;
}
function ParcelsIcon({ active }: { active: boolean }) {
  return <Text style={[styles.icon, { color: active ? Colors.navy : Colors.white }]}>⬡</Text>;
}
function ProfileIcon({ active }: { active: boolean }) {
  return <Text style={[styles.icon, { color: active ? Colors.navy : Colors.white }]}>👤</Text>;
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.navy,
        tabBarInactiveTintColor: Colors.white,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <HomeIcon active={focused} />,
          tabBarBackground: () => null,
          tabBarItemStyle: styles.tabItem,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ focused }) => <TripsIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="parcels"
        options={{
          title: 'Parcels',
          tabBarIcon: ({ focused }) => <ParcelsIcon active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon active={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.navy,
    borderTopWidth: 0,
    height: 72,
    borderRadius: 36,
    marginHorizontal: 16,
    marginBottom: 24,
    position: 'absolute',
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  tabItem: {
    borderRadius: 28,
    marginVertical: 8,
    marginHorizontal: 4,
  },
  icon: { fontSize: 20 },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
