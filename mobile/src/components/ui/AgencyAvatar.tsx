import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AgencyBadge } from '@contracts/api-types';
import { FontWeight } from '@/theme';

interface AgencyAvatarProps {
  agency: Pick<AgencyBadge, 'initials' | 'color' | 'name'>;
  size?: number;
}

export function AgencyAvatar({ agency, size = 44 }: AgencyAvatarProps) {
  const fontSize = Math.round(size * 0.35);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: agency.color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{agency.initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: FontWeight.bold,
    color: '#1E293B',
  },
});
