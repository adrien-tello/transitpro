// Courier · Cash to remit (design picture "Courier · Cash"). No endpoint yet (Finance will add one):
// mocks show the design values, the real app explains the totals are not available yet.
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Me } from '@contracts/api-types';
import { useCourierCash } from '../staff.screens.queries';
import { useMyParcels } from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatMoney, formatTime, isSameDay } from '../staff.format';
import { StaffIcon } from './StaffIcon';
import { EmptyState, ErrorState, SkeletonBlock } from './StaffStates';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Yesterday", or "Fri 30 Oct"
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (isSameDay(iso, y)) return 'Yesterday';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function CashScreen({ me }: { me: Me }) {
  const cash = useCourierCash();
  const parcels = useMyParcels();
  const branch = parcels.data?.[0]?.to.branch;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={cash.isRefetching} onRefresh={() => cash.refetch()} tintColor={StaffColors.onDark} />}
      >
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <Text style={styles.kicker}>{[me.fullName, 'Courier', branch].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.label}>Cash in your hands today</Text>
            <Text style={styles.amount}>
              {cash.data ? formatMoney(cash.data.inHand) : '–'}
              <Text style={styles.currency}> FCFA</Text>
            </Text>
            <View style={styles.note}>
              <StaffIcon name="clock" size={18} color={StaffColors.accent} />
              <Text style={styles.noteText}>
                Hand it to the {branch ?? 'branch'} counter
                {cash.data ? ` before ${cash.data.remitBefore}` : ' at the end of the day'}. The agent confirms it in the
                dashboard.
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.pad}>
          {cash.isPending ? (
            <>
              <SkeletonBlock height={130} />
              <SkeletonBlock height={170} style={{ marginTop: 16 }} />
            </>
          ) : cash.isError ? (
            <ErrorState message={cash.error.message} onRetry={() => cash.refetch()} retrying={cash.isRefetching} />
          ) : !cash.data ? (
            <EmptyState
              icon="wallet"
              title="Cash totals are not available yet"
              text="Hand the cash you collected to your branch at the end of the day. This page fills in when Finance adds it."
            />
          ) : (
            <>
              <Text style={styles.section}>COLLECTED TODAY</Text>
              {cash.data.collected.length === 0 ? (
                <EmptyState icon="wallet" title="No cash collected today" text="Cash on delivery you collect shows here." />
              ) : (
                <View style={styles.card}>
                  {cash.data.collected.map((c, i) => (
                    <View key={c.trackingCode} style={[styles.row, i < cash.data!.collected.length - 1 && styles.divider]}>
                      <View style={styles.iconTile}>
                        <StaffIcon name="wallet" size={18} color={StaffColors.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{c.receiverName}</Text>
                        <Text style={styles.code}>
                          {c.trackingCode} · {formatTime(c.at)}
                        </Text>
                      </View>
                      <Text style={styles.money}>{formatMoney(c.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.section}>HANDED TO THE BRANCH</Text>
              {cash.data.remitted.length === 0 ? (
                <EmptyState icon="wallet" title="Nothing handed yet" text="Cash you hand to the branch shows here." />
              ) : (
                <View style={styles.card}>
                  {cash.data.remitted.map((r, i) => (
                    <View key={r.date} style={[styles.row, i < cash.data!.remitted.length - 1 && styles.divider]}>
                      <Text style={[styles.name, { flex: 1 }]}>{dayLabel(r.date)}</Text>
                      <Text style={styles.money}>{formatMoney(r.amount)}</Text>
                      <View style={[styles.tag, r.status === 'PENDING' && { backgroundColor: StaffColors.warningTint }]}>
                        <Text style={[styles.tagText, r.status === 'PENDING' && { color: StaffColors.warning }]}>
                          {r.status === 'RECEIVED' ? 'Received' : 'Waiting'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.background },
  pad: { paddingHorizontal: StaffSpace.side, paddingTop: 6 },
  header: {
    backgroundColor: StaffColors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: StaffSpace.side,
    paddingBottom: 20,
  },
  kicker: { color: StaffColors.onPrimaryMuted, fontSize: 12, fontWeight: '600', marginTop: 12 },
  label: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700', marginTop: 14 },
  amount: { color: StaffColors.onDark, fontSize: 40, fontWeight: '800', marginTop: 2 },
  currency: { fontSize: 16, fontWeight: '700', color: StaffColors.onPrimaryMuted },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: StaffColors.heroTile,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  noteText: { flex: 1, color: StaffColors.onDark, fontSize: 13, lineHeight: 19 },

  section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: StaffColors.muted, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: StaffColors.surface, borderRadius: 16, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  iconTile: { width: 36, height: 36, borderRadius: 10, backgroundColor: StaffColors.warningTint, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  code: { fontFamily: monoFont, fontSize: 12, color: StaffColors.muted, marginTop: 2 },
  money: { fontSize: 15, fontWeight: '800', color: StaffColors.navy },
  tag: { backgroundColor: StaffColors.successTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: StaffColors.success, fontSize: 12, fontWeight: '700' },
});
