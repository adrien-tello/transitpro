// Staff · Profile (design picture "Staff · Profile"), shared by drivers and couriers.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Me } from '@contracts/api-types';
import { authKeys, useLogout } from '@/modules/auth/auth.queries';
import { pickTodayTrip, useDriverTrips, useMyParcels } from '../staff.queries';
import { useStaffStats } from '../staff.screens.queries';
import { STAFF_PREVIEW_ON } from '../use-staff-me';
import { StaffColors, StaffSpace } from '../staff.theme';
import { initials } from '../staff.format';
import { StaffIcon, type StaffIconName } from './StaffIcon';
import { ConfirmDialog } from './ConfirmDialog';

// "+237690003312" → "6•• •• 33 12": enough to recognise it, not enough to copy it.
function maskPhone(phone: string | null): string {
  if (!phone) return 'Not set';
  const local = phone.replace(/\D/g, '').slice(-9);
  if (local.length < 9) return '•••';
  return `${local[0]}•• •• ${local.slice(5, 7)} ${local.slice(7, 9)}`;
}

// Branch name: /auth/me only has the branch id, so it comes from today's work.
function useBranchName(me: Me): string | undefined {
  const isDriver = me.role === 'DRIVER';
  const trips = useDriverTrips();
  const parcels = useMyParcels();
  if (isDriver) return trips.data ? pickTodayTrip(trips.data)?.originBranch : undefined;
  return parcels.data?.[0]?.to.branch;
}

export function ProfileScreen({ me }: { me: Me }) {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useLogout();
  const stats = useStaffStats(me.role);
  const branch = useBranchName(me);
  const [notifications, setNotifications] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const roleLabel = me.role === 'DRIVER' ? 'Driver' : 'Courier';

  function doLogout() {
    setConfirmLogout(false);
    if (STAFF_PREVIEW_ON) {
      // Preview has no server session: just forget the preview user.
      qc.setQueryData(authKeys.me, null);
      qc.clear();
      return;
    }
    logout.mutate();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(me.fullName)}</Text>
        </View>
        <Text style={styles.name}>{me.fullName}</Text>
        <View style={styles.chips}>
          <View style={[styles.chip, styles.chipRole]}>
            <Text style={[styles.chipText, { color: StaffColors.amberInk }]}>{roleLabel}</Text>
          </View>
          {me.agency && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{[me.agency.name, branch].filter(Boolean).join(' · ')}</Text>
            </View>
          )}
        </View>

        {stats.data && (
          <View style={styles.stats}>
            {stats.data.items.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.group}>
          <SettingRow icon="mail" label="Email" value={me.email} />
          <SettingRow icon="device" label="Phone" value={maskPhone(me.phone)} />
          <SettingRow
            icon="lock"
            label="Change password"
            onPress={() => router.push('/(staff)/password' as never)}
            last
          />
        </View>

        <View style={styles.group}>
          <SettingRow
            icon="bell"
            label="Notifications"
            value={notifications ? 'On' : 'Off'}
            onPress={() => setNotifications((v) => !v)}
          />
          <SettingRow icon="globe" label="Language" value="English" />
          <SettingRow icon="help" label="Help · call my branch" value="Soon" last />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={logout.isPending}
          onPress={() => setConfirmLogout(true)}
          style={({ pressed }) => [styles.logout, (pressed || logout.isPending) && { opacity: 0.75 }]}
        >
          {logout.isPending ? (
            <ActivityIndicator color={StaffColors.danger} />
          ) : (
            <>
              <StaffIcon name="logout" size={18} color={StaffColors.danger} />
              <Text style={styles.logoutText}>Log out</Text>
            </>
          )}
        </Pressable>
        {logout.isError && <Text style={styles.error}>{logout.error.message}</Text>}
        <Text style={styles.version}>TransitPro Staff · version {Constants.expoConfig?.version ?? '–'}</Text>
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You will need your email and password to come back."
        confirmLabel="Log out"
        danger
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: StaffIconName;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowIcon}>
        <StaffIcon name={icon} size={18} color={StaffColors.body} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      {onPress && <StaffIcon name="chevron" size={16} color={StaffColors.hint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background },
  content: { paddingHorizontal: StaffSpace.side, paddingTop: 20, paddingBottom: 120, alignItems: 'stretch' },
  avatar: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: StaffColors.warningTint,
    borderWidth: 4,
    borderColor: StaffColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: StaffColors.navy,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: StaffColors.warning },
  name: { fontSize: 20, fontWeight: '800', color: StaffColors.navy, textAlign: 'center', marginTop: 12 },
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: StaffColors.surface,
    borderWidth: 1,
    borderColor: StaffColors.line,
  },
  chipRole: { backgroundColor: StaffColors.accent, borderColor: StaffColors.accent },
  chipText: { fontSize: 12, fontWeight: '700', color: StaffColors.body },

  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, backgroundColor: StaffColors.surface, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: StaffColors.navy },
  statLabel: { fontSize: 11, color: StaffColors.muted, marginTop: 2, textAlign: 'center' },

  group: { backgroundColor: StaffColors.surface, borderRadius: 16, paddingHorizontal: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: StaffColors.chip, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  rowValue: { fontSize: 13, color: StaffColors.muted, maxWidth: '45%' },

  logout: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: StaffColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutText: { color: StaffColors.danger, fontSize: 15, fontWeight: '700' },
  error: { color: StaffColors.danger, fontSize: 13, textAlign: 'center', marginTop: 8 },
  version: { fontSize: 12, color: StaffColors.hint, textAlign: 'center', marginTop: 16 },
});
