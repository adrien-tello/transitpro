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
import Svg, { Path, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useLogin, useGoogleAuth } from '@/modules/auth/auth.queries';
import { Icon } from '@/components/ui';

// Real four-color Google "G" (same mark as the web app's sign-in button), replacing the
// plain blue letter that stood in for it before.
function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const { mutate: login, isPending, error } = useLogin();
  const { promptAsync: promptGoogle, isPending: googlePending, error: googleError } = useGoogleAuth();
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
    // AuthGate in _layout.tsx reads `me` and routes to the right group by role.
    // We just need the mutation to succeed; the gate does the navigation.
    login({ email: email.trim().toLowerCase(), password });
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
          <TouchableOpacity
            style={[styles.googleBtn, googlePending && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={() => promptGoogle()}
            disabled={googlePending}
          >
            <GoogleLogo />
            <Text style={styles.googleLabel}>{googlePending ? 'Signing in…' : 'Continue with Google'}</Text>
          </TouchableOpacity>
          {googleError ? <Text style={styles.serverError}>{googleError.message}</Text> : null}

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
              {showPw ? (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <Line x1="1" y1="1" x2="23" y2="23" />
                </Svg>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
          {fieldErrors.password ? <Text style={styles.fieldError}>{fieldErrors.password}</Text> : null}

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password' as never)}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login CTA */}
          <TouchableOpacity
            style={[styles.loginBtn, isPending && { opacity: 0.7 }]}
            onPress={handleLogin}
            activeOpacity={0.9}
            disabled={isPending}
          >
            <Text style={styles.loginBtnText}>{isPending ? 'Signing in…' : 'Log in'}</Text>
            {!isPending && <Icon name="arrowRight" size={18} color={Colors.white} />}
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
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  forgotRow: { alignItems: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 14, color: Colors.primary, fontWeight: '500' },

  loginBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14, color: Colors.inkSecondary },
  registerLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
