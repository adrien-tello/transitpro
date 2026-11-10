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
import { useRegister } from '@/modules/auth/auth.queries';

function isValidEmail(s: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()); }

export default function RegisterScreen() {
  const router = useRouter();
  const { mutate: register, isPending, error } = useRegister();
  const [fullName, setFullName] = useState('Marie Ekane');
  const [email, setEmail] = useState('marie.ekane@gmail.com');
  const [phone, setPhone] = useState('+237 6 77 18 18 90');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!isValidEmail(email)) e.email = 'Invalid email';
    if (!phone.trim()) e.phone = 'Required';
    if (!password) e.password = 'Required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    if (!accepted) e.terms = 'You must accept the terms';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    register(
      { fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password },
      { onSuccess: () => router.replace('/(customer)/(tabs)/' as never) },
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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>It takes less than a minute.</Text>

          {/* Google button */}
          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.85}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleLabel}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {error ? <Text style={styles.serverError}>{error.message}</Text> : null}

          {/* Fields */}
          {([
            { key: 'fullName', label: 'Full name', value: fullName, set: setFullName, kbType: 'default' as const, autoCapitalize: 'words' as const, placeholder: 'Marie Ekane', secure: false },
            { key: 'email', label: 'Email', value: email, set: setEmail, kbType: 'email-address' as const, autoCapitalize: 'none' as const, placeholder: 'marie.ekane@gmail.com', secure: false },
            { key: 'phone', label: 'Phone number', value: phone, set: setPhone, kbType: 'phone-pad' as const, autoCapitalize: 'none' as const, placeholder: '+237 6 77 00 00 00', secure: false },
            { key: 'password', label: 'Password', value: password, set: setPassword, kbType: 'default' as const, autoCapitalize: 'none' as const, placeholder: 'At least 8 characters', secure: true },
          ]).map(f => (
            <View key={f.key} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[styles.inputWrap, f.secure && styles.inputWrapRow, fieldErrors[f.key] ? styles.inputError : null]}>
                <TextInput
                  style={[styles.input, f.secure && { flex: 1 }]}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType={f.kbType}
                  autoCapitalize={f.autoCapitalize}
                  secureTextEntry={f.secure && !showPw}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.inkMuted}
                />
                {f.secure && (
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
                )}
              </View>
              {fieldErrors[f.key] ? <Text style={styles.fieldError}>{fieldErrors[f.key]}</Text> : null}
            </View>
          ))}

          <Text style={styles.smsHint}>Your phone gets parcel codes and trip reminders by SMS.</Text>

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAccepted(v => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.termsText}>
              I accept the{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy policy</Text>
            </Text>
          </TouchableOpacity>
          {fieldErrors.terms ? <Text style={styles.fieldError}>{fieldErrors.terms}</Text> : null}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.createBtn, isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={isPending}
          >
            <Text style={styles.createBtnText}>Create account</Text>
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Log in</Text>
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

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: Colors.ink, marginTop: -2 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoT: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: -2 },
  logoDot: {
    position: 'absolute',
    bottom: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },

  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  title: { fontSize: 28, fontWeight: '800', color: Colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.inkSecondary, marginBottom: 28 },

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

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
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

  fieldGroup: { marginBottom: 16 },
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
  eyeBtn: { padding: 8 },
  inputError: { borderColor: Colors.error },
  input: { fontSize: 15, color: Colors.ink },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  smsHint: { fontSize: 12, color: Colors.inkMuted, marginBottom: 16 },

  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 14, color: Colors.ink },
  termsLink: { color: Colors.primary, fontWeight: '600' },

  createBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  createBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: Colors.inkSecondary },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
