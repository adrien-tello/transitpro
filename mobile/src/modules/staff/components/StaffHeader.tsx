// Top of both Today screens: initials avatar, "Mon 2 Nov · Driver · Akwa", "Morning, Jean",
// and one action on the right (Breakdown for drivers, bell for couriers).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StaffColors } from '../staff.theme';

interface Props {
  initials: string;
  subtitle: string;
  title: string;
  avatarTone: 'primary' | 'warning';
  right?: React.ReactNode;
}

export function StaffHeader({ initials, subtitle, title, avatarTone, right }: Props) {
  const bg = avatarTone === 'primary' ? StaffColors.primaryTint : StaffColors.warningTint;
  const fg = avatarTone === 'primary' ? StaffColors.primaryInk : StaffColors.warning;
  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={[styles.avatarText, { color: fg }]}>{initials}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  texts: { flex: 1 },
  subtitle: { fontSize: 12, color: StaffColors.muted, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: StaffColors.navy, marginTop: 2 },
});
