// Driver · On the road (design picture "Driver · On the road").
// Real: the bus position is sent every 30 s (staff.live.ts) and the speed comes from the GPS.
// The map is drawn (no map library): the bus marker moves along the route with the time.
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { DriverTrip, TripStop } from '../staff.types';
import { useDriverTrips, useSetTripStatus } from '../staff.queries';
import { tripStops } from '../staff.screens.queries';
import { askLocationPermission, useLiveLocation } from '../staff.live';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatTime } from '../staff.format';
import { StaffIcon } from './StaffIcon';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorState, SkeletonBlock } from './StaffStates';
import { BreakdownButton } from './DriverToday';

// Route drawn in a 360 × 400 box: from bottom-left (origin) to top-right (destination).
const W = 360;
const H = 400;
const FROM = { x: 60, y: 330 };
const TO = { x: 290, y: 60 };

function at(f: number) {
  return { x: FROM.x + (TO.x - FROM.x) * f, y: FROM.y + (TO.y - FROM.y) * f };
}

// 0 at departure, 1 at arrival, from the clock (the server has no "distance done" yet).
function fractionOf(time: number, start: number, end: number) {
  if (end <= start) return 0;
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

export function OnTheRoadScreen({ tripId }: { tripId: string }) {
  const trips = useDriverTrips();
  const trip = trips.data?.find((t) => t.id === tripId);

  if (trips.isPending) {
    return (
      <SafeAreaView style={[styles.root, { padding: StaffSpace.side }]}>
        <SkeletonBlock height={360} />
        <SkeletonBlock height={220} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }
  if (trips.isError || !trip) {
    return (
      <SafeAreaView style={[styles.root, { padding: StaffSpace.side }]}>
        <ErrorState
          message={trips.error?.message ?? 'This trip is not in your list.'}
          onRetry={() => trips.refetch()}
          retrying={trips.isRefetching}
        />
      </SafeAreaView>
    );
  }
  return <Road trip={trip} />;
}

function Road({ trip }: { trip: DriverTrip }) {
  const router = useRouter();
  const live = useLiveLocation();
  const setStatus = useSetTripStatus();
  const stops = tripStops(trip);
  const [passed, setPassed] = useState<string[]>([]); // stops the driver marked "arrived"
  const [confirmArrive, setConfirmArrive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(trip.departureAt).getTime();
  const end = new Date(trip.arrivalEta).getTime();
  const f = trip.status === 'ARRIVED' ? 1 : fractionOf(now, start, end);
  const stopFraction = (s: TripStop) => fractionOf(new Date(s.plannedAt).getTime(), start, end);

  // Next stop = first one after the origin that is not passed yet.
  const ahead = stops.slice(1).filter((s) => !passed.includes(s.city));
  const next = ahead[0];
  const isLast = !!next && next === stops[stops.length - 1];
  const minutes = next ? Math.max(0, Math.round((new Date(next.plannedAt).getTime() - now) / 60000)) : 0;
  const sharingThis = live.sharing && live.tripId === trip.id;

  function arrived() {
    if (!next) return;
    if (!isLast) {
      setPassed((p) => [...p, next.city]);
      return;
    }
    setConfirmArrive(true);
  }

  function finishTrip() {
    setConfirmArrive(false);
    setStatus.mutate(
      { tripId: trip.id, status: 'ARRIVED' },
      {
        onSuccess: () => {
          live.stop(); // the position stops being shared at arrival
          router.navigate('/(staff)/(tabs)' as never);
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  async function resumeSharing() {
    setError(null);
    let allowed = false;
    try {
      allowed = await askLocationPermission();
    } catch {
      allowed = false;
    }
    if (allowed) live.start(trip.id);
    else
      setError(
        'Location is blocked. Allow it for this app (in a browser: the lock icon next to the address), then tap Share location again.',
      );
  }

  const bus = at(f);

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
          <Rect x={0} y={0} width={W} height={H} fill={StaffColors.mapBg} />
          <Path d="M-20 260 C 80 240, 160 300, 380 210" stroke={StaffColors.mapRoad} strokeWidth={22} fill="none" />
          <Path d="M90 -20 C 70 120, 120 260, 70 420" stroke={StaffColors.mapRoad} strokeWidth={16} fill="none" />
          <Path d="M250 -20 C 300 80, 260 160, 330 240" stroke={StaffColors.mapRoad} strokeWidth={12} fill="none" />
          {/* Route left: dotted. Route done: solid accent. */}
          <Line x1={bus.x} y1={bus.y} x2={TO.x} y2={TO.y} stroke={StaffColors.routeLeft} strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />
          <Line x1={FROM.x} y1={FROM.y} x2={bus.x} y2={bus.y} stroke={StaffColors.primary} strokeWidth={5} strokeLinecap="round" />
          {stops.map((s, i) => {
            const p = at(i === 0 ? 0 : i === stops.length - 1 ? 1 : stopFraction(s));
            const last = i === stops.length - 1;
            return (
              <React.Fragment key={s.city}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={8}
                  fill={StaffColors.surface}
                  stroke={last ? StaffColors.accent : i === 0 ? StaffColors.primary : StaffColors.body}
                  strokeWidth={3}
                />
                {/* Destination label goes to the left of its dot so it is never cut at the edge. */}
                <SvgText
                  x={p.x + (i === 0 ? -6 : last ? -14 : 14)}
                  y={p.y + (i === 0 ? 26 : 4)}
                  fontSize={12}
                  fontWeight="700"
                  fontFamily="Helvetica, Arial, sans-serif"
                  textAnchor={last ? 'end' : 'start'}
                  fill={StaffColors.navy}
                >
                  {s.city}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Circle cx={bus.x} cy={bus.y} r={20} fill={StaffColors.primaryTint} />
          <Circle cx={bus.x} cy={bus.y} r={13} fill={StaffColors.primary} />
          <Rect x={bus.x - 6} y={bus.y - 6} width={12} height={10} rx={2} fill={StaffColors.surface} />
        </Svg>

        <SafeAreaView edges={['top']} style={styles.mapTop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <StaffIcon name="chevron" size={18} color={StaffColors.navy} />
            </View>
          </Pressable>
          <View style={styles.statusPill}>
            <PulseDot on={sharingThis && !live.failed} />
            <Text style={styles.statusText}>
              {sharingThis ? (live.failed ? 'Location not sent, retrying' : 'Sharing live location') : 'Location not shared'}
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <View style={styles.grabber} />
        <View style={styles.nextRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.small}>{next ? `Next stop · ${next.city}` : 'Arrived'}</Text>
            <Text style={styles.big}>{next ? (minutes > 0 ? `in ${minutes} min` : 'now') : trip.destinationCity}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.small}>Arrival</Text>
            <Text style={[styles.big, { fontFamily: monoFont }]}>{formatTime(trip.arrivalEta)}</Text>
          </View>
        </View>

        <StopsBar stops={stops} fraction={f} stopFraction={stopFraction} />

        <View style={styles.tiles}>
          <Tile label="On board" value={String(trip.passengers.boarded)} />
          <Tile label="Parcels" value={String(trip.parcels.loaded)} />
          <Tile label="Speed" value={sharingThis && live.speedKmh != null ? `${live.speedKmh} km/h` : '– km/h'} />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.buttons}>
          <BreakdownButton large />
          {sharingThis ? (
            <Pressable
              accessibilityRole="button"
              disabled={!next || setStatus.isPending}
              onPress={arrived}
              style={({ pressed }) => [styles.primary, (pressed || setStatus.isPending || !next) && { opacity: 0.75 }]}
            >
              {setStatus.isPending ? (
                <ActivityIndicator color={StaffColors.onDark} />
              ) : (
                <Text style={styles.primaryText}>{isLast ? 'Arrived' : 'Arrived at stop'}</Text>
              )}
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={resumeSharing} style={styles.primary}>
              <Text style={styles.primaryText}>Share location</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.footer}>Customers following this bus see its position. It stops being shared at arrival.</Text>
      </ScrollView>

      <ConfirmDialog
        visible={confirmArrive}
        title={`Arrived in ${trip.destinationCity}?`}
        message="The trip ends and the bus position stops being shared."
        confirmLabel="Yes, arrived"
        onConfirm={finishTrip}
        onCancel={() => setConfirmArrive(false)}
      />
    </View>
  );
}

function StopsBar({
  stops,
  fraction,
  stopFraction,
}: {
  stops: TripStop[];
  fraction: number;
  stopFraction: (s: TripStop) => number;
}) {
  return (
    <View style={styles.stopsWrap}>
      <View style={styles.stopsTrack}>
        <View style={[styles.stopsDone, { width: `${Math.round(fraction * 100)}%` }]} />
      </View>
      {stops.map((s, i) => {
        const pos = i === 0 ? 0 : i === stops.length - 1 ? 1 : stopFraction(s);
        const last = i === stops.length - 1;
        return (
          <View
            key={s.city}
            style={[
              styles.stopDot,
              { left: `${pos * 100}%` },
              i === 0 && { backgroundColor: StaffColors.primary, borderColor: StaffColors.primary },
              last && { backgroundColor: StaffColors.accent, borderColor: StaffColors.accent, borderRadius: 3 },
            ]}
          />
        );
      })}
      <View style={styles.stopLabels}>
        {stops.map((s, i) => (
          <Text
            key={s.city}
            style={[styles.stopLabel, i === 0 ? { textAlign: 'left' } : i === stops.length - 1 ? { textAlign: 'right' } : null]}
          >
            {s.city}
            {i === 0 ? ` ${formatTime(s.plannedAt)}` : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function PulseDot({ on }: { on: boolean }) {
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, o]);
  return (
    <Animated.View
      style={[styles.pulse, { backgroundColor: on ? StaffColors.progressParcels : StaffColors.hint, opacity: on ? o : 1 }]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.background },
  map: { height: '50%', minHeight: 280, backgroundColor: StaffColors.mapBg },
  mapTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: StaffColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: StaffColors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: StaffColors.navy },
  pulse: { width: 10, height: 10, borderRadius: 5 },

  sheet: {
    flex: 1,
    marginTop: -24,
    backgroundColor: StaffColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: { paddingHorizontal: StaffSpace.side, paddingTop: 10, paddingBottom: 32 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: StaffColors.field, marginBottom: 12 },
  nextRow: { flexDirection: 'row', alignItems: 'flex-end' },
  small: { fontSize: 12, color: StaffColors.muted, fontWeight: '600' },
  big: { fontSize: 24, fontWeight: '800', color: StaffColors.navy, marginTop: 2 },

  stopsWrap: { marginTop: 18, marginBottom: 6 },
  stopsTrack: { height: 4, borderRadius: 2, backgroundColor: StaffColors.line, marginHorizontal: 6 },
  stopsDone: { height: 4, borderRadius: 2, backgroundColor: StaffColors.primary },
  stopDot: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    marginLeft: 0,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: StaffColors.body,
    backgroundColor: StaffColors.surface,
  },
  stopLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  stopLabel: { flex: 1, fontSize: 12, color: StaffColors.body, textAlign: 'center' },

  tiles: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile: { flex: 1, backgroundColor: StaffColors.chip, borderRadius: 14, padding: 12 },
  tileValue: { fontSize: 16, fontWeight: '800', color: StaffColors.navy, marginTop: 4 },

  buttons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: StaffColors.onDark, fontSize: 15, fontWeight: '700' },
  error: { color: StaffColors.danger, fontSize: 13, fontWeight: '600', marginTop: 10 },
  footer: { fontSize: 12, color: StaffColors.muted, textAlign: 'center', marginTop: 14, lineHeight: 18 },
});
