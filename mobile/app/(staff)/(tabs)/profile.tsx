import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import { useLogout, useMe } from '@/modules/auth/auth.queries';
import { useCourierStats } from '@/modules/parcels/parcels.queries';
import { ROLE_LABEL } from '@/modules/staff/roles';
import { S, TAB_BAR_SPACE, shadow } from '@/theme/staff';
import { Initials } from '@/modules/staff/StaffUI';

// Branch is not on /auth/me (only branchId), so we use the same placeholder map as before.
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
    Alert.alert(
      'Log out',
      'You will need your email and password to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () =>
            logout.mutate(undefined, {
              onSettled: () => router.replace('/(auth)/login'),
            }),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + name + role pill + agency chip ── */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Initials name={me.fullName} size={88} ring />
          </View>
          <Text style={styles.name}>{me.fullName}</Text>
          <View style={styles.chipRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {ROLE_LABEL[me.role] ?? me.role}
              </Text>
            </View>
            {me.agency && (
              <Text style={styles.agencyText}>
                {me.agency.name}
                {branch ? ` · ${branch}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* ── Courier stats row ── */}
        {isCourier && stats.data && (
          <View style={styles.statsRow}>
            <StatTile
              value={String(stats.data.deliveredThisMonth)}
              label={`Delivered (${MONTH})`}
            />
            <StatTile
              value={`${stats.data.firstTryPercent}%`}
              label="First try"
            />
            <StatTile
              value={String(stats.data.refusedThisMonth)}
              label="Refused"
            />
          </View>
        )}

        {/* ── Account section ── */}
        <View style={[styles.card, shadow]}>
          <Row
            icon="mail"
            label="Email"
            value={truncateEmail(me.email)}
            onPress={() => {}}
          />
          <Row
            icon="phone"
            label="Phone"
            value={maskPhone(me.phone)}
            onPress={() => {}}
            border
          />
          <Row
            icon="lock"
            label="Change password"
            onPress={() => router.push('/(auth)/forgot-password')}
            border
          />
        </View>

        {/* ── Preferences section ── */}
        <View style={[styles.card, shadow]}>
          <Row
            icon="bell"
            label="Notifications"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: S.border, true: S.blue }}
                thumbColor={S.card}
                style={styles.switch}
              />
            }
          />
          <Row icon="globe" label="Language" value="English" onPress={() => {}} border />
          <Row
            icon="help"
            label="Help · call my branch"
            onPress={() => Linking.openURL('tel:')}
            border
          />
        </View>

        {/* ── Log out ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, shadow]}
          onPress={confirmLogout}
          activeOpacity={0.8}
        >
          <Icon name="out" size={18} color={S.red} strokeWidth={2} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** "bernard.atangana@etoile.test" → "b.atangana@…" */
function truncateEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const short = local.length > 10 ? local.slice(0, 10) + '…' : local;
  return `${short}@…`;
}

/** "+237 6 90 00 33 12" → "6•• •• 33 12" */
function maskPhone(phone: string | null): string {
  if (!phone) return '—';
  const local = phone.replace(/\D/g, '').replace(/^237/, '');
  if (local.length < 6) return phone;
  return `${local[0]}•••• ${local.slice(-4, -2)} ${local.slice(-2)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.stat, shadow]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  right,
  onPress,
  border,
}: {
  icon: IconName;
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  border?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      {/* Left icon tile */}
      <View style={styles.iconTile}>
        <Icon name={icon} size={17} color={S.ink} strokeWidth={1.9} />
      </View>

      {/* Label */}
      <Text style={styles.rowLabel}>{label}</Text>

      {/* Right side: custom node, string value, or nothing */}
      {right ? (
        right
      ) : value !== undefined ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Chevron — only when there's an action and no custom right node */}
      {!right && (
        <Icon name="chevronRight" size={16} color={S.ink3} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 24, gap: 14 },

  // Header
  header: { alignItems: 'center', gap: 10, marginBottom: 4 },
  avatarWrap: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: S.ink,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rolePill: {
    backgroundColor: S.orange,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  rolePillText: { fontSize: 12, fontWeight: '800', color: '#7C3800' },
  agencyText: { fontSize: 13, fontWeight: '600', color: S.ink2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: S.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: S.ink2, fontWeight: '500', textAlign: 'center' },

  // Card
  card: { backgroundColor: S.card, borderRadius: 18, paddingHorizontal: 16 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: S.line },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: S.iconTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: S.ink },
  rowValue: { fontSize: 14, color: S.ink2, maxWidth: 130, textAlign: 'right' },

  // Switch
  switch: { marginRight: -4 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: S.card,
    borderRadius: 18,
    height: 56,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: S.red },
});
