import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useLogin } from '@/modules/auth/auth.queries';

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending, error } = useLogin();
  const [email, setEmail] = useState('marie.ekane@gmail.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof fieldErrors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleLogin() {
    if (!validate()) return;
    login({ email: email.trim().toLowerCase(), password }, {
      onSuccess: () => router.replace('/(customer)/(tabs)/' as never),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Blue hero header */}
        <View style={styles.hero}>
          {/* Decorative large T shapes */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />
          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoT}>T</Text>
                <View style={styles.logoDot} />
              </View>
              <Text style={styles.logoName}>TransitPro</Text>
            </View>
            <TouchableOpacity style={styles.langBtn}>
              <Text style={styles.langText}>EN · FR</Text>
            </TouchableOpacity>
          </View>
          {/* Hero text */}
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Welcome back</Text>
            <Text style={styles.heroSubtitle}>
              Book seats, send parcels and track them across Cameroon.
            </Text>
          </View>
        </View>

        {/* Form area */}
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Google button */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleLabel}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          {error ? <Text style={styles.serverError}>{error.message}</Text> : null}
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={[styles.inputWrap, fieldErrors.email ? styles.inputError : null]}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={Colors.inkMuted}
              placeholder="you@example.com"
            />
          </View>
          {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}

          {/* Password */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Password</Text>
          <View style={[styles.inputWrap, styles.inputWrapRow, fieldErrors.password ? styles.inputError : null]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="current-password"
              placeholderTextColor={Colors.inkMuted}
              placeholder="••••••••••••"
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login CTA */}
          <TouchableOpacity
            style={[styles.loginBtn, isPending && { opacity: 0.7 }]}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={isPending}
          >
            <Text style={styles.loginBtnText}>Log in  →</Text>
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>New here? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },

  // Hero
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    top: -20,
    right: 24,
    width: 140,
    height: 180,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '15deg' }],
  },
  deco2: {
    position: 'absolute',
    top: 60,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoT: { fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: -2 },
  logoDot: {
    position: 'absolute',
    bottom: 5,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  logoName: { fontSize: 18, fontWeight: '700', color: Colors.white },
  langBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  langText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  heroText: {},
  heroTitle: { fontSize: 32, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },

  // Form
  form: { padding: 24, paddingBottom: 40 },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 10,
    marginBottom: 20,
  },
  googleG: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleLabel: { fontSize: 15, fontWeight: '500', color: Colors.ink },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.inkMuted },

  serverError: {
    backgroundColor: Colors.errorLight,
    color: Colors.error,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 12,
  },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.ink, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    height: 52,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  inputWrapRow: { flexDirection: 'row', alignItems: 'center' },
  inputError: { borderColor: Colors.error },
  input: { fontSize: 15, color: Colors.ink, flex: 1 },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 16 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  forgotRow: { alignItems: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },

  loginBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14, color: Colors.inkSecondary },
  registerLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
