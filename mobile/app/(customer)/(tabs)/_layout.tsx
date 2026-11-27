import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Colors } from '@/theme/colors';
import { Icon } from '@/components/ui';

// Customer tab bar — dark navy pill, active tab highlighted in orange.
function TabIcon({ name, active }: { name: 'home' | 'ticket' | 'parcelBox' | 'user'; active: boolean }) {
  return (
    <Icon
      name={name}
      size={22}
      color={active ? Colors.orange : 'rgba(255,255,255,0.65)'}
    />
  );
}

export default function CustomerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.orange,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ focused }) => <TabIcon name="ticket" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="parcels"
        options={{
          title: 'Parcels',
          tabBarIcon: ({ focused }) => <TabIcon name="parcelBox" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" active={focused} />,
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
