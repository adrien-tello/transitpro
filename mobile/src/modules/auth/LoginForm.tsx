/**
 * LoginForm – email + password form used by the Login screen.
 *
 * Validates locally before calling the mutation.
 * Surfaces ApiError messages inline so the screen stays clean.
 */

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { TextStyles } from '@/theme/typography';
import { Spacing } from '@/theme';
import { ApiError } from '@/lib/api';
import { useLogin } from './auth.queries';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginFormProps {
  onSuccess: () => void;
  onCreateAccount: () => void;
  onGooglePress: () => void;
}

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (email.trim().length === 0) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (password.length === 0) {
    errors.password = 'Password is required.';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginForm({
  onSuccess,
  onCreateAccount,
  onGooglePress,
}: LoginFormProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const loginMutation = useLogin({
    onSuccess,
    onError(err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    },
  });

  function handleSubmit(): void {
    setServerError(null);
    const errors = validate(email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    loginMutation.mutate({ email: email.trim(), password });
  }

  return (
    <View style={styles.container}>
      {/* Email */}
      <Input
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setFieldErrors((prev) => ({ ...prev, email: undefined }));
          setServerError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={fieldErrors.email}
        returnKeyType="next"
      />

      {/* Password */}
      <Input
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setFieldErrors((prev) => ({ ...prev, password: undefined }));
          setServerError(null);
        }}
        secureEntry
        autoCapitalize="none"
        autoComplete="current-password"
        error={fieldErrors.password}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        containerStyle={styles.field}
      />

      {/* Server-level error */}
      {serverError !== null && (
        <Text style={styles.serverError} accessibilityRole="alert">
          {serverError}
        </Text>
      )}

      {/* Submit */}
      <Button
        title="Log in"
        onPress={handleSubmit}
        loading={loginMutation.isPending}
        disabled={loginMutation.isPending}
        style={styles.ctaButton}
      />

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Continue with Google (stub) */}
      <TouchableOpacity
        onPress={onGooglePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={styles.googleButton}
      >
        <Text style={styles.googleIcon}>🔵</Text>
        <Text style={styles.googleLabel}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Create account link */}
      <TouchableOpacity
        onPress={onCreateAccount}
        accessibilityRole="link"
        accessibilityLabel="Create a new account"
        style={styles.createAccountRow}
      >
        <Text style={styles.createAccountText}>
          Don't have an account?{' '}
          <Text style={styles.createAccountLink}>Create one</Text>
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
  field: {
    // gap from container handles spacing
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginVertical: Spacing[1],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...TextStyles.bodySmall,
    color: Colors.textSecondary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  googleIcon: {
    fontSize: 18,
  },
  googleLabel: {
    ...TextStyles.labelLarge,
    color: Colors.textPrimary,
  },
  createAccountRow: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  createAccountText: {
    ...TextStyles.bodyMedium,
    color: Colors.textSecondary,
  },
  createAccountLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
