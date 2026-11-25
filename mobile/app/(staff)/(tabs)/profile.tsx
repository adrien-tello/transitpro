import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { useLogout, useMe } from '@/modules/auth/auth.queries';
import { useCourierStats } from '@/modules/parcels/parcels.queries';
import { ROLE_LABEL } from '@/modules/staff/roles';
import { S, TAB_BAR_SPACE, shadow } from '@/theme/staff';
import { Initials } from '@/modules/staff/StaffUI';

// Branch names are not on /auth/me yet (only branchId) — same placeholders as before the redesign.
const BRANCH: Record<string, string> = { COURIER: 'Mvan', DRIVER: 'Akwa' };
const MONTH = new Date().toLocaleDateString('en-GB', { month: 'short' });

export default function StaffProfileScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();
  const isCourier = me?.role === 'COURIER';
  const stats = useCourierStats(isCourier);
  const [notifications, setNotifications] = React.useState(true);

  if (!me) return null;
  const branch = BRANCH[me.role];

  function confirmLogout() {
    Alert.alert('Log out', 'You will need your email and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout.mutate(undefined, { onSettled: () => router.replace('/(auth)/login') }) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarShadow}>
            <Initials name={me.fullName} size={92} ring />
          </View>
          <Text style={styles.name}>{me.fullName}</Text>
          <View style={styles.chipRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{ROLE_LABEL[me.role] ?? me.role}</Text>
            </View>
            {me.agency && (
              <View style={styles.agencyChip}>
                <Text style={styles.agencyChipText}>
                  {me.agency.name}
                  {branch ? ` · ${branch}` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isCourier && stats.data && (
          <View style={styles.statsRow}>
            <Stat value={String(stats.data.deliveredThisMonth)} label={`Delivered (${MONTH})`} />
            <Stat value={`${stats.data.firstTryPercent}%`} label="First try" />
            <Stat value={String(stats.data.refusedThisMonth)} label="Refused" />
          </View>
        )}

        <View style={[styles.card, shadow]}>
          <Row icon="mail" label="Email" value={me.email} />
          <Row icon="phone" label="Phone" value={maskPhone(me.phone)} border />
          <Row icon="lock" label="Change password" onPress={() => router.push('/(auth)/forgot-password')} border />
        </View>

        <View style={[styles.card, shadow]}>
          <Row icon="bell" label="Notifications" value={notifications ? 'On' : 'Off'} onPress={() => setNotifications((v) => !v)} />
          <Row icon="globe" label="Language" value="English" border />
          <Row icon="help" label="Help · call my branch" border onPress={() => Linking.openURL('tel:')} />
        </View>

        <TouchableOpacity style={[styles.logoutBtn, shadow]} onPress={confirmLogout} activeOpacity={0.8}>
          <Icon name="out" size={19} color={S.red} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// "+237 6 90 00 33 12" → "6•• •• 33 12": enough to recognise the number, not enough to copy it.
function maskPhone(phone: string | null) {
  if (!phone) return '—';
  const local = phone.replace(/\D/g, '').replace(/^237/, '');
  if (local.length < 6) return phone;
  return `${local[0]}•• •• ${local.slice(-4, -2)} ${local.slice(-2)}`;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.stat, shadow]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress, border }: { icon: IconName; label: string; value?: string; onPress?: () => void; border?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, border && styles.rowBorder]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={18} color={S.ink} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Icon name="chevronRight" size={17} color={S.ink3} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 12 },

  header: { alignItems: 'center', gap: 8, marginBottom: 2 },
  avatarShadow: { borderRadius: 50, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 4 },
  name: { fontSize: 22, fontWeight: '800', color: S.ink, marginTop: 6, letterSpacing: -0.3 },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rolePill: { backgroundColor: S.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  rolePillText: { fontSize: 12, fontWeight: '800', color: S.ink },
  agencyChip: { backgroundColor: S.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: S.border },
  agencyChipText: { fontSize: 12, fontWeight: '600', color: S.ink },

  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: S.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: S.ink },
  statLabel: { fontSize: 12, color: S.ink2, fontWeight: '500' },

  card: { backgroundColor: S.card, borderRadius: 18, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: S.line },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: S.iconTile, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '800', color: S.ink },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, color: S.ink2 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: S.card, borderRadius: 18, height: 56 },
  logoutText: { fontSize: 16, fontWeight: '800', color: S.red },
});
