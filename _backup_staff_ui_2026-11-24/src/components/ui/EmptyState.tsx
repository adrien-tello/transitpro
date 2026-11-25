import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, type IconName } from './Icon';

// First-day / nothing-to-show state, e.g. "No trip on the road right now".
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  title: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  text: { fontSize: FontSize.sm, color: Colors.inkSecondary, textAlign: 'center', lineHeight: 19 },
});
