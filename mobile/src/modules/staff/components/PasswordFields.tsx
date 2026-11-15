// New password + repeat, with the live rules from the design (Invite · set password):
// at least 8 characters, contains a number, both passwords match.
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { StaffColors } from '../staff.theme';
import { StaffIcon } from './StaffIcon';

export function passwordRules(pw: string, repeat: string) {
  return [
    { ok: pw.length >= 8, label: 'At least 8 characters' },
    { ok: /\d/.test(pw), label: 'Contains a number' },
    { ok: pw.length > 0 && pw === repeat, label: 'Both passwords match' },
  ];
}

export function PasswordField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
  );
}

export function PasswordRules({ pw, repeat }: { pw: string; repeat: string }) {
  return (
    <View style={{ marginTop: 12, gap: 6 }}>
      {passwordRules(pw, repeat).map((r) => (
        <View key={r.label} style={styles.rule}>
          <View style={[styles.dot, r.ok && styles.dotOk]}>
            {r.ok && <StaffIcon name="check" size={11} color={StaffColors.success} />}
          </View>
          <Text style={[styles.ruleText, r.ok && { color: StaffColors.navy }]}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: StaffColors.navy, marginBottom: 6 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StaffColors.field,
    backgroundColor: StaffColors.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    color: StaffColors.navy,
  },
  inputFocused: { borderWidth: 2, borderColor: StaffColors.primary },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: StaffColors.chip, alignItems: 'center', justifyContent: 'center' },
  dotOk: { backgroundColor: StaffColors.successTint },
  ruleText: { fontSize: 13, color: StaffColors.muted },
});
