import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

// 4 boxes acting as one code input (the receiver's code, the driver's manual-entry fallback).
// Typing a digit moves to the next box; backspace on an empty box moves back.
export function CodeInput({ length = 4, value, onChange, autoFocus }: CodeInputProps) {
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function setDigit(i: number, d: string) {
    const clean = d.replace(/[^0-9]/g, '').slice(-1);
    const next = digits.slice();
    next[i] = clean;
    onChange(next.join(''));
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyPress(i: number, key: string) {
    if (key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      const next = digits.slice();
      next[i - 1] = '';
      onChange(next.join(''));
    }
  }

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={d}
          onChangeText={(t) => setDigit(i, t)}
          onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          style={[styles.box, d ? styles.boxFilled : null]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  box: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
  },
  boxFilled: { borderColor: Colors.primary },
});
