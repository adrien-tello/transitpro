// Staff · Change password (from Profile). POST /auth/password/change works on the server today.
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useChangePassword } from '../staff.screens.queries';
import { StaffColors, StaffSpace } from '../staff.theme';
import { StaffIcon } from './StaffIcon';
import { PasswordField, PasswordRules, passwordRules } from './PasswordFields';

export function ChangePasswordScreen() {
  const router = useRouter();
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const ok = current.length > 0 && passwordRules(pw, repeat).every((r) => r.ok);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <StaffIcon name="chevron" size={18} color={StaffColors.navy} />
              </View>
            </Pressable>
            <Text style={styles.title}>Change password</Text>
          </View>

          {change.isSuccess ? (
            <View style={styles.done}>
              <StaffIcon name="check" size={22} color={StaffColors.success} />
              <Text style={styles.doneText}>Password changed. Use it next time you log in.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <PasswordField label="Current password" value={current} onChange={setCurrent} autoFocus />
              <PasswordField label="New password" value={pw} onChange={setPw} />
              <PasswordField label="Repeat password" value={repeat} onChange={setRepeat} />
              <PasswordRules pw={pw} repeat={repeat} />
            </View>
          )}

          {change.error && <Text style={styles.error}>{change.error.message}</Text>}
          {change.isSuccess ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.primary}>
              <Text style={styles.primaryText}>Back to profile</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!ok || change.isPending}
              onPress={() => change.mutate({ currentPassword: current, newPassword: pw })}
              style={({ pressed }) => [styles.primary, (!ok || pressed || change.isPending) && { opacity: ok ? 0.8 : 0.5 }]}
            >
              {change.isPending ? <ActivityIndicator color={StaffColors.onDark} /> : <Text style={styles.primaryText}>Save new password</Text>}
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background },
  content: { padding: StaffSpace.side, paddingBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: StaffColors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: StaffColors.navy },
  card: { backgroundColor: StaffColors.surface, borderRadius: 18, padding: 16, paddingTop: 4, marginTop: 16 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: StaffColors.successTint, borderRadius: 16, padding: 16, marginTop: 16 },
  doneText: { flex: 1, color: StaffColors.success, fontSize: 14, fontWeight: '700' },
  error: { color: StaffColors.danger, fontSize: 13, fontWeight: '600', marginTop: 12 },
  primary: { height: 52, borderRadius: 14, backgroundColor: StaffColors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700' },
});
