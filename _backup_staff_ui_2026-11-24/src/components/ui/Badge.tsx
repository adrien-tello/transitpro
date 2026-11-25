import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'cheapest'
  | 'bestRated'
  | 'fastest'
  | 'vip'
  | 'classic';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary:   { bg: Colors.primaryLight, text: Colors.primary },
  success:   { bg: Colors.successLight, text: Colors.success },
  error:     { bg: Colors.errorLight,   text: Colors.error },
  warning:   { bg: Colors.warningLight, text: Colors.warning },
  info:      { bg: Colors.infoLight,    text: Colors.info },
  neutral:   { bg: Colors.surfaceAlt,   text: Colors.inkSecondary },
  cheapest:  { bg: Colors.successLight, text: Colors.tagCheapest },
  bestRated: { bg: Colors.primaryLight, text: Colors.tagBestRated },
  fastest:   { bg: Colors.warningLight, text: Colors.tagFastest },
  vip:       { bg: '#FEF3C7',           text: '#B45309' },
  classic:   { bg: Colors.surfaceAlt,   text: Colors.inkSecondary },
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

/** Map a trip tag string to the correct Badge variant */
export function tripTagVariant(tag: string): BadgeVariant {
  if (tag === 'CHEAPEST') return 'cheapest';
  if (tag === 'BEST_RATED') return 'bestRated';
  if (tag === 'FASTEST') return 'fastest';
  return 'neutral';
}

/** Map a parcel status to a Badge variant */
export function parcelStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    REGISTERED: 'neutral',
    LOADED: 'info',
    IN_TRANSIT: 'primary',
    ARRIVED: 'success',
    OUT_FOR_DELIVERY: 'warning',
    DELIVERED: 'success',
    ON_HOLD: 'warning',
    REFUSED: 'error',
    RETURNED: 'error',
  };
  return map[status] ?? 'neutral';
}

/** Human-readable parcel status label */
export function parcelStatusLabel(status: string): string {
  const map: Record<string, string> = {
    REGISTERED: 'Registered',
    LOADED: 'Loaded on bus',
    IN_TRANSIT: 'In transit',
    ARRIVED: 'Arrived',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    ON_HOLD: 'On hold',
    REFUSED: 'Refused',
    RETURNED: 'Returned',
  };
  return map[status] ?? status;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
