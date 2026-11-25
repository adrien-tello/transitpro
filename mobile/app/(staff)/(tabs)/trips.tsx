import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { useMySchedule, useMyTrip } from '@/modules/staff/staff.queries';
import { timeHM } from '@/lib/format';
import { MONO, S, TAB_BAR_SPACE, shadow } from '@/theme/staff';
import { Pill, SectionCaps } from '@/modules/staff/StaffUI';
import type { DriverScheduleTrip, DriverTripView } from '@contracts/api-types';

// Driver branch name is not on /auth/me yet (only branchId) — same placeholder as before the redesign.
const DRIVER_BRANCH = 'Akwa';
const TZ = 'Africa/Douala';
const STATUS_LABEL: Record<DriverTripView['status'], string> = {
  SCHEDULED: 'Scheduled',
  BOARDING: 'Boarding',
  DEPARTED: 'On the road',
  ARRIVED: 'Arrived',
  BROKEN_DOWN: 'Breakdown',
};

const weekday = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short' });
const dayNum = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric' });

export default function MyTripsScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const trip = useMyTrip();
  const schedule = useMySchedule();
  const [tab, setTab] = useState<'upcoming' | 'done'>('upcoming');

  const today = trip.data && trip.data.status !== 'ARRIVED' ? trip.data : null;
  const upcoming = schedule.data?.upcoming ?? [];
  const done = schedule.data?.done ?? [];
  const upcomingCount = upcoming.length + (today ? 1 : 0);

  function openToday() {
    if (!today) return;
    const live = today.status === 'DEPARTED' || today.status === 'BROKEN_DOWN';
    if (live) router.push('/(staff)/live-trip' as never);
    else router.push({ pathname: '/(staff)/trip-passengers', params: { tripId: today.tripId } } as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.meta}>
            {me?.fullName} · Driver · {DRIVER_BRANCH}
          </Text>
          <Text style={styles.title}>My trips</Text>
        </View>

        <View style={styles.segment}>
          <SegmentBtn label={`Upcoming · ${upcomingCount}`} active={tab === 'upcoming'} onPress={() => setTab('upcoming')} />
          <SegmentBtn label="Done" active={tab === 'done'} onPress={() => setTab('done')} />
        </View>

        {tab === 'upcoming' ? (
          <>
            {today && (
              <TouchableOpacity style={styles.todayCard} activeOpacity={0.9} onPress={openToday}>
                <View style={styles.todayTop}>
                  <Text style={styles.todayMeta}>
                    <Text style={{ fontWeight: '800', color: S.onBlue }}>Today</Text> · {today.code} · {today.busPlate}
                  </Text>
                  <Pill label={STATUS_LABEL[today.status]} bg={today.status === 'BROKEN_DOWN' ? S.redSoft : S.orange} color={today.status === 'BROKEN_DOWN' ? S.red : S.ink} />
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.bigTime}>{timeHM(today.departureAt)}</Text>
                  <View style={styles.dash} />
                  <Text style={styles.bigTimeRight}>{timeHM(today.arrivalEta)}</Text>
                </View>
                <View style={styles.cityRow}>
                  <Text style={styles.city}>{today.originCity}</Text>
                  <Text style={styles.city}>{today.destinationCity}</Text>
                </View>
                <View style={styles.chipRow}>
                  <Pill label={`${today.passengersBoarded} / ${today.passengersTotal} passengers`} bg={S.glass} color={S.onBlue} />
                  <Pill label={`${today.parcelsLoaded} parcels`} bg={S.glass} color={S.onBlue} />
                </View>
              </TouchableOpacity>
            )}

            {upcoming.length > 0 && (
              <>
                <SectionCaps>Next days</SectionCaps>
                {upcoming.map((t) => (
                  <UpcomingRow key={t.tripId} t={t} />
                ))}
              </>
            )}

            {!today && upcoming.length === 0 && !trip.isPending && !schedule.isPending && (
              <Empty text="Trips your branch manager schedules for you appear here." />
            )}

            {done.length > 0 && (
              <>
                <SectionCaps>Last trips</SectionCaps>
                <DoneList trips={done.slice(0, 3)} />
              </>
            )}
          </>
        ) : done.length > 0 ? (
          <DoneList trips={done} />
        ) : (
          !schedule.isPending && <Empty text="Trips you have finished appear here." />
        )}

        <View style={{ height: TAB_BAR_SPACE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SegmentBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.segBtn, active && styles.segBtnOn]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.segText, active && styles.segTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

function UpcomingRow({ t }: { t: DriverScheduleTrip }) {
  return (
    <View style={[styles.upRow, shadow]}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{weekday(t.departureAt)}</Text>
        <Text style={styles.dateNum}>{dayNum(t.departureAt)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.route} numberOfLines={1}>
          {t.originCity} → {t.destinationCity}
        </Text>
        <Text style={styles.routeSub} numberOfLines={1}>
          {t.code} · {t.busPlate} · {t.seats} seats
        </Text>
      </View>
      <Text style={styles.upTime}>{timeHM(t.departureAt)}</Text>
    </View>
  );
}

function DoneList({ trips }: { trips: DriverScheduleTrip[] }) {
  return (
    <View style={[styles.doneCard, shadow]}>
      {trips.map((t, i) => {
        const late = (t.delayMinutes ?? 0) > 0;
        return (
          <View key={t.tripId} style={[styles.doneRow, i > 0 && styles.doneBorder]}>
            <Text style={styles.doneRoute} numberOfLines={1}>
              {t.originCity} → {t.destinationCity}
            </Text>
            <Text style={styles.doneDate}>
              {weekday(t.departureAt)} {dayNum(t.departureAt)}
            </Text>
            <Text style={[styles.doneStatus, { color: late ? S.amber : S.greenText }]}>{late ? `+${t.delayMinutes} min` : 'On time'}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={[styles.empty, shadow]}>
      <Icon name="bus" size={24} color={S.ink3} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  meta: { fontSize: 13, color: S.ink2, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: S.ink, letterSpacing: -0.5, marginTop: 2 },

  segment: { flexDirection: 'row', backgroundColor: '#E4E8EF', borderRadius: 999, padding: 4 },
  segBtn: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: S.card, ...shadow },
  segText: { fontSize: 14, fontWeight: '700', color: S.ink2 },
  segTextOn: { color: S.ink, fontWeight: '800' },

  todayCard: { backgroundColor: S.blue, borderRadius: 20, padding: 16, gap: 6 },
  todayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  todayMeta: { flex: 1, fontSize: 13, color: S.onBlue2, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  bigTime: { fontFamily: MONO, fontSize: 32, fontWeight: '800', color: S.onBlue, letterSpacing: -1 },
  bigTimeRight: { fontFamily: MONO, fontSize: 24, fontWeight: '800', color: S.onBlue },
  dash: { flex: 1, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)', marginHorizontal: 12 },
  cityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  city: { fontSize: 14, color: S.onBlue2 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },

  upRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: S.card, borderRadius: 18, padding: 12 },
  dateBox: { width: 48, height: 52, borderRadius: 12, backgroundColor: S.tile, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 12, color: S.ink2, fontWeight: '600' },
  dateNum: { fontSize: 20, fontWeight: '800', color: S.ink, marginTop: -1 },
  route: { fontSize: 16, fontWeight: '800', color: S.ink },
  routeSub: { fontSize: 13, color: S.ink2, marginTop: 2 },
  upTime: { fontFamily: MONO, fontSize: 16, fontWeight: '800', color: S.ink },

  doneCard: { backgroundColor: S.card, borderRadius: 18, paddingHorizontal: 14 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  doneBorder: { borderTopWidth: 1, borderTopColor: S.line },
  doneRoute: { flex: 1, fontSize: 15, fontWeight: '800', color: S.ink },
  doneDate: { fontSize: 13, color: S.ink2 },
  doneStatus: { fontSize: 13, fontWeight: '800', minWidth: 54, textAlign: 'right' },

  empty: { backgroundColor: S.card, borderRadius: 18, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: S.ink2, textAlign: 'center' },
});
