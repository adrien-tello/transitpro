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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useResetPassword } from '@/modules/auth/auth.queries';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { mutate: reset, isPending, error } = useResetPassword();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ code?: string; password?: string }>({});

  function validate() {
    const e: typeof fieldErrors = {};
    if (!code.trim() || !/^\d{6}$/.test(code.trim())) e.code = 'Enter the 6-digit code from your email';
    if (!password) e.password = 'Required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    // AuthGate handles routing after the cookie is set
    reset({ email: email ?? '', code: code.trim(), password });
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

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code we sent to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {error ? <Text style={styles.serverError}>{error.message}</Text> : null}

          {/* Code */}
          <Text style={styles.fieldLabel}>6-digit code</Text>
          <View style={[styles.inputWrap, fieldErrors.code ? styles.inputError : null]}>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={Colors.inkMuted}
            />
          </View>
          {fieldErrors.code ? <Text style={styles.fieldError}>{fieldErrors.code}</Text> : null}

          {/* New password */}
          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>New password</Text>
          <View style={[styles.inputWrap, styles.inputWrapRow, fieldErrors.password ? styles.inputError : null]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.inkMuted}
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

          <TouchableOpacity
            style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.9}
            disabled={isPending}
          >
            <Text style={styles.submitBtnText}>
              {isPending ? 'Resetting…' : 'Set new password'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: Colors.ink, marginTop: -2 },
  logoBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  logoT: { fontSize: 22, fontWeight: '900', color: Colors.white, marginTop: -2 },
  logoDot: {
    position: 'absolute', bottom: 6, right: 7,
    width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.orange,
  },

  body: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.ink, marginBottom: 10 },
  subtitle: { fontSize: 15, color: Colors.inkSecondary, lineHeight: 22, marginBottom: 32 },
  emailHighlight: { color: Colors.ink, fontWeight: '600' },

  serverError: {
    backgroundColor: Colors.errorLight, color: Colors.error,
    borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 16,
  },

  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.ink, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    backgroundColor: Colors.surface, height: 52, paddingHorizontal: 16, justifyContent: 'center',
  },
  inputWrapRow: { flexDirection: 'row', alignItems: 'center' },
  inputError: { borderColor: Colors.error },
  input: { fontSize: 15, color: Colors.ink },
  codeInput: { letterSpacing: 8, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  eyeBtn: { padding: 8 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  submitBtn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
