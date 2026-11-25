import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { useCashCollected, useRemittances } from '@/modules/finance/finance.queries';
import { fcfa, timeHM } from '@/lib/format';

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function CashScreen() {
  const { data: me } = useMe();
  const collected = useCashCollected();
  const remittances = useRemittances();
  const total = collected.data?.reduce((n, c) => n + c.amount, 0) ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroMeta}>
            {me?.fullName} · Courier · Mvan
          </Text>
          <Text style={styles.heroLabel}>Cash in your hands today</Text>
          <Text style={styles.heroValue}>
            {total.toLocaleString('fr-FR')}
            <Text style={styles.heroUnit}> FCFA</Text>
          </Text>
          <View style={styles.heroPill}>
            <Icon name="clock" size={15} color={Colors.white} />
            <Text style={styles.heroPillText}>Hand it to the Mvan branch counter before 19:00. The agent confirms it in the dashboard.</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Collected today</Text>
        <View style={styles.card}>
          {!collected.data?.length ? (
            <Text style={styles.emptyText}>Nothing collected yet today.</Text>
          ) : (
            collected.data.map((c, i) => (
              <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowIcon}>
                  <Icon name="wallet" size={16} color={Colors.orangeDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.payerName}</Text>
                  <Text style={styles.rowSub}>
                    {c.trackingCode} · {timeHM(c.at)}
                  </Text>
                </View>
                <Text style={styles.rowAmount}>{fcfa(c.amount)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionLabel}>Handed to the branch</Text>
        <View style={styles.card}>
          {remittances.data?.map((r, i) => (
            <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowTitle}>{dayLabel(r.day)}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.rowAmount}>{fcfa(r.amountRemitted)}</Text>
              <View style={[styles.statusPill, r.status !== 'SETTLED' && styles.statusPillWarn]}>
                <Text style={[styles.statusPillText, r.status !== 'SETTLED' && styles.statusPillTextWarn]}>
                  {r.status === 'SETTLED' ? 'Received' : r.status === 'SHORT' ? 'Short' : 'Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, gap: 16 },

  hero: { backgroundColor: Colors.primary, borderRadius: 24, padding: 20, gap: 4 },
  heroMeta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', fontWeight: FontWeight.semibold },
  heroLabel: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.9)', fontWeight: FontWeight.semibold, marginTop: 10 },
  heroValue: { fontSize: 34, fontWeight: FontWeight.extrabold, color: Colors.white, marginTop: 2 },
  heroUnit: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  heroPill: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, padding: 12, marginTop: 14 },
  heroPillText: { flex: 1, fontSize: FontSize.sm, color: Colors.white, lineHeight: 18 },

  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.inkSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 14 },
  emptyText: { fontSize: FontSize.sm, color: Colors.inkSecondary, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  rowSub: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 1 },
  rowAmount: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  statusPill: { backgroundColor: Colors.successLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 10 },
  statusPillWarn: { backgroundColor: Colors.warningLight },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success },
  statusPillTextWarn: { color: Colors.warning },
});
