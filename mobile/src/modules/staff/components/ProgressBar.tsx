import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StaffColors } from '../staff.theme';

export function ProgressBar({
  value,
  total,
  color,
  track = StaffColors.progressTrack,
}: {
  value: number;
  total: number;
  color: string;
  track?: string; // light track on white sheets, dark track on navy cards
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  fill: { height: 6, borderRadius: 3 },
});
