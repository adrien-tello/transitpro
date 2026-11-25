import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon } from '@/components/ui';
import { useAcceptInvite, useInvitePreview } from '@/modules/hr/hr.queries';
import { ApiError } from '@/lib/api';
import { ROLE_LABEL } from '@/modules/staff/roles';

export default function InviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const invite = useInvitePreview(token ?? '');
  const accept = useAcceptInvite(token ?? '');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hoursLeft = invite.data ? Math.max(0, Math.round((new Date(invite.data.expiresAt).getTime() - Date.now()) / 3_600_000)) : null;
  const checks = useMemo(
    () => ({
      length: password.length >= 8,
      number: /\d/.test(password),
      match: password.length > 0 && password === repeat,
    }),
    [password, repeat],
  );
  const canSubmit = checks.length && checks.number && checks.match && !accept.isPending;

  async function submit() {
    if (!canSubmit || !token) return;
    setError(null);
    try {
      await accept.mutateAsync({ password });
      router.replace('/(staff)/(tabs)/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not set your password. Try again.');
    }
  }

  if (invite.isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (invite.isError || !invite.data) {
    return (
      <SafeAreaView style={styles.loading}>
        <Icon name="alert" size={28} color={Colors.error} />
        <Text style={styles.errorTitle}>This invite link is not valid</Text>
        <Text style={styles.errorText}>It may have expired or already been used. Ask your agency to send a new one.</Text>
      </SafeAreaView>
    );
  }
  const inv = invite.data;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <SafeAreaView style={styles.header} edges={['top']}>
          <View style={styles.headerTopRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoT}>T</Text>
              <View style={styles.logoDot} />
            </View>
            {hoursLeft != null && <Text style={styles.expiresText}>Invite expires in {hoursLeft}h</Text>}
          </View>

          <View style={styles.agencyRow}>
            <View style={styles.agencyAvatar}>
              <Text style={styles.agencyAvatarText}>{inv.agencyInitials}</Text>
            </View>
            <View>
              <Text style={styles.invitedBy}>{inv.agencyName} invited you</Text>
              <Text style={styles.welcome}>Welcome, {inv.fullName.split(' ')[0]}</Text>
            </View>
          </View>

          <View style={styles.pillRow}>
            <View style={styles.pillOrange}>
              <Text style={styles.pillOrangeText}>{ROLE_LABEL[inv.role] ?? inv.role}</Text>
            </View>
            {inv.branchName && (
              <View style={styles.pillLight}>
                <Text style={styles.pillLightText}>{inv.branchName}</Text>
              </View>
            )}
            <View style={styles.pillLight}>
              <Text style={styles.pillLightText}>Added by {inv.invitedBy}</Text>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.body}>
          <Text style={styles.title}>Set your password</Text>
          <Text style={styles.subtitle}>You will use it to log in on the normal login screen.</Text>

          <View style={styles.emailBox}>
            <Icon name="mail" size={16} color={Colors.inkSecondary} />
            <View>
              <Text style={styles.emailLabel}>Your login email</Text>
              <Text style={styles.emailValue}>{inv.email}</Text>
            </View>
          </View>

          <Text style={styles.label}>New password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••••••" placeholderTextColor={Colors.inkMuted} />

          <Text style={[styles.label, { marginTop: 16 }]}>Repeat password</Text>
          <TextInput style={styles.input} value={repeat} onChangeText={setRepeat} secureTextEntry placeholder="••••••••••••" placeholderTextColor={Colors.inkMuted} />

          <View style={styles.checklist}>
            <CheckItem ok={checks.length} text="At least 8 characters" />
            <CheckItem ok={checks.number} text="Contains a number" />
            <CheckItem ok={checks.match} text="Both passwords match" />
          </View>

          {error && <Text style={styles.serverError}>{error}</Text>}

          <TouchableOpacity style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]} disabled={!canSubmit} onPress={submit}>
            {accept.isPending ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitBtnText}>Set password and start</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={styles.footLink}>
              Not you? <Text style={{ color: Colors.primary, fontWeight: FontWeight.bold }}>Tell your agency</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CheckItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.checkItem}>
      <View style={[styles.checkDot, ok && styles.checkDotOk]}>{ok && <Icon name="check" size={11} color={Colors.white} />}</View>
      <Text style={[styles.checkText, ok && { color: Colors.ink }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, gap: 10, padding: 32 },
  errorTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 8 },
  errorText: { fontSize: FontSize.sm, color: Colors.inkSecondary, textAlign: 'center' },

  header: { backgroundColor: Colors.primary, padding: 20, paddingBottom: 24, gap: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  logoT: { fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: -2 },
  logoDot: { position: 'absolute', bottom: 5, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.orange },
  expiresText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.orange },

  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  agencyAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  agencyAvatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.primary },
  invitedBy: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  welcome: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.white, marginTop: 2 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillOrange: { backgroundColor: Colors.orange, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillOrangeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.navy },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillLightText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },

  body: { padding: 20, gap: 4, flex: 1 },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink },
  subtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginBottom: 16 },

  emailBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 18 },
  emailLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  emailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink },

  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.ink, marginBottom: 6 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, fontSize: FontSize.base, color: Colors.ink },

  checklist: { marginTop: 16, gap: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkDotOk: { backgroundColor: Colors.success, borderColor: Colors.success },
  checkText: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  serverError: { fontSize: FontSize.sm, color: Colors.error, marginTop: 14, textAlign: 'center' },

  submitBtn: { marginTop: 24, height: 56, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  footLink: { fontSize: FontSize.sm, color: Colors.inkSecondary },
});
