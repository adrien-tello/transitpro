import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useForgotPassword } from '@/modules/auth/auth.queries';

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { mutate: forgot, isPending, error, isSuccess } = useForgotPassword();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  function handleSubmit() {
    if (!email.trim()) { setEmailError('Email is required'); return; }
    if (!isValidEmail(email)) { setEmailError('Enter a valid email'); return; }
    setEmailError('');
    forgot(
      { email: email.trim().toLowerCase() },
      { onSuccess: () => router.push({ pathname: '/(auth)/reset-password' as never, params: { email: email.trim().toLowerCase() } }) },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.logoBox}>
            <Text style={styles.logoT}>T</Text>
            <View style={styles.logoDot} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a 6-digit code to reset your password.
          </Text>

          {error ? <Text style={styles.serverError}>{error.message}</Text> : null}

          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputWrap, emailError ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor={Colors.inkMuted}
            />
          </View>
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={isPending}
          >
            <Text style={styles.submitBtnText}>
              {isPending ? 'Sending…' : 'Send reset code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()}>
            <Text style={styles.backToLoginText}>Back to log in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: Colors.ink, marginTop: -2 },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoT: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: -2 },
  logoDot: {
    position: 'absolute', bottom: 6, right: 7,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.orange,
  },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.ink, marginBottom: 10 },
  subtitle: { fontSize: 15, color: Colors.inkSecondary, lineHeight: 22, marginBottom: 32 },

  serverError: {
    backgroundColor: Colors.errorLight, color: Colors.error,
    borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 16,
  },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.ink, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    backgroundColor: Colors.surface, height: 52, paddingHorizontal: 16, justifyContent: 'center',
  },
  inputError: { borderColor: Colors.error },
  input: { fontSize: 15, color: Colors.ink },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  submitBtn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  backToLogin: { alignItems: 'center' },
  backToLoginText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
