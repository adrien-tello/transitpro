import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useMyTrip, useReportBreakdown, useSetTripStatus, useShareLocation } from '@/modules/staff/staff.queries';
import { fromNow, timeHM } from '@/lib/format';
import { MONO, S } from '@/theme/staff';
import { InfoTile } from '@/modules/staff/StaffUI';

// Driver live map. GPS is read every 30 s with expo-location and sent to /fleet/trips/:id/location
// (not built yet: useShareLocation no-ops on 501). Sharing stops when the screen closes or at arrival.
export default function LiveTripScreen() {
  const router = useRouter();
  const trip = useMyTrip();
  const setStatus = useSetTripStatus(trip.data?.tripId ?? '');
  const breakdown = useReportBreakdown();
  const shareLocation = useShareLocation(trip.data?.tripId ?? '');
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [sharing, setSharing] = useState(false);

  const tripId = trip.data?.tripId;
  const live = trip.data?.status === 'DEPARTED' || trip.data?.status === 'BROKEN_DOWN';

  useEffect(() => {
    let alive = true;
    if (!live || !tripId) return;
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
  }, [live, tripId]);

  if (!trip.data) {
    return (
      <View style={styles.center}>
        {trip.isPending ? <ActivityIndicator color={S.blue} /> : <Text style={styles.emptyText}>No trip on the road right now.</Text>}
      </View>
    );
  }
  const t = trip.data;
  const stops = t.stops;
  const nextIndex = Math.min(t.currentStopIndex + 1, stops.length - 1);
  const nextStop = stops[nextIndex]!;
  const isLastStop = nextIndex === stops.length - 1;
  const progress = stops.length > 1 ? (t.currentStopIndex + 0.75) / (stops.length - 1) : 1;

  function reportBreakdown() {
    Alert.alert('Report a breakdown', 'Dispatch and the branch manager are notified at once.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => breakdown.mutate({ tripId: t.tripId }) },
    ]);
  }

  function arrivedAtStop() {
    if (isLastStop) {
      setStatus.mutate({ status: 'ARRIVED' }, { onSuccess: () => router.replace('/(staff)/(tabs)' as never) });
    } else {
      Alert.alert('Stop confirmed', `${nextStop.city}: passengers can get off. On to the next stop.`);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.map}>
        <RouteMap cities={stops.map((s) => s.city)} currentIndex={t.currentStopIndex} />
      </View>

      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Icon name="chevronLeft" size={20} color={S.ink} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.sharingPill}>
          <View style={[styles.liveDot, !sharing && { backgroundColor: S.ink3 }]} />
          <Text style={styles.sharingText}>{sharing ? 'Sharing live location' : 'Connecting GPS…'}</Text>
        </View>
      </SafeAreaView>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetTop}>
          <View>
            <Text style={styles.small}>Next stop · {nextStop.city}</Text>
            <Text style={styles.big}>{t.nextStopEtaMinutes != null ? `in ${t.nextStopEtaMinutes} min` : fromNow(t.arrivalEta)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.small}>Arrival</Text>
            <Text style={styles.bigMono}>{timeHM(t.arrivalEta).replace(':', ' : ')}</Text>
          </View>
        </View>

        {/* Stop progress: blue start dot, ring per middle stop, orange end */}
        <View style={styles.progressWrap}>
          <View style={styles.track} />
          <View style={[styles.fill, { width: `${Math.min(1, progress) * 100}%` }]} />
          {stops.map((s, i) => {
            const left = stops.length > 1 ? (i / (stops.length - 1)) * 100 : 0;
            const first = i === 0;
            const last = i === stops.length - 1;
            return (
              <View
                key={`${s.city}-${i}`}
                style={[styles.marker, { left: `${left}%` }, first ? styles.markerStart : last ? styles.markerEnd : styles.markerMid]}
              />
            );
          })}
        </View>
        <View style={styles.labelsRow}>
          {stops.map((s, i) => (
            <Text key={`${s.city}-l-${i}`} style={[styles.stopLabel, i === 0 ? { textAlign: 'left' } : i === stops.length - 1 ? { textAlign: 'right' } : { textAlign: 'center' }]}>
              {s.city}
              {i === 0 && s.at ? ` ${timeHM(s.at)}` : ''}
            </Text>
          ))}
        </View>

        <View style={styles.tiles}>
          <InfoTile label="On board" value={String(t.passengersBoarded)} />
          <InfoTile label="Parcels" value={String(t.parcelsLoaded)} />
          <InfoTile label="Speed" value={t.speedKmh != null ? `${t.speedKmh} km/h` : '—'} />
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.breakdownBtn} onPress={reportBreakdown} disabled={breakdown.isPending} activeOpacity={0.85}>
            <Icon name="alert" size={18} color={S.red} />
            <Text style={styles.breakdownText}>Breakdown</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.arrivedBtn} onPress={arrivedAtStop} disabled={setStatus.isPending} activeOpacity={0.9}>
            {setStatus.isPending ? <ActivityIndicator color={S.onBlue} /> : <Text style={styles.arrivedText}>Arrived at stop</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.caption}>Customers following this bus see its position. It stops being shared at arrival.</Text>
      </View>
    </View>
  );
}

// Schematic map (no map SDK in the app): faint roads, the route through each stop, and the bus.
// Stops are placed along a fixed bent line from bottom-left to top-right.
function RouteMap({ cities, currentIndex }: { cities: string[]; currentIndex: number }) {
  const A = { x: 70, y: 330 };
  const B = { x: 180, y: 210 };
  const C = { x: 285, y: 50 };
  const lenAB = Math.hypot(B.x - A.x, B.y - A.y);
  const lenBC = Math.hypot(C.x - B.x, C.y - B.y);
  const at = (f: number) => {
    const d = f * (lenAB + lenBC);
    if (d <= lenAB) {
      const k = d / lenAB;
      return { x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k };
    }
    const k = (d - lenAB) / lenBC;
    return { x: B.x + (C.x - B.x) * k, y: B.y + (C.y - B.y) * k };
  };
  const n = cities.length;
  const pts = cities.map((_, i) => at(n > 1 ? i / (n - 1) : 0));
  const nextI = Math.min(currentIndex + 1, n - 1);
  const busF = n > 1 ? (currentIndex + 0.7) / (n - 1) : 0;
  const bus = at(Math.min(1, busF));
  const solid = pts.slice(0, nextI + 1);
  const dotted = pts.slice(nextI);
  const line = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? 'L' : 'M'}${q.x} ${q.y}`).join(' ');

  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 400" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={360} height={400} fill="#EEF1F6" />
      {/* faint roads */}
      <Path d="M-20 290 C 90 250 200 300 380 230" stroke="#DCE2EC" strokeWidth={16} fill="none" />
      <Path d="M30 -10 C 60 120 20 260 70 420" stroke="#DCE2EC" strokeWidth={12} fill="none" />
      <Path d="M250 -10 C 230 60 300 120 280 180" stroke="#DCE2EC" strokeWidth={10} fill="none" />
      {/* route */}
      <Path d={line(dotted)} stroke="#B8C2D3" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      <Path d={line(solid)} stroke={S.blue} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* stops */}
      {pts.map((p, i) => {
        const first = i === 0;
        const last = i === n - 1;
        const stroke = first ? S.blue : last ? S.orange : '#64748B';
        return (
          <G key={`${cities[i]}-${i}`}>
            <Circle cx={p.x} cy={p.y} r={first ? 9 : 7} fill={S.card} stroke={stroke} strokeWidth={first ? 3.5 : 3} />
            <SvgText x={p.x + (last ? -8 : 14)} y={p.y + (last ? -16 : first ? 24 : 4)} fontSize={13} fontWeight="700" fill={S.ink} textAnchor={last ? 'middle' : 'start'}>
              {cities[i]}
            </SvgText>
          </G>
        );
      })}
      {/* bus */}
      <Circle cx={bus.x} cy={bus.y} r={26} fill={S.blue} opacity={0.14} />
      <Rect x={bus.x - 14} y={bus.y - 14} width={28} height={28} rx={8} fill={S.blue} stroke={S.card} strokeWidth={2} />
      <Path
        d={`M${bus.x - 6} ${bus.y - 7}h12a2 2 0 0 1 2 2v9h-16v-9a2 2 0 0 1 2-2zM${bus.x - 8} ${bus.y - 1}h16M${bus.x - 8} ${bus.y + 2}h16`}
        stroke={S.card}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#EEF1F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: S.bg, padding: 32 },
  emptyText: { fontSize: 14, color: S.ink2, textAlign: 'center' },
  map: { flex: 1 },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: S.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sharingPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: S.card, borderRadius: 999, paddingHorizontal: 14, height: 38, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: S.green },
  sharingText: { fontSize: 13, fontWeight: '800', color: S.ink },

  sheet: { backgroundColor: S.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26, gap: 12, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: S.border, marginBottom: 4 },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  small: { fontSize: 13, color: S.ink2, fontWeight: '500' },
  big: { fontSize: 28, fontWeight: '800', color: S.ink, letterSpacing: -0.5, marginTop: 2 },
  bigMono: { fontFamily: MONO, fontSize: 24, fontWeight: '800', color: S.ink, marginTop: 2 },

  progressWrap: { height: 14, justifyContent: 'center', marginHorizontal: 6, marginTop: 4 },
  track: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: S.line },
  fill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: S.blue },
  marker: { position: 'absolute', marginLeft: -6, width: 12, height: 12 },
  markerStart: { borderRadius: 6, backgroundColor: S.blue },
  markerMid: { borderRadius: 6, backgroundColor: S.card, borderWidth: 2, borderColor: '#64748B' },
  markerEnd: { borderRadius: 3, backgroundColor: S.orange },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  stopLabel: { flex: 1, fontSize: 12, color: S.ink2, fontWeight: '600' },

  tiles: { flexDirection: 'row', gap: 8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  breakdownBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 56, borderRadius: 16, backgroundColor: S.redSoft, borderWidth: 1, borderColor: '#F8CACA' },
  breakdownText: { fontSize: 16, fontWeight: '800', color: S.red },
  arrivedBtn: { flex: 1.25, alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, backgroundColor: S.blue },
  arrivedText: { fontSize: 16, fontWeight: '800', color: S.onBlue },
  caption: { fontSize: 12, color: S.ink3, textAlign: 'center' },
});
