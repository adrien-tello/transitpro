/**
 * RegisterForm – fullName, email, phone, password form used by the Register screen.
 *
 * Validates locally before calling the mutation.
 * Surfaces ApiError messages inline so the screen stays clean.
 */

import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { TextStyles } from '@/theme/typography';
import { Spacing } from '@/theme';
import { ApiError } from '@/lib/api';
import { useRegister } from './auth.queries';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegisterFormProps {
  onSuccess: () => void;
  onLogin: () => void;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Allow international phone numbers: optional +, then 7–15 digits
const PHONE_RE = /^\+?\d{7,15}$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

function validate(
  fullName: string,
  email: string,
  phone: string,
  password: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (fullName.trim().length === 0) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (email.trim().length === 0) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (phone.trim().length === 0) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_RE.test(phone.trim().replace(/\s/g, ''))) {
    errors.phone = 'Enter a valid phone number (e.g. +237 6XX XXX XXX).';
  }

  if (password.length === 0) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterForm({
  onSuccess,
  onLogin,
}: RegisterFormProps): React.JSX.Element {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Refs for focus-chaining between fields
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const registerMutation = useRegister({
    onSuccess,
    onError(err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    },
  });

  function clearFieldError(field: keyof FieldErrors): void {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }

  function handleSubmit(): void {
    setServerError(null);
    const errors = validate(fullName, email, phone, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    registerMutation.mutate({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim().replace(/\s/g, ''),
      password,
    });
  }

  return (
    <View style={styles.container}>
      {/* Full name */}
      <Input
        label="Full name"
        placeholder="e.g. Marie Dupont"
        value={fullName}
        onChangeText={(v) => {
          setFullName(v);
          clearFieldError('fullName');
        }}
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        error={fieldErrors.fullName}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      {/* Email */}
      <Input
        ref={emailRef}
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clearFieldError('email');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={fieldErrors.email}
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
      />

      {/* Phone */}
      <Input
        ref={phoneRef}
        label="Phone number"
        placeholder="+237 6XX XXX XXX"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          clearFieldError('phone');
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={fieldErrors.phone}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      {/* Password */}
      <Input
        ref={passwordRef}
        label="Password"
        placeholder="Min. 8 characters"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          clearFieldError('password');
        }}
        secureEntry
        autoCapitalize="none"
        autoComplete="new-password"
        error={fieldErrors.password}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />

      {/* Server-level error */}
      {serverError !== null && (
        <Text style={styles.serverError} accessibilityRole="alert">
          {serverError}
        </Text>
      )}

      {/* Submit */}
      <Button
        title="Create account"
        onPress={handleSubmit}
        loading={registerMutation.isPending}
        disabled={registerMutation.isPending}
        style={styles.ctaButton}
      />

      {/* Already have an account */}
      <TouchableOpacity
        onPress={onLogin}
        accessibilityRole="link"
        accessibilityLabel="Log in to existing account"
        style={styles.loginRow}
      >
        <Text style={styles.loginText}>
          Already have an account?{' '}
          <Text style={styles.loginLink}>Log in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing[3],
  },
  serverError: {
    ...TextStyles.bodySmall,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing[1],
  },
  ctaButton: {
    marginTop: Spacing[1],
  },
  loginRow: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  loginText: {
    ...TextStyles.bodyMedium,
    color: Colors.textSecondary,
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
