import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import type { Me } from '@contracts/api-types';
import { useCourierStats, useCourierStops, useParcel } from '@/modules/parcels/parcels.queries';
import { greeting, timeHM, weekdayDate } from '@/lib/format';
import { MONO, S, TAB_BAR_SPACE, amount, shadow } from '@/theme/staff';
import { Initials, Pill } from './StaffUI';

// Courier branch name is not on /auth/me yet (only branchId) — same placeholder as before the redesign.
const COURIER_BRANCH = 'Mvan';

export function CourierToday({ me }: { me: Me }) {
  const router = useRouter();
  const stops = useCourierStops();
  const stats = useCourierStats();
  const next = stops.data?.[0];
  const later = stops.data?.slice(1) ?? [];
  // The list item has no address or seal: read them from the parcel itself for the "Next up" card.
  const nextDetail = useParcel(next?.parcel.trackingCode ?? '', !!next);

  const address = nextDetail.data?.deliveryAddress?.split(',').slice(0, 2).join(',') ?? next?.parcel.to.branch;
  const seal = nextDetail.data?.security.sealNumber;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Initials name={me.fullName} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerMeta}>
              {weekdayDate()} · Courier · {COURIER_BRANCH}
            </Text>
            <Text style={styles.headerTitle}>
              {greeting()}, {me.fullName.split(' ')[0]}
            </Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.85}>
            <Icon name="bell" size={19} color={S.ink} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="Delivered" value={stats.data ? `${stats.data.deliveredToday} / ${stats.data.stopsToday}` : '—'} />
          <Stat label="Refused" value={stats.data ? String(stats.data.refusedToday) : '—'} />
          <Stat label="Cash to remit" value={stats.data ? amount(stats.data.cashToRemitToday) : '—'} />
        </View>

        {/* Next up */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next up</Text>
          {next && (
            <Text style={styles.sectionMeta}>
              Stop {next.stopIndex} of {next.stopsTotal}
            </Text>
          )}
        </View>

        {next ? (
          <View style={styles.nextCard}>
            <View style={styles.decoSquare} />
            <View style={styles.pillRow}>
              <Pill label={next.parcel.homeDelivery ? 'Home delivery' : 'Counter pickup'} bg={S.glass} color={S.onBlue} />
              <Pill label={next.parcel.codAmount ? `Collect ${amount(next.parcel.codAmount)}` : 'Paid'} bg={S.glass} color={S.onBlue} />
            </View>

            <View style={styles.etaRow}>
              <Text style={styles.etaTime}>{timeHM(next.etaAt)}</Text>
              {next.distanceKm != null && (
                <Text style={styles.etaMeta}>
                  →{next.distanceKm} km{next.etaMinutes != null ? ` · ${next.etaMinutes} min` : ''}
                </Text>
              )}
            </View>

            <View style={styles.lineRow}>
              <View style={styles.dotOrange} />
              <Text style={styles.lineText} numberOfLines={1}>
                <Text style={styles.lineStrong}>{next.parcel.receiverName}</Text>
                {address ? `  · ${address}` : ''}
              </Text>
            </View>
            <View style={styles.lineRow}>
              <View style={styles.dotHollow} />
              <Text style={styles.lineMuted} numberOfLines={1}>
                {next.parcel.trackingCode}
                {seal ? ` · seal ${seal}` : ''} · {next.parcel.weightKg} kg
              </Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.navigateBtn} activeOpacity={0.85}>
                <Icon name="navigate" size={17} color={S.onBlue} />
                <Text style={styles.navigateText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startBtn}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(staff)/deliver/[id]', params: { id: next.parcel.trackingCode } } as never)}
              >
                <Text style={styles.startText}>Start delivery</Text>
                <Icon name="arrowRight" size={17} color={S.ink} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          </View>
        ) : stops.isPending ? null : (
          <View style={[styles.emptyCard, shadow]}>
            <Icon name="check" size={22} color={S.green} />
            <Text style={styles.emptyTitle}>All deliveries done</Text>
            <Text style={styles.emptyText}>Parcels handed to you for delivery appear here.</Text>
          </View>
        )}

        {/* Later today */}
        {later.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Later today</Text>
              <Text style={styles.seeAll}>See all</Text>
            </View>
            {later.map((s) => (
              <TouchableOpacity
                key={s.parcel.id}
                style={[styles.laterCard, shadow]}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(staff)/deliver/[id]', params: { id: s.parcel.trackingCode } } as never)}
              >
                <View style={styles.timeChip}>
                  <Text style={styles.timeChipText}>{timeHM(s.etaAt)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.laterTitle} numberOfLines={1}>
                    {s.parcel.to.branch}
                  </Text>
                  <Text style={styles.laterSub} numberOfLines={1}>
                    Receiver: {s.parcel.receiverName}
                  </Text>
                </View>
                {s.parcel.codAmount ? <Pill label={`Collect ${amount(s.parcel.codAmount)}`} bg={S.cream} color={S.brown} style={{ alignSelf: 'center' }} /> : null}
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.stat, shadow]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: 18, paddingTop: 14, gap: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMeta: { fontSize: 13, color: S.ink2, fontWeight: '500' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: S.ink, marginTop: 1, letterSpacing: -0.3 },
  bellBtn: { width: 42, height: 42, borderRadius: 13, backgroundColor: S.card, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: S.card, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, gap: 2 },
  statLabel: { fontSize: 12, color: S.ink2, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '800', color: S.ink },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: S.ink },
  sectionMeta: { fontSize: 13, color: S.ink2 },
  seeAll: { fontSize: 13, fontWeight: '700', color: S.blue },

  nextCard: { backgroundColor: S.blue, borderRadius: 22, padding: 18, gap: 10, overflow: 'hidden' },
  decoSquare: { position: 'absolute', top: -26, right: -26, width: 96, height: 96, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.10)' },
  pillRow: { flexDirection: 'row', gap: 8 },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 },
  etaTime: { fontFamily: MONO, fontSize: 36, fontWeight: '800', color: S.onBlue, letterSpacing: -1 },
  etaMeta: { fontSize: 14, color: S.onBlue2, fontWeight: '600' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dotOrange: { width: 8, height: 8, borderRadius: 4, backgroundColor: S.orange },
  dotHollow: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: S.onBlue2 },
  lineText: { flex: 1, fontSize: 14, color: S.onBlue2 },
  lineStrong: { fontWeight: '800', color: S.onBlue },
  lineMuted: { flex: 1, fontSize: 13, color: S.onBlue2 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  navigateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
  navigateText: { fontSize: 15, fontWeight: '800', color: S.onBlue },
  startBtn: { flex: 1.35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 50, borderRadius: 14, backgroundColor: S.orange },
  startText: { fontSize: 15, fontWeight: '800', color: S.ink },

  emptyCard: { backgroundColor: S.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: S.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: S.ink2, textAlign: 'center' },

  laterCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: S.card, borderRadius: 16, padding: 12 },
  timeChip: { backgroundColor: S.tile, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  timeChipText: { fontFamily: MONO, fontSize: 14, fontWeight: '700', color: S.ink },
  laterTitle: { fontSize: 15, fontWeight: '800', color: S.ink },
  laterSub: { fontSize: 13, color: S.ink2, marginTop: 2 },
});
