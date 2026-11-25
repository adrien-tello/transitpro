import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';

// One of the small white stat tiles on the staff "Today" header: "Delivered · 5/9".
export function StatTile({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'success' | 'error' }) {
  const color = tone === 'success' ? Colors.success : tone === 'error' ? Colors.error : Colors.ink;
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    gap: 2,
  },
  value: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  label: { fontSize: FontSize.xs, color: Colors.inkSecondary, fontWeight: FontWeight.medium },
});
