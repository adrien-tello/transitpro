import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui';
import type { Me } from '@contracts/api-types';
import { useMyTrip, useReportBreakdown, useSetTripStatus } from './staff.queries';
import { fromNow, greeting, timeHM, weekdayDate } from '@/lib/format';
import { MONO, S, TAB_BAR_SPACE, shadow } from '@/theme/staff';
import { CheckBadge, Initials, Pill, PrimaryButton } from './StaffUI';

// Driver branch name is not on /auth/me yet (only branchId) — same placeholder as before the redesign.
const DRIVER_BRANCH = 'Akwa';
const TRIP_LABEL: Record<string, string> = { SCHEDULED: 'Scheduled', BOARDING: 'Boarding', DEPARTED: 'On the road', ARRIVED: 'Arrived', BROKEN_DOWN: 'Breakdown' };

export function DriverToday({ me }: { me: Me }) {
  const router = useRouter();
  const trip = useMyTrip();
  const breakdown = useReportBreakdown();
  const setStatus = useSetTripStatus(trip.data?.tripId ?? '');
  const t = trip.data;
  const live = t?.status === 'DEPARTED' || t?.status === 'BROKEN_DOWN';
  const allBoarded = !!t && t.passengersBoarded >= t.passengersTotal;

  function reportBreakdown() {
    if (!t) return;
    Alert.alert('Report a breakdown', `Trip ${t.code} will be marked broken down and dispatch is notified.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report breakdown', style: 'destructive', onPress: () => breakdown.mutate({ tripId: t.tripId }) },
    ]);
  }

  const goPassengers = () => t && router.push({ pathname: '/(staff)/trip-passengers', params: { tripId: t.tripId } } as never);
  const goScan = (mode: 'tickets' | 'parcels') => router.push({ pathname: '/(staff)/(tabs)/scan', params: { mode } } as never);
  const goLive = () => router.push('/(staff)/live-trip' as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Initials name={me.fullName} size={44} tone="blue" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerMeta}>
              {weekdayDate()} · Driver · {DRIVER_BRANCH}
            </Text>
            <Text style={styles.headerTitle}>
              {greeting()}, {me.fullName.split(' ')[0]}
            </Text>
          </View>
          {t && (
            <TouchableOpacity style={styles.breakdownBtn} onPress={reportBreakdown} disabled={breakdown.isPending} activeOpacity={0.85}>
              <Icon name="alert" size={14} color={S.red} />
              <Text style={styles.breakdownText}>Breakdown</Text>
            </TouchableOpacity>
          )}
        </View>

        {t ? (
          <TouchableOpacity style={styles.tripCard} activeOpacity={0.92} onPress={live ? goLive : goPassengers}>
            <View style={styles.tripTop}>
              <Text style={styles.tripMeta}>
                <Text style={{ fontWeight: '800', color: S.onBlue }}>Today</Text> · {t.code} · {t.busPlate}
              </Text>
              <Pill label={TRIP_LABEL[t.status] ?? t.status} bg={t.status === 'BROKEN_DOWN' ? S.redSoft : S.orange} color={t.status === 'BROKEN_DOWN' ? S.red : S.ink} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.bigTime}>{timeHM(t.departureAt)}</Text>
              <View style={styles.dash} />
              <Text style={styles.bigTimeRight}>{timeHM(t.arrivalEta)}</Text>
            </View>
            <View style={styles.cityRow}>
              <Text style={styles.city}>{t.originCity}</Text>
              <Text style={styles.city}>{t.destinationCity}</Text>
            </View>
            <View style={styles.tiles}>
              <Progress label="Passengers" done={t.passengersBoarded} total={t.passengersTotal} />
              <Progress label="Parcels" done={t.parcelsLoaded} total={t.parcelsTotal} />
            </View>
          </TouchableOpacity>
        ) : trip.isPending ? null : (
          <View style={[styles.empty, shadow]}>
            <Icon name="cal" size={22} color={S.blue} />
            <Text style={styles.emptyTitle}>No trip scheduled today</Text>
            <Text style={styles.emptyText}>Trips your branch manager schedules for you appear here.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Action icon="scan" label="Scan tickets" bg={S.cream} color={S.brown} onPress={() => goScan('tickets')} />
          <Action icon="box" label="Scan parcels" bg={S.blueSoft} color={S.blue} onPress={() => goScan('parcels')} />
        </View>

        {t && (
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Before departure</Text>
            <CheckLine label="Tyres and lights" meta="Done" done />
            <CheckLine label="Fuel" meta="Checked" done />
            <CheckLine label="Documents on board" meta="Licence, carte grise" done />
            <CheckLine
              label="All passengers scanned"
              done={allBoarded}
              meta={allBoarded ? 'Done' : `${t.passengersTotal - t.passengersBoarded} missing`}
              onPress={goPassengers}
            />
          </View>
        )}

        {t?.status === 'BOARDING' && (
          <PrimaryButton
            title="Start trip · share live location"
            icon="navigate"
            loading={setStatus.isPending}
            onPress={() => setStatus.mutate({ status: 'DEPARTED' }, { onSettled: goLive })}
          />
        )}
        {t && live && <PrimaryButton title={`Live map · ${fromNow(t.arrivalEta)} to arrival`} icon="pin" onPress={goLive} />}

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.min(1, done / total) : 0;
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>
        {done} / {total}
      </Text>
      <View style={styles.tileTrack}>
        <View style={[styles.tileFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

function Action({ icon, label, bg, color, onPress }: { icon: IconName; label: string; bg: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.action, shadow]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={21} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function CheckLine({ label, meta, done, onPress }: { label: string; meta: string; done: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <CheckBadge size={24} tone={done ? 'ok' : 'warn'} />
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={[styles.checkMeta, !done && { color: S.amber, fontWeight: '800' }]}>{meta}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: 18, paddingTop: 14, gap: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerMeta: { fontSize: 13, color: S.ink2, fontWeight: '500' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: S.ink, marginTop: 1, letterSpacing: -0.3 },
  breakdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S.redSoft, borderRadius: 999, paddingHorizontal: 12, height: 34 },
  breakdownText: { fontSize: 12, fontWeight: '800', color: S.red },

  tripCard: { backgroundColor: S.blue, borderRadius: 20, padding: 16, gap: 6 },
  tripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tripMeta: { flex: 1, fontSize: 13, color: S.onBlue2, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  bigTime: { fontFamily: MONO, fontSize: 32, fontWeight: '800', color: S.onBlue, letterSpacing: -1 },
  bigTimeRight: { fontFamily: MONO, fontSize: 24, fontWeight: '800', color: S.onBlue },
  dash: { flex: 1, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)', marginHorizontal: 12 },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  city: { fontSize: 14, color: S.onBlue2 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 8 },
  tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, gap: 3 },
  tileLabel: { fontSize: 12, color: S.onBlue2, fontWeight: '500' },
  tileValue: { fontSize: 18, fontWeight: '800', color: S.onBlue },
  tileTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 3 },
  tileFill: { height: '100%', backgroundColor: S.card, borderRadius: 3 },

  empty: { backgroundColor: S.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: S.ink, marginTop: 4 },
  emptyText: { fontSize: 13, color: S.ink2, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, backgroundColor: S.card, borderRadius: 18, padding: 14, gap: 10 },
  actionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '800', color: S.ink },

  card: { backgroundColor: S.card, borderRadius: 18, padding: 16, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: S.ink, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  checkLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: S.ink },
  checkMeta: { fontSize: 13, color: S.ink2 },
});
