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
import { useRegister } from '@/modules/auth/auth.queries';

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function isValidPhone(s: string) {
  return /^\+?[0-9]{9,15}$/.test(s.trim());
}

interface Fields {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

type FieldErrors = Partial<Record<keyof Fields, string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending, error } = useRegister();

  const [fields, setFields] = useState<Fields>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function set(key: keyof Fields) {
    return (val: string) => setFields(f => ({ ...f, [key]: val }));
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!fields.fullName.trim()) errors.fullName = 'Full name is required';
    if (!fields.email.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(fields.email)) errors.email = 'Enter a valid email address';
    if (!fields.phone.trim()) errors.phone = 'Phone number is required';
    else if (!isValidPhone(fields.phone)) errors.phone = 'Enter a valid phone number';
    if (!fields.password) errors.password = 'Password is required';
    else if (fields.password.length < 8) errors.password = 'At least 8 characters required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    register(
      {
        fullName: fields.fullName.trim(),
        email: fields.email.trim().toLowerCase(),
        phone: fields.phone.trim(),
        password: fields.password,
      },
      { onSuccess: () => router.replace('/(customer)/(tabs)/') },
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.logoArea}>
              <View style={styles.logoIcon}>
                <Text style={styles.logoEmoji}>🚌</Text>
              </View>
              <Text style={styles.logoName}>TransitPro</Text>
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={[Typography.h3, styles.cardTitle]}>Create account</Text>
            <Text style={[Typography.bodySm, styles.cardSubtitle]}>
              Book tickets and track parcels
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error.message}</Text>
              </View>
            ) : null}

            <Input
              label="Full name"
              placeholder="Marie Ekane"
              autoCapitalize="words"
              autoComplete="name"
              value={fields.fullName}
              onChangeText={set('fullName')}
              error={fieldErrors.fullName}
            />
            <Input
              label="Email"
              placeholder="marie@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={fields.email}
              onChangeText={set('email')}
              error={fieldErrors.email}
            />
            <Input
              label="Phone number"
              placeholder="+237677000000"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={fields.phone}
              onChangeText={set('phone')}
              error={fieldErrors.phone}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              autoComplete="new-password"
              value={fields.password}
              onChangeText={set('password')}
              error={fieldErrors.password}
            />

            <Button
              title="Create account"
              onPress={handleSubmit}
              loading={isPending}
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Sign in</Text>
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

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 18 },
  logoName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.ink },

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

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: { color: Colors.inkSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
});
