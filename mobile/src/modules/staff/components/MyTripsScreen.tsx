// Driver · My trips (design picture "Driver · My trips"). Data: GET /booking/trips/driver (mock for now).
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Me } from '@contracts/api-types';
import type { DriverTrip } from '../staff.types';
import { pickTodayTrip, useDriverTrips } from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatTime, isSameDay } from '../staff.format';
import { EmptyState, ErrorState, SkeletonBlock } from './StaffStates';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LAST_SHOWN = 3;

const STATUS_LABEL: Record<DriverTrip['status'], string> = {
  SCHEDULED: 'Scheduled',
  BOARDING: 'Boarding',
  DEPARTED: 'On the road',
  ARRIVED: 'Arrived',
  CANCELLED: 'Cancelled',
};


export function MyTripsScreen({ me }: { me: Me }) {
  const router = useRouter();
  const trips = useDriverTrips();
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming');

  const all = trips.data ?? [];
  const today = pickTodayTrip(all);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcoming = all
    .filter((t) => t !== today && t.status !== 'ARRIVED' && t.status !== 'CANCELLED' && new Date(t.departureAt) >= startOfToday)
    .sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  const done = all
    .filter((t) => t.status === 'ARRIVED' || t.status === 'CANCELLED')
    .sort((a, b) => b.departureAt.localeCompare(a.departureAt));
  const upcomingCount = upcoming.length + (today ? 1 : 0);
  const branch = today?.originBranch ?? upcoming[0]?.originBranch;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} tintColor={StaffColors.primary} />}
      >
        <Text style={styles.kicker}>{[me.fullName, 'Driver', branch].filter(Boolean).join(' · ')}</Text>
        <Text style={styles.h1}>My trips</Text>

        <View style={styles.segment}>
          <SegmentItem label={`Upcoming · ${upcomingCount}`} active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
          <SegmentItem label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
        </View>

        {trips.isPending ? (
          <>
            <SkeletonBlock height={140} style={{ marginTop: 14 }} />
            <SkeletonBlock height={160} style={{ marginTop: 14 }} />
          </>
        ) : trips.isError ? (
          <ErrorState message={trips.error.message} onRetry={() => trips.refetch()} retrying={trips.isRefetching} />
        ) : tab === 'upcoming' ? (
          <>
            {today && <TodayCard trip={today} onPress={() => router.navigate('/(staff)/(tabs)' as never)} />}
            {upcoming.length > 0 && (
              <>
                <Text style={styles.section}>NEXT DAYS</Text>
                <View style={{ gap: 8 }}>
                  {upcoming.map((t) => (
                    <NextRow key={t.id} trip={t} />
                  ))}
                </View>
              </>
            )}
            {!today && upcoming.length === 0 && (
              <EmptyState icon="bus" title="No trips planned" text="Your branch manager assigns trips." />
            )}
            {done.length > 0 && (
              <>
                <Text style={styles.section}>LAST TRIPS</Text>
                <LastList trips={done.slice(0, LAST_SHOWN)} />
              </>
            )}
          </>
        ) : done.length === 0 ? (
          <EmptyState icon="bus" title="No trips done yet" text="Finished trips appear here." />
        ) : (
          <View style={{ marginTop: 14 }}>
            <LastList trips={done} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentItem({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segItem, active && styles.segActive]}
    >
      <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TodayCard({ trip, onPress }: { trip: DriverTrip; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.hero, pressed && { opacity: 0.9 }]}>
      <View style={styles.heroTop}>
        <Text style={styles.heroCode} numberOfLines={1}>
          Today · {trip.code} · {trip.busPlate}
        </Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{STATUS_LABEL[trip.status]}</Text>
        </View>
      </View>
      <View style={styles.timesRow}>
        <View>
          <Text style={styles.time}>{formatTime(trip.departureAt)}</Text>
          <Text style={styles.city}>
            {trip.originCity}, {trip.originBranch}
          </Text>
        </View>
        <View style={styles.dashes}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.timeSmall}>{formatTime(trip.arrivalEta)}</Text>
          <Text style={styles.city}>{trip.destinationCity}</Text>
        </View>
      </View>
      <View style={styles.heroChips}>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>
            {trip.passengers.boarded} / {trip.passengers.sold} passengers
          </Text>
        </View>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipText}>{trip.parcels.total} parcels</Text>
        </View>
      </View>
    </Pressable>
  );
}

function NextRow({ trip }: { trip: DriverTrip }) {
  const d = new Date(trip.departureAt);
  return (
    <View style={styles.card}>
      <View style={styles.dateTile}>
        <Text style={styles.dateDay}>{DAYS[d.getDay()]}</Text>
        <Text style={styles.dateNum}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.route}>
          {trip.originCity} → {trip.destinationCity}
        </Text>
        <Text style={styles.meta}>
          {trip.code} · {trip.busPlate} · {trip.passengers.sold} seats sold
        </Text>
      </View>
      <Text style={styles.nextTime}>{formatTime(trip.departureAt)}</Text>
    </View>
  );
}

function LastList({ trips }: { trips: DriverTrip[] }) {
  return (
    <View style={styles.lastCard}>
      {trips.map((t, i) => {
        const d = new Date(t.departureAt);
        // "On time / +12 min" needs the real arrival time, which DriverTrip does not have: show the status.
        const result = { label: STATUS_LABEL[t.status], late: t.status === 'CANCELLED' };
        return (
          <View key={t.id} style={[styles.lastRow, i < trips.length - 1 && styles.divider]}>
            <Text style={styles.lastRoute} numberOfLines={1}>
              {t.originCity} → {t.destinationCity}
            </Text>
            <Text style={styles.lastDate}>
              {isSameDay(t.departureAt) ? 'Today' : `${DAYS[d.getDay()]} ${d.getDate()}`}
            </Text>
            <Text style={[styles.lastResult, { color: result.late ? StaffColors.warning : StaffColors.success }]}>
              {result.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background },
  content: { paddingHorizontal: StaffSpace.side, paddingTop: 12, paddingBottom: 120 },
  kicker: { fontSize: 12, color: StaffColors.muted, fontWeight: '600' },
  h1: { fontSize: 24, fontWeight: '800', color: StaffColors.navy, marginTop: 2 },

  segment: { flexDirection: 'row', backgroundColor: StaffColors.line, borderRadius: 14, padding: 4, marginTop: 14 },
  segItem: { flex: 1, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segActive: { backgroundColor: StaffColors.surface },
  segText: { fontSize: 14, fontWeight: '700', color: StaffColors.muted },
  segTextActive: { color: StaffColors.navy },

  hero: { backgroundColor: StaffColors.primary, borderRadius: StaffSpace.heroRadius, padding: 16, marginTop: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroCode: { flex: 1, color: StaffColors.onDark, fontSize: 13, fontWeight: '600' },
  pill: { backgroundColor: StaffColors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: StaffColors.amberInk, fontSize: 12, fontWeight: '700' },
  timesRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  time: { color: StaffColors.onDark, fontSize: 28, fontWeight: '700', fontFamily: monoFont },
  timeSmall: { color: StaffColors.onDark, fontSize: 18, fontWeight: '700', fontFamily: monoFont },
  city: { color: StaffColors.onPrimaryMuted, fontSize: 12, marginTop: 2 },
  dashes: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginBottom: 10 },
  dash: { width: 5, height: 1.5, borderRadius: 1, backgroundColor: StaffColors.onPrimaryMuted },
  heroChips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroChip: { backgroundColor: StaffColors.heroTile, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  heroChipText: { color: StaffColors.onDark, fontSize: 12, fontWeight: '700' },

  section: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: StaffColors.muted, marginTop: 20, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: StaffColors.surface,
    borderRadius: 16,
    padding: 12,
  },
  dateTile: { width: 44, height: 48, borderRadius: 12, backgroundColor: StaffColors.chip, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 11, color: StaffColors.muted, fontWeight: '600' },
  dateNum: { fontSize: 17, color: StaffColors.navy, fontWeight: '800' },
  route: { fontSize: 15, fontWeight: '700', color: StaffColors.navy },
  meta: { fontSize: 12, color: StaffColors.muted, marginTop: 2 },
  nextTime: { fontFamily: monoFont, fontSize: 15, fontWeight: '700', color: StaffColors.navy },

  lastCard: { backgroundColor: StaffColors.surface, borderRadius: 16, paddingHorizontal: 14 },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  lastRoute: { flex: 1, fontSize: 14, fontWeight: '600', color: StaffColors.navy },
  lastDate: { fontSize: 12, color: StaffColors.muted },
  lastResult: { fontSize: 12, fontWeight: '800', minWidth: 54, textAlign: 'right' },
});
