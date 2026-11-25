import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, type IconName, PersonAvatar } from '@/components/ui';
import { useLogout, useMe } from '@/modules/auth/auth.queries';
import { useCourierStats } from '@/modules/parcels/parcels.queries';
import { ROLE_LABEL } from '@/modules/staff/roles';

export default function StaffProfileScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const logout = useLogout();
  const isCourier = me?.role === 'COURIER';
  const stats = useCourierStats(isCourier);
  const [notifications, setNotifications] = React.useState(true);

  if (!me) return null;

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
          <PersonAvatar name={me.fullName} role={me.role} size={84} />
          <Text style={styles.name}>{me.fullName}</Text>
          <View style={styles.chipRow}>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{ROLE_LABEL[me.role] ?? me.role}</Text>
            </View>
            <View style={styles.agencyChip}>
              <Text style={styles.agencyChipText}>
                {me.agency?.name} · {isCourier ? 'Mvan' : 'Akwa'}
              </Text>
            </View>
          </View>
        </View>

        {isCourier && stats.data && (
          <View style={styles.statsRow}>
            <Stat value={String(stats.data.deliveredThisMonth)} label="Delivered (Nov)" />
            <Stat value={`${stats.data.firstTryPercent}%`} label="First try" />
            <Stat value={String(stats.data.refusedThisMonth)} label="Refused" />
          </View>
        )}

        <View style={styles.card}>
          <Row icon="mail" label="Email" value={me.email} />
          <Row icon="phone" label="Phone" value={maskPhone(me.phone)} border />
          <Row icon="lock" label="Change password" onPress={() => router.push('/(auth)/forgot-password')} border />
        </View>

        <View style={styles.card}>
          <ToggleRow icon="bell" label="Notifications" value={notifications} onChange={setNotifications} />
          <Row icon="globe" label="Language" value="English" border />
          <Row icon="help" label="Help · call my branch" border />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
          <Icon name="out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function maskPhone(phone: string | null) {
  if (!phone) return '—';
  return phone.length > 6 ? `${phone.slice(0, 4)}••••${phone.slice(-2)}` : phone;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress, border }: { icon: IconName; label: string; value?: string; onPress?: () => void; border?: boolean }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={[styles.row, border && styles.rowBorder]} {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={Colors.inkSecondary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      <Icon name="chevronRight" size={16} color={Colors.inkMuted} />
    </Wrap>
  );
}

function ToggleRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={Colors.inkSecondary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.primary, false: Colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, gap: 16 },

  header: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  name: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink, marginTop: 6 },
  chipRow: { flexDirection: 'row', gap: 8 },
  rolePill: { backgroundColor: Colors.orange, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  rolePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.navy },
  agencyChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  agencyChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.inkSecondary },

  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink },
  statLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary, fontWeight: FontWeight.medium },

  card: { backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.ink },
  rowValue: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 18, height: 54 },
  logoutText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.error },
});
