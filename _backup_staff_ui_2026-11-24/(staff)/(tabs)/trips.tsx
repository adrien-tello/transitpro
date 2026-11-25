import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon } from '@/components/ui';
import { useMyTrip, useReportBreakdown, useSetTripStatus, useShareLocation } from '@/modules/staff/staff.queries';
import { fromNow, timeHM } from '@/lib/format';

// The driver's "Trips" tab: today's trip, or — once started — the live map it shares with
// customers. GPS is read every 30 s with expo-location and sent to /fleet/trips/:id/location
// (not built yet: useShareLocation no-ops on 501, same convention as the rest of the app).
export default function TripsScreen() {
  const router = useRouter();
  const trip = useMyTrip();
  const setStatus = useSetTripStatus(trip.data?.tripId ?? '');
  const breakdown = useReportBreakdown();
  const shareLocation = useShareLocation(trip.data?.tripId ?? '');
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [sharing, setSharing] = useState(false);

  const live = trip.data?.status === 'DEPARTED' || trip.data?.status === 'BROKEN_DOWN';

  useEffect(() => {
    let alive = true;
    if (!live || !trip.data) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !alive) return;
      watchRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 50 }, (pos) => {
        if (!alive) return;
        setSharing(true);
        shareLocation.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    })();
    return () => {
      alive = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, trip.data?.tripId]);

  function reportBreakdown() {
    if (!trip.data) return;
    Alert.alert('Report a breakdown', 'Dispatch and the branch manager are notified at once.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => breakdown.mutate({ tripId: trip.data!.tripId }) },
    ]);
  }

  function arrivedAtStop() {
    if (!trip.data) return;
    const isLastStop = trip.data.currentStopIndex >= trip.data.stops.length - 2;
    if (isLastStop) {
      setStatus.mutate({ status: 'ARRIVED' }, { onSuccess: () => router.replace('/(staff)/(tabs)/') });
    } else {
      Alert.alert('Stop confirmed', `${trip.data.destinationCity}: on to the next stop.`);
    }
  }

  if (!trip.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Icon name="bus" size={28} color={Colors.inkMuted} />
          <Text style={styles.emptyTitle}>No trip right now</Text>
          <Text style={styles.emptyText}>Your today's trip and live map appear here once you have one scheduled.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!live) {
    // Boarding, not started yet: a quiet summary — the real CTA ("Start trip") lives on Today.
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.summaryScroll}>
          <Text style={styles.summaryTitle}>
            {trip.data.code} · {trip.data.originCity} → {trip.data.destinationCity}
          </Text>
          <Text style={styles.summaryMeta}>
            {timeHM(trip.data.departureAt)} – {timeHM(trip.data.arrivalEta)} · {trip.data.busPlate}
          </Text>
          <View style={styles.summaryBadge}>
            <Icon name="clock" size={16} color={Colors.primary} />
            <Text style={styles.summaryBadgeText}>Not started — start it from the Today tab</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const nextStop = trip.data.stops[trip.data.currentStopIndex + 1] ?? trip.data.stops[trip.data.stops.length - 1]!;
  const progress = (trip.data.currentStopIndex + 1) / (trip.data.stops.length - 1);

  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.mapTop} edges={['top']}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => router.push('/(staff)/(tabs)/')}>
          <Icon name="chevronLeft" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <View style={styles.sharingPill}>
          <View style={styles.liveDot} />
          <Text style={styles.sharingText}>{sharing ? 'Sharing live location' : 'Connecting…'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <View style={styles.map}>
        <RouteArt progress={progress} />
        {trip.data.stops.map((s, i) => (
          <Text key={s.city} style={[styles.mapLabel, mapLabelPos(i, trip.data!.stops.length)]}>
            {s.city}
          </Text>
        ))}
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetTopRow}>
          <View>
            <Text style={styles.sheetSmall}>Next stop · {nextStop.city}</Text>
            <Text style={styles.sheetBig}>{trip.data.nextStopEtaMinutes != null ? `in ${trip.data.nextStopEtaMinutes} min` : fromNow(trip.data.arrivalEta)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.sheetSmall}>Arrival</Text>
            <Text style={styles.sheetBig}>{timeHM(trip.data.arrivalEta)}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>
            {trip.data.originCity} {timeHM(trip.data.departureAt)}
          </Text>
          <Text style={styles.progressLabel}>{nextStop.city}</Text>
          <Text style={styles.progressLabel}>{trip.data.destinationCity}</Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric label="On board" value={String(trip.data.passengersBoarded)} />
          <Metric label="Parcels" value={String(trip.data.parcelsLoaded)} />
          <Metric label="Speed" value={trip.data.speedKmh != null ? `${trip.data.speedKmh} km/h` : '—'} />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.breakdownBtn} onPress={reportBreakdown} disabled={breakdown.isPending}>
            <Icon name="alert" size={16} color={Colors.error} />
            <Text style={styles.breakdownBtnText}>Breakdown</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrivedBtn} onPress={arrivedAtStop} disabled={setStatus.isPending}>
            <Text style={styles.arrivedBtnText}>Arrived at stop</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.caption}>Customers following this bus see its position. It stops being shared at arrival.</Text>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function mapLabelPos(i: number, total: number) {
  const t = total <= 1 ? 0 : i / (total - 1);
  return { left: `${10 + t * 70}%`, top: `${70 - t * 45}%` } as const;
}

function RouteArt({ progress }: { progress: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 220">
      <Path d="M30 170 C90 150 120 120 160 90 S230 50 270 30" stroke={Colors.border} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray="2 10" />
      <Path d="M30 170 C90 150 120 120 160 90 S230 50 270 30" stroke={Colors.primary} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${progress * 400} 400`} />
      <Circle cx={30} cy={170} r={7} fill={Colors.ink} />
      <Circle cx={160} cy={90} r={8} fill={Colors.white} stroke={Colors.primary} strokeWidth={4} />
      <Circle cx={270} cy={30} r={7} fill={Colors.white} stroke={Colors.orange} strokeWidth={4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.surfaceAlt },
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 6 },
  emptyText: { fontSize: FontSize.sm, color: Colors.inkSecondary, textAlign: 'center' },

  summaryScroll: { padding: 24, gap: 12 },
  summaryTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  summaryMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 12, marginTop: 8 },
  summaryBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary, flex: 1 },

  mapTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  sharingPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, height: 38 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  sharingText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink },

  map: { flex: 1 },
  mapLabel: { position: 'absolute', fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink },

  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 110, gap: 12 },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sheetSmall: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  sheetBig: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink, marginTop: 2 },

  progressRow: { marginTop: 2 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary, fontWeight: FontWeight.medium },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 12, gap: 2 },
  metricLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  metricValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },

  btnRow: { flexDirection: 'row', gap: 10 },
  breakdownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 50, borderRadius: 14, backgroundColor: Colors.dangerBg },
  breakdownBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.error },
  arrivedBtn: { flex: 1.3, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14, backgroundColor: Colors.primary },
  arrivedBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  caption: { fontSize: FontSize.xs, color: Colors.inkMuted, textAlign: 'center' },
});
