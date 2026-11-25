import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from '@/components/ui';
import { initials } from '@/components/ui/PersonAvatar';
import { MONO, S } from '@/theme/staff';

// Building blocks shared by the driver and courier screens (see the "Staff app" mockups).

export const PAY_LABEL: Record<string, string> = { MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money', CASH: 'cash' };

// "with MTN MoMo in Douala" — how the parcel fee was paid, when we know it.
export function feePaidWith(p: { payments: { purpose: string; status: string; method: string }[]; from: { city: string } }) {
  const fee = p.payments.find((x) => x.purpose === 'PARCEL_FEE' && x.status === 'SUCCEEDED');
  return fee ? `with ${PAY_LABEL[fee.method] ?? fee.method} in ${p.from.city}` : `in ${p.from.city}`;
}

export function Initials({ name, size = 44, tone = 'cream', ring }: { name: string; size?: number; tone?: 'cream' | 'blue'; ring?: boolean }) {
  const bg = tone === 'cream' ? S.cream : S.blueSoft;
  const fg = tone === 'cream' ? S.brown : S.blue;
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        ring && { borderWidth: 4, borderColor: S.card },
      ]}
    >
      <Text style={{ fontSize: Math.round(size * 0.34), fontWeight: '800', color: fg }}>{initials(name)}</Text>
    </View>
  );
}

// Green tick in a soft square ("Destination matches", proof of delivery rows).
export function CheckBadge({ size = 22, tone = 'ok' }: { size?: number; tone?: 'ok' | 'warn' | 'todo' }) {
  if (tone === 'warn') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: S.amberSoft }]}>
        <Text style={{ color: S.amber, fontWeight: '900', fontSize: size * 0.6 }}>!</Text>
      </View>
    );
  }
  const done = tone === 'ok';
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: done ? S.greenSoft : S.tile }]}>
      <Icon name="check" size={size * 0.62} color={done ? S.green : S.ink3} strokeWidth={2.6} />
    </View>
  );
}

type BtnProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ title, onPress, disabled, loading, icon, iconRight, style }: BtnProps) {
  const off = disabled || loading;
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} disabled={off} style={[styles.btn, { backgroundColor: off ? S.blueDisabled : S.blue }, style]}>
      {loading ? <ActivityIndicator color={S.onBlue} /> : icon ? <Icon name={icon} size={17} color={off ? '#5B6B86' : S.onBlue} /> : null}
      <Text style={[styles.btnText, { color: off ? '#5B6B86' : S.onBlue }]}>{title}</Text>
      {iconRight && <Icon name={iconRight} size={18} color={off ? '#5B6B86' : S.onBlue} strokeWidth={2.2} />}
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, disabled, tone = 'ink', style }: BtnProps & { tone?: 'ink' | 'red' }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled} style={[styles.btn, styles.outline, disabled && { opacity: 0.5 }, style]}>
      <Text style={[styles.btnText, { color: tone === 'red' ? S.red : S.ink }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function DangerButton({ title, onPress, disabled, loading, style }: BtnProps) {
  const off = disabled || loading;
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress} disabled={off} style={[styles.btn, { backgroundColor: S.red, opacity: off ? 0.45 : 1 }, style]}>
      {loading && <ActivityIndicator color={S.onBlue} />}
      <Text style={[styles.btnText, { color: S.onBlue }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function TextLink({ title, onPress, color = S.ink }: { title: string; onPress?: () => void; color?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', paddingVertical: 12 }} activeOpacity={0.6}>
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>{title}</Text>
    </TouchableOpacity>
  );
}

// Small rounded label: "Boarding", "Paid", "Received", "Collect 8,500"...
export function Pill({ label, bg, color, style, textStyle }: { label: string; bg: string; color: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      <Text style={[styles.pillText, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

export function SectionCaps({ children }: { children: string }) {
  return <Text style={styles.caps}>{children}</Text>;
}

// Grey time chip used in lists: "12:40".
export function TimeChip({ time }: { time: string }) {
  return (
    <View style={styles.timeChip}>
      <Text style={styles.timeChipText}>{time}</Text>
    </View>
  );
}

// Grey tile with a small label on top and a bold value: Weight / Seal / Fee, On board / Parcels / Speed.
export function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  btn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnText: { fontSize: 16, fontWeight: '800' },
  outline: { backgroundColor: S.card, borderWidth: 1.5, borderColor: S.border },
  pill: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '800' },
  caps: { fontSize: 12, fontWeight: '800', color: S.ink2, letterSpacing: 0.8, textTransform: 'uppercase' },
  timeChip: { backgroundColor: S.tile, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  timeChipText: { fontFamily: MONO, fontSize: 14, fontWeight: '700', color: S.ink },
  infoTile: { flex: 1, backgroundColor: S.tile, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  infoLabel: { fontSize: 12, color: S.ink2, fontWeight: '500' },
  infoValue: { fontSize: 16, fontWeight: '800', color: S.ink },
});
