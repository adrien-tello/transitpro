import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, FontWeight } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  secureTextEntry,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure}
          placeholderTextColor={Colors.inkDisabled}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setSecure(s => !s)}
          >
            <Text style={styles.eyeIcon}>{secure ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.inkSecondary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    minHeight: 48,
  },
  inputRowFocused: {
    borderColor: Colors.borderFocus,
  },
  inputRowError: {
    borderColor: Colors.error,
  },
  iconLeft: {
    paddingLeft: 14,
  },
  iconRight: {
    paddingRight: 14,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputWithLeft: {
    paddingLeft: 8,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.inkDisabled,
    marginTop: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
});
