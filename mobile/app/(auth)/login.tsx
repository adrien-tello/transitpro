import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useLogin } from '@/modules/auth/auth.queries';

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    login(
      { email: email.trim().toLowerCase(), password },
      {
        onSuccess: () => router.replace('/(customer)/(tabs)/'),
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🚌</Text>
            </View>
            <Text style={styles.logoName}>TransitPro</Text>
            <Text style={styles.tagline}>Travel smarter across Cameroon</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={[Typography.h3, styles.cardTitle]}>Welcome back</Text>
            <Text style={[Typography.bodySm, styles.cardSubtitle]}>
              Sign in to your account
            </Text>

            {/* Server-level error */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error.message}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="marie@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
            />

            <Button
              title="Sign in"
              onPress={handleSubmit}
              loading={isPending}
              style={styles.submitBtn}
            />

            {/* Google stub */}
            <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
              <Text style={styles.googleBtnText}>🇬  Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  logoName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.ink,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: { marginBottom: 4 },
  cardSubtitle: { marginBottom: 20 },

  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: Colors.error, fontSize: FontSize.sm },

  submitBtn: { marginTop: 4 },

  googleBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.ink },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { color: Colors.inkSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});
