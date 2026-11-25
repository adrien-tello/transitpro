import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontWeight } from '@/theme';

// Initials circle for a staff member (driver, courier...), colored by role so it reads at a
// glance in lists — same idea as AgencyAvatar but for people instead of agencies.
const ROLE_BG: Record<string, string> = {
  DRIVER: Colors.agencySE,
  COURIER: Colors.agencyEV,
  COUNTER_AGENT: Colors.agencyML,
  BRANCH_MANAGER: Colors.agencyLE,
};

export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function PersonAvatar({ name, role, size = 48 }: { name: string; role?: string; size?: number }) {
  const bg = (role && ROLE_BG[role]) || Colors.agencyST;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize: Math.round(size * 0.36) }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: FontWeight.bold, color: '#1E293B' },
});
