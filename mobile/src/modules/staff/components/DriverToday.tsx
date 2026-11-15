// Driver · Today (design: Staff app page). Spec: docs/tasks/fidel-staff-app.md section 4.2.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Me } from '@contracts/api-types';
import type { DriverTrip } from '../staff.types';
import { pickTodayTrip, useDriverTrips, useSetTripStatus } from '../staff.queries';
import { askLocationPermission, useLiveLocation } from '../staff.live';
import { ConfirmDialog } from './ConfirmDialog';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { firstName, formatDay, formatTime, greeting, initials } from '../staff.format';
import { StaffHeader } from './StaffHeader';
import { StaffIcon } from './StaffIcon';
import { ProgressBar } from './ProgressBar';
import { EmptyState, ErrorState, SkeletonBlock } from './StaffStates';


const STATUS_LABEL: Record<DriverTrip['status'], string> = {
  SCHEDULED: 'Scheduled',
  BOARDING: 'Boarding',
  DEPARTED: 'Departed',
  ARRIVED: 'Arrived',
  CANCELLED: 'Cancelled',
};

// Breakdown: confirm first. Reporting arrives with the Fleet module (not built yet).
export function BreakdownButton({ large }: { large?: boolean }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report a breakdown"
        onPress={() => setAsking(true)}
        style={({ pressed }) => [styles.breakdown, large && styles.breakdownLarge, pressed && styles.pressed]}
      >
        <StaffIcon name="alert" size={16} color={StaffColors.danger} />
        <Text style={styles.breakdownText}>Breakdown</Text>
      </Pressable>
      <ConfirmDialog
        visible={asking}
        title="Report a breakdown?"
        message="Your branch manager will be warned that the bus cannot continue."
        confirmLabel="Report"
        danger
        onConfirm={() => {
          setAsking(false);
          setNote('Breakdown reports arrive with the Fleet module. Call your branch manager for now.');
        }}
        onCancel={() => setAsking(false)}
      />
      <ConfirmDialog
        visible={!!note}
        title="Not connected yet"
        message={note ?? ''}
        confirmLabel="OK"
        onConfirm={() => setNote(null)}
        onCancel={() => setNote(null)}
      />
    </>
  );
}

export function DriverToday({ me }: { me: Me }) {
  const trips = useDriverTrips();
  const trip = trips.data ? pickTodayTrip(trips.data) : undefined;

  const header = (
    <StaffHeader
      initials={initials(me.fullName)}
      subtitle={[formatDay(), 'Driver', trip?.originBranch].filter(Boolean).join(' · ')}
      title={`${greeting()}, ${firstName(me.fullName)}`}
      avatarTone="primary"
      right={
        <BreakdownButton />
      }
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={trips.isRefetching} onRefresh={() => trips.refetch()} tintColor={StaffColors.primary} />
        }
      >
        {header}
        {trips.isPending ? (
          <DriverSkeleton />
        ) : trips.isError ? (
          <ErrorState message={trips.error.message} onRetry={() => trips.refetch()} retrying={trips.isRefetching} />
        ) : !trip ? (
          <EmptyState icon="ticket" title="No trip assigned today" text="Your branch manager assigns trips." />
        ) : (
          <TripContent trip={trip} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TripContent({ trip }: { trip: DriverTrip }) {
  const router = useRouter();
  const missing = Math.max(0, trip.passengers.sold - trip.passengers.boarded);
  // Local ticks for now (Fleet will store them). The value is the time it was ticked.
  const [checks, setChecks] = useState<Record<'tyres' | 'fuel' | 'documents', string | null>>({
    tyres: null,
    fuel: null,
    documents: null,
  });
  const toggle = (key: keyof typeof checks) =>
    setChecks((c) => ({ ...c, [key]: c[key] ? null : formatTime(new Date().toISOString()) }));

  return (
    <>
      <HeroCard trip={trip} missing={missing} />

      <View style={styles.scanRow}>
        <BigButton
          icon="scan"
          tone="primary"
          label="Scan tickets"
          onPress={() => router.navigate({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'tickets' } } as never)}
        />
        <BigButton
          icon="box"
          tone="amber"
          label="Scan parcels"
          onPress={() => router.navigate({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'parcels' } } as never)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Before departure</Text>
        <CheckRow
          label="Tyres and lights"
          value={checks.tyres ? `Done ${checks.tyres}` : 'To check'}
          done={!!checks.tyres}
          onPress={() => toggle('tyres')}
        />
        <CheckRow
          label="Fuel"
          value={checks.fuel ? `Done ${checks.fuel}` : 'To check'}
          done={!!checks.fuel}
          onPress={() => toggle('fuel')}
        />
        <CheckRow
          label="Documents on board"
          value="Licence, carte grise"
          done={!!checks.documents}
          onPress={() => toggle('documents')}
        />
        {/* Automatic: ticked only when every sold ticket has boarded. */}
        <CheckRow
          label="All passengers scanned"
          value={missing > 0 ? `${missing} missing` : 'All on board'}
          done={missing === 0}
          onPress={
            missing > 0
              ? () => router.push({ pathname: '/(staff)/trip/[id]/passengers', params: { id: trip.id } } as never)
              : undefined
          }
        />
      </View>

      <StartTrip trip={trip} missing={missing} />
    </>
  );
}

function HeroCard({ trip }: { trip: DriverTrip; missing: number }) {
  const router = useRouter();
  const active = trip.status === 'BOARDING' || trip.status === 'DEPARTED';
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <Text style={styles.heroCode} numberOfLines={1}>
          Trip {trip.code} · {trip.busPlate}
        </Text>
        <View style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}>
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
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.timeSmall}>{formatTime(trip.arrivalEta)}</Text>
          <Text style={styles.city}>{trip.destinationCity}</Text>
        </View>
      </View>

      <View style={styles.tiles}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Passengers scanned ${trip.passengers.boarded} of ${trip.passengers.sold}, open the list`}
          onPress={() => router.push({ pathname: '/(staff)/trip/[id]/passengers', params: { id: trip.id } } as never)}
          style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        >
          <Text style={styles.tileLabel}>Passengers scanned ›</Text>
          <Text style={styles.tileValue}>
            {trip.passengers.boarded} / {trip.passengers.sold}
          </Text>
          <ProgressBar
            value={trip.passengers.boarded}
            total={trip.passengers.sold}
            color={StaffColors.progressPassengers}
            track={StaffColors.heroTrack}
          />
        </Pressable>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>Parcels loaded</Text>
          <Text style={styles.tileValue}>
            {trip.parcels.loaded} / {trip.parcels.total}
          </Text>
          <ProgressBar
            value={trip.parcels.loaded}
            total={trip.parcels.total}
            color={StaffColors.progressParcels}
            track={StaffColors.heroTrack}
          />
        </View>
      </View>
    </View>
  );
}

// Start trip: asks for location, sets the trip to DEPARTED, starts sharing the bus position
// (staff.live.ts, every 30 s) and opens "On the road".
function StartTrip({ trip, missing }: { trip: DriverTrip; missing: number }) {
  const router = useRouter();
  const setStatus = useSetTripStatus();
  const live = useLiveLocation();
  const [asking, setAsking] = useState(false);
  const [confirmMissing, setConfirmMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sharingThis = live.sharing && live.tripId === trip.id;
  const openRoad = () => router.push({ pathname: '/(staff)/trip/[id]/live', params: { id: trip.id } } as never);

  // The trip starts even if location is refused: a driver is never stuck at the station because
  // of GPS, and the map screen (Breakdown, Arrived) must stay reachable. The map then shows
  // "Location not shared" with a button to try again.
  async function depart() {
    setConfirmMissing(false);
    setError(null);
    setAsking(true);
    let allowed = false;
    try {
      allowed = await askLocationPermission();
    } catch {
      allowed = false; // no GPS on this device
    } finally {
      setAsking(false);
    }
    setStatus.mutate(
      { tripId: trip.id, status: 'DEPARTED' },
      {
        onSuccess: () => {
          if (allowed) live.start(trip.id);
          openRoad();
        },
        onError: (e) => setError(e.message),
      },
    );
  }

  const busy = asking || setStatus.isPending;

  let body: React.ReactNode;
  if (trip.status === 'DEPARTED' && sharingThis) {
    body = (
      <Pressable accessibilityRole="button" onPress={openRoad} style={({ pressed }) => [styles.sharing, pressed && styles.pressed]}>
        <View style={styles.sharingDot} />
        <View style={{ flex: 1 }}>
          <Text style={styles.sharingTitle}>Sharing live location</Text>
          <Text style={styles.sharingText}>
            {live.failed
              ? 'Last position not sent, retrying in 30 s'
              : live.lastSentAt
                ? `Last sent ${formatTime(live.lastSentAt)} · open the map`
                : 'Getting your position…'}
          </Text>
        </View>
        <StaffIcon name="chevron" size={18} color={StaffColors.success} />
      </Pressable>
    );
  } else if (trip.status === 'DEPARTED') {
    // Trip already left (e.g. the app was closed): offer to resume the location.
    body = (
      <PrimaryButton
        label="On the road · location not shared"
        busy={busy}
        onPress={openRoad}
      />
    );
  } else {
    body = (
      <PrimaryButton
        label="Start trip · share live location"
        busy={busy}
        onPress={() => (missing > 0 ? setConfirmMissing(true) : depart())}
      />
    );
  }

  return (
    <>
      {body}
      {error && <Text style={styles.error}>{error}</Text>}
      <ConfirmDialog
        visible={confirmMissing}
        title={`${missing} passengers not scanned`}
        message="Start anyway? They will not be counted as on board."
        confirmLabel="Start anyway"
        onConfirm={depart}
        onCancel={() => setConfirmMissing(false)}
      />
    </>
  );
}

function PrimaryButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator color={StaffColors.onDark} />
      ) : (
        <>
          <StaffIcon name="navigate" size={18} color={StaffColors.onDark} />
          <Text style={styles.primaryText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function BigButton({
  icon,
  tone,
  label,
  onPress,
}: {
  icon: 'scan' | 'box';
  tone: 'primary' | 'amber';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bigBtn, pressed && styles.pressed]}>
      <StaffIcon name={icon} size={22} color={tone === 'primary' ? StaffColors.primary : StaffColors.accent} />
      <Text style={styles.bigLabel}>{label}</Text>
    </Pressable>
  );
}

function CheckRow({
  label,
  value,
  done,
  onPress,
}: {
  label: string;
  value: string;
  done: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      disabled={!onPress}
      onPress={onPress}
      style={styles.checkRow}
    >
      <View style={[styles.checkBox, done && styles.checkBoxDone]}>
        {done && <StaffIcon name="check" size={14} color={StaffColors.onDark} />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={styles.checkValue} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

function DriverSkeleton() {
  return (
    <View>
      <SkeletonBlock height={236} style={{ borderRadius: StaffSpace.heroRadius }} />
      <View style={[styles.scanRow, { marginTop: 14 }]}>
        <SkeletonBlock height={88} style={{ flex: 1 }} />
        <SkeletonBlock height={88} style={{ flex: 1 }} />
      </View>
      <SkeletonBlock height={200} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background },
  // Bottom space keeps the last button above the floating tab bar.
  content: { paddingHorizontal: StaffSpace.side, paddingBottom: 120 },
  pressed: { opacity: 0.75 },

  breakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: StaffColors.dangerTint,
  },
  breakdownText: { color: StaffColors.danger, fontWeight: '700', fontSize: 13 },
  breakdownLarge: { flex: 1, height: 52, justifyContent: 'center' },
  error: { color: StaffColors.danger, fontSize: 13, fontWeight: '600', marginTop: 8 },

  // Blue hero card (design picture "Driver · Today")
  hero: { backgroundColor: StaffColors.primary, borderRadius: StaffSpace.heroRadius, padding: 16, marginTop: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroCode: { color: StaffColors.onDark, fontSize: 13, fontWeight: '600', flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillActive: { backgroundColor: StaffColors.accent },
  pillIdle: { backgroundColor: StaffColors.surface },
  pillText: { color: StaffColors.amberInk, fontSize: 12, fontWeight: '700' },
  timesRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  time: { color: StaffColors.onDark, fontSize: 32, fontWeight: '700', fontFamily: monoFont },
  timeSmall: { color: StaffColors.onDark, fontSize: 20, fontWeight: '700', fontFamily: monoFont },
  city: { color: StaffColors.onPrimaryMuted, fontSize: 13, marginTop: 2 },
  dashes: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginBottom: 12 },
  dash: { width: 5, height: 1.5, borderRadius: 1, backgroundColor: StaffColors.onPrimaryMuted },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: { flex: 1, backgroundColor: StaffColors.heroTile, borderRadius: 14, padding: 12, minHeight: 44 },
  tileLabel: { color: StaffColors.onPrimaryMuted, fontSize: 12, fontWeight: '600' },
  tileValue: { color: StaffColors.onDark, fontSize: 18, fontWeight: '800', marginTop: 2 },

  scanRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  bigBtn: {
    flex: 1,
    backgroundColor: StaffColors.surface,
    borderRadius: StaffSpace.cardRadius,
    padding: 14,
    gap: 12,
    minHeight: 80,
  },
  bigLabel: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },

  card: {
    backgroundColor: StaffColors.surface,
    borderRadius: StaffSpace.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: StaffColors.navy, marginBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: StaffColors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: StaffColors.primary, borderColor: StaffColors.primary },
  checkLabel: { flex: 1, fontSize: 14, color: StaffColors.body },
  checkValue: { fontSize: 12, color: StaffColors.muted, maxWidth: '45%' },

  primary: {
    height: StaffSpace.buttonHeight,
    borderRadius: StaffSpace.buttonRadius,
    backgroundColor: StaffColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  primaryText: { color: StaffColors.onDark, fontSize: 15, fontWeight: '700' },

  sharing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: StaffSpace.cardRadius,
    backgroundColor: StaffColors.successTint,
  },
  sharingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: StaffColors.success },
  sharingTitle: { fontSize: 15, fontWeight: '700', color: StaffColors.success },
  sharingText: { fontSize: 13, color: StaffColors.body, marginTop: 2 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: StaffColors.surface,
  },
  stopText: { color: StaffColors.danger, fontWeight: '700', fontSize: 14 },
});
