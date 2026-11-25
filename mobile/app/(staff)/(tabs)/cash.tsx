import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { useCashCollected, useRemittances } from '@/modules/finance/finance.queries';
import { timeHM } from '@/lib/format';
import { MONO, S, TAB_BAR_SPACE, amount, shadow } from '@/theme/staff';
import { Pill, SectionCaps } from '@/modules/staff/StaffUI';

// Courier branch name is not on /auth/me yet (only branchId) — same placeholder as before the redesign.
const COURIER_BRANCH = 'Mvan';

function dayLabel(iso: string) {
  const d = new Date(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function CashScreen() {
  const { data: me } = useMe();
  const collected = useCashCollected();
  const remittances = useRemittances();
  const total = collected.data?.reduce((n, c) => n + c.amount, 0) ?? 0;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} showsVerticalScrollIndicator={false}>
        <SafeAreaView style={styles.hero} edges={['top']}>
          <View style={styles.deco} />
          <Text style={styles.heroMeta}>
            {me?.fullName} · Courier · {COURIER_BRANCH}
          </Text>
          <Text style={styles.heroLabel}>Cash in your hands today</Text>
          <Text style={styles.heroValue}>
            {amount(total)}
            <Text style={styles.heroUnit}> FCFA</Text>
          </Text>
          <View style={styles.notice}>
            <Icon name="clock" size={17} color={S.orange} />
            <Text style={styles.noticeText}>
              Hand it to the {COURIER_BRANCH} branch counter before 19:00. The agent confirms it in the dashboard.
            </Text>
          </View>
        </SafeAreaView>

        <View style={styles.body}>
          <SectionCaps>Collected today</SectionCaps>
          <View style={[styles.card, shadow]}>
            {!collected.data?.length ? (
              <Text style={styles.emptyText}>Nothing collected yet today.</Text>
            ) : (
              collected.data.map((c, i) => (
                <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={styles.rowIcon}>
                    <Icon name="wallet" size={18} color={S.brown} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{c.payerName}</Text>
                    <Text style={styles.rowSub}>
                      {c.trackingCode} · {timeHM(c.at)}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{amount(c.amount)}</Text>
                </View>
              ))
            )}
          </View>

          <SectionCaps>Handed to the branch</SectionCaps>
          <View style={[styles.card, shadow]}>
            {!remittances.data?.length ? (
              <Text style={styles.emptyText}>Nothing handed in yet.</Text>
            ) : (
              remittances.data.map((r, i) => {
                const ok = r.status === 'SETTLED';
                return (
                  <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <Text style={[styles.rowTitle, { flex: 1 }]}>{dayLabel(r.day)}</Text>
                    <Text style={styles.rowAmount}>{amount(r.amountRemitted)}</Text>
                    <Pill
                      label={ok ? 'Received' : r.status === 'SHORT' ? 'Short' : 'Pending'}
                      bg={ok ? S.greenSoft : S.amberSoft}
                      color={ok ? S.greenText : S.amber}
                      style={{ alignSelf: 'center', marginLeft: 10 }}
                    />
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: S.bg },

  hero: { backgroundColor: S.blue, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  deco: { position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: 26, borderWidth: 16, borderColor: 'rgba(255,255,255,0.08)' },
  heroMeta: { fontSize: 13, color: S.onBlue2, fontWeight: '500', marginTop: 14 },
  heroLabel: { fontSize: 16, color: S.onBlue, fontWeight: '800', marginTop: 8 },
  heroValue: { fontSize: 40, fontWeight: '800', color: S.onBlue, letterSpacing: -1 },
  heroUnit: { fontSize: 16, fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 14, padding: 12, marginTop: 12 },
  noticeText: { flex: 1, fontSize: 13, color: S.onBlue, lineHeight: 18 },

  body: { padding: 16, gap: 10 },
  card: { backgroundColor: S.card, borderRadius: 18, paddingHorizontal: 14, marginBottom: 8 },
  emptyText: { fontSize: 13, color: S.ink2, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: S.line },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: S.cream, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '800', color: S.ink },
  rowSub: { fontFamily: MONO, fontSize: 12, color: S.ink2, marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: '800', color: S.ink },
});
