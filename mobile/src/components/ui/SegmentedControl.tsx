import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Pill on dark/blue backgrounds (white track) vs the default light-grey track */
  onDark?: boolean;
}

// The pill tab switcher used everywhere: "Tickets / Parcels", "All / Missing / On board".
export function SegmentedControl<T extends string>({ options, value, onChange, onDark }: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, onDark && styles.trackDark]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            activeOpacity={0.85}
            style={[styles.pill, active && (onDark ? styles.pillActiveDark : styles.pillActive)]}
          >
            <Text style={[styles.label, active && (onDark ? styles.labelActiveDark : styles.labelActive)]} numberOfLines={1}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  trackDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  pill: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pillActive: { backgroundColor: Colors.surface },
  pillActiveDark: { backgroundColor: Colors.surface },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.inkSecondary },
  labelActive: { color: Colors.ink },
  labelActiveDark: { color: Colors.ink },
});
