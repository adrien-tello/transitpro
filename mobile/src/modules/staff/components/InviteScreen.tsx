// Invite · set password (design picture "Invite · set password"). Opened from the SMS / email link
// transitpro://invite/<token>. Staff accounts only come from HR invites: nobody can sign up as staff.
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { InvitePreview, Role } from '@contracts/api-types';
import { useAcceptInvite, useInvite } from '../staff.screens.queries';
import { StaffColors, StaffSpace } from '../staff.theme';
import { StaffIcon } from './StaffIcon';
import { ErrorState, SkeletonBlock } from './StaffStates';
import { PasswordField, PasswordRules, passwordRules } from './PasswordFields';

const ROLE_LABEL: Partial<Record<Role, string>> = { DRIVER: 'Driver', COURIER: 'Courier' };

function hoursLeft(expiresAt: string): number {
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 3_600_000);
}

export function InviteScreen({ token }: { token: string }) {
  const invite = useInvite(token);

  if (invite.isPending) {
    return (
      <View style={styles.root}>
        <SkeletonBlock height={260} style={{ borderRadius: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} />
        <View style={styles.pad}>
          <SkeletonBlock height={300} />
        </View>
      </View>
    );
  }
  if (invite.isError) {
    const gone = invite.error.status === 404 || invite.error.status === 410;
    return (
      <SafeAreaView style={[styles.root, styles.pad]}>
        <ErrorState
          message={gone ? 'This invite link is not valid or was already used. Ask your agency for a new one.' : invite.error.message}
          onRetry={() => invite.refetch()}
          retrying={invite.isRefetching}
        />
      </SafeAreaView>
    );
  }
  return <InviteForm token={token} invite={invite.data} />;
}

function InviteForm({ token, invite }: { token: string; invite: InvitePreview }) {
  const accept = useAcceptInvite(token);
  const [pw, setPw] = useState('');
  const [repeat, setRepeat] = useState('');
  const ok = passwordRules(pw, repeat).every((r) => r.ok);
  const hours = hoursLeft(invite.expiresAt);
  const expired = hours < 0;
  const firstName = invite.fullName.split(' ')[0];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topRow}>
              <View style={styles.logo}>
                <Text style={styles.logoT}>T</Text>
                <View style={styles.logoDot} />
              </View>
              <Text style={styles.expires}>{expired ? 'Invite expired' : `Invite expires in ${hours} h`}</Text>
            </View>
            <View style={styles.agencyRow}>
              <View style={styles.agencyTile}>
                <Text style={styles.agencyInitials}>{invite.agencyInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.invited}>{invite.agencyName} invited you</Text>
                <Text style={styles.welcome}>Welcome, {firstName}</Text>
              </View>
            </View>
            <View style={styles.chips}>
              <View style={[styles.chip, styles.chipRole]}>
                <Text style={[styles.chipText, { color: StaffColors.amberInk }]}>{ROLE_LABEL[invite.role] ?? invite.role}</Text>
              </View>
              {invite.branchName && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{invite.branchName} branch</Text>
                </View>
              )}
              <View style={styles.chip}>
                <Text style={styles.chipText}>Added by {invite.invitedBy}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.pad}>
          <Text style={styles.title}>Set your password</Text>
          <Text style={styles.sub}>You will use it to log in on the normal login screen.</Text>

          <View style={styles.emailBox}>
            <StaffIcon name="mail" size={18} color={StaffColors.body} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emailLabel}>Your login email</Text>
              <Text style={styles.email} numberOfLines={1}>
                {invite.email}
              </Text>
            </View>
          </View>

          <PasswordField label="New password" value={pw} onChange={setPw} />
          <PasswordField label="Repeat password" value={repeat} onChange={setRepeat} />
          <PasswordRules pw={pw} repeat={repeat} />

          {expired && <Text style={styles.error}>This invite has expired. Ask your agency for a new one.</Text>}
          {accept.error && <Text style={styles.error}>{accept.error.message}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={!ok || expired || accept.isPending}
            onPress={() => accept.mutate({ password: pw, invite })}
            style={({ pressed }) => [styles.primary, (!ok || expired || pressed || accept.isPending) && { opacity: ok && !expired ? 0.8 : 0.5 }]}
          >
            {accept.isPending ? <ActivityIndicator color={StaffColors.onDark} /> : <Text style={styles.primaryText}>Set password and start</Text>}
          </Pressable>
          <Text style={styles.footer}>
            Not you? <Text style={styles.footerStrong}>Tell your agency</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.surface },
  pad: { paddingHorizontal: StaffSpace.side, paddingTop: 20 },
  header: {
    backgroundColor: StaffColors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: StaffSpace.side,
    paddingBottom: 20,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  logo: { width: 36, height: 36, borderRadius: 10, backgroundColor: StaffColors.surface, alignItems: 'center', justifyContent: 'center' },
  logoT: { fontSize: 20, fontWeight: '800', color: StaffColors.primary },
  logoDot: { position: 'absolute', right: 7, top: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: StaffColors.accent },
  expires: { color: StaffColors.accent, fontSize: 12, fontWeight: '700' },
  agencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  agencyTile: { width: 52, height: 52, borderRadius: 14, backgroundColor: StaffColors.warningTint, alignItems: 'center', justifyContent: 'center' },
  agencyInitials: { fontSize: 18, fontWeight: '800', color: StaffColors.warning },
  invited: { color: StaffColors.onPrimaryMuted, fontSize: 13 },
  welcome: { color: StaffColors.onDark, fontSize: 22, fontWeight: '800', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { backgroundColor: StaffColors.heroTile, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipRole: { backgroundColor: StaffColors.accent },
  chipText: { color: StaffColors.onDark, fontSize: 12, fontWeight: '700' },

  title: { fontSize: 18, fontWeight: '800', color: StaffColors.navy },
  sub: { fontSize: 13, color: StaffColors.muted, marginTop: 4 },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: StaffColors.chip,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  emailLabel: { fontSize: 11, color: StaffColors.muted, fontWeight: '600' },
  email: { fontSize: 14, color: StaffColors.navy, fontWeight: '700', marginTop: 1 },
  error: { color: StaffColors.danger, fontSize: 13, fontWeight: '600', marginTop: 12 },
  primary: { height: 52, borderRadius: 14, backgroundColor: StaffColors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryText: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700' },
  footer: { fontSize: 13, color: StaffColors.muted, textAlign: 'center', marginTop: 14 },
  footerStrong: { color: StaffColors.primary, fontWeight: '700' },
});
