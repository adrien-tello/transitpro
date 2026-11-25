import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, PersonAvatar } from '@/components/ui';
import type { Me } from '@contracts/api-types';
import { useMyTrip, useReportBreakdown, useSetTripStatus } from './staff.queries';
import { fromNow, timeHM, weekdayDate } from '@/lib/format';

const TRIP_LABEL: Record<string, string> = { SCHEDULED: 'Scheduled', BOARDING: 'Boarding', DEPARTED: 'On the road', ARRIVED: 'Arrived', BROKEN_DOWN: 'Breakdown' };

export function DriverToday({ me }: { me: Me }) {
  const router = useRouter();
  const trip = useMyTrip();
  const breakdown = useReportBreakdown();
  const setStatus = useSetTripStatus(trip.data?.tripId ?? '');
  const branch = me.employee ? 'Akwa' : null; // placeholder until branch name ships on Me

  function reportBreakdown() {
    if (!trip.data) return;
    Alert.alert('Report a breakdown', `Trip ${trip.data.code} will be marked broken down and dispatch is notified.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report breakdown', style: 'destructive', onPress: () => breakdown.mutate({ tripId: trip.data!.tripId }) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <PersonAvatar name={me.fullName} role="DRIVER" />
          <View style={styles.headerText}>
            <Text style={styles.headerMeta}>
              {weekdayDate()} · Driver{branch ? ` · ${branch}` : ''}
            </Text>
            <Text style={styles.headerTitle}>Morning, {me.fullName.split(' ')[0]}</Text>
          </View>
          {trip.data && (
            <TouchableOpacity style={styles.breakdownBtn} onPress={reportBreakdown} disabled={breakdown.isPending} activeOpacity={0.85}>
              <Icon name="alert" size={14} color={Colors.error} />
              <Text style={styles.breakdownText}>Breakdown</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trip card */}
        {trip.data ? (
          <View style={styles.tripCard}>
            <View style={styles.tripTopRow}>
              <Text style={styles.tripCode}>
                Trip {trip.data.code} · {trip.data.busPlate}
              </Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{TRIP_LABEL[trip.data.status]}</Text>
              </View>
            </View>
            <View style={styles.timeRow}>
              <View>
                <Text style={styles.time}>{timeHM(trip.data.departureAt)}</Text>
                <Text style={styles.city}>{trip.data.originCity}</Text>
              </View>
              <View style={styles.dash} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.time}>{timeHM(trip.data.arrivalEta)}</Text>
                <Text style={styles.city}>{trip.data.destinationCity}</Text>
              </View>
            </View>
            <View style={styles.tilesRow}>
              <Tile label="Passengers scanned" value={`${trip.data.passengersBoarded} / ${trip.data.passengersTotal}`} pct={trip.data.passengersBoarded / trip.data.passengersTotal} />
              <Tile label="Parcels loaded" value={`${trip.data.parcelsLoaded} / ${trip.data.parcelsTotal}`} pct={trip.data.parcelsLoaded / trip.data.parcelsTotal} />
            </View>
          </View>
        ) : trip.isPending ? null : (
          <View style={styles.emptyTrip}>
            <Icon name="cal" size={22} color={Colors.primary} />
            <Text style={styles.emptyTitle}>No trip scheduled today</Text>
            <Text style={styles.emptyText}>Trips your branch manager schedules for you appear here.</Text>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={() => router.push({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'tickets' } })}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.orangeLight }]}>
              <Icon name="scan" size={20} color={Colors.orangeDark} />
            </View>
            <Text style={styles.actionLabel}>Scan tickets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} activeOpacity={0.85} onPress={() => router.push({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'parcels' } })}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Icon name="box" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Scan parcels</Text>
          </TouchableOpacity>
        </View>

        {/* Before departure checklist */}
        {trip.data && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Before departure</Text>
            <ChecklistRow label="Tyres and lights" done meta="Done 07:20" />
            <ChecklistRow label="Fuel" done meta="82%" />
            <ChecklistRow label="Documents on board" done meta="Licence, carte grise" />
            <ChecklistRow
              label="All passengers scanned"
              done={trip.data.passengersBoarded >= trip.data.passengersTotal}
              meta={trip.data.passengersBoarded >= trip.data.passengersTotal ? 'Done' : `${trip.data.passengersTotal - trip.data.passengersBoarded} missing`}
              metaTone="error"
              onPress={() => router.push({ pathname: '/(staff)/trip-passengers', params: { tripId: trip.data!.tripId } })}
            />
          </View>
        )}

        {/* Start trip */}
        {trip.data && trip.data.status === 'BOARDING' && (
          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.9}
            disabled={setStatus.isPending}
            onPress={() => setStatus.mutate({ status: 'DEPARTED' }, { onSettled: () => router.push('/(staff)/(tabs)/trips') })}
          >
            <Icon name="navigate" size={18} color={Colors.white} />
            <Text style={styles.startBtnText}>{setStatus.isPending ? 'Starting…' : 'Start trip · share live location'}</Text>
          </TouchableOpacity>
        )}
        {trip.data && (trip.data.status === 'DEPARTED' || trip.data.status === 'BROKEN_DOWN') && (
          <TouchableOpacity style={styles.startBtn} activeOpacity={0.9} onPress={() => router.push('/(staff)/(tabs)/trips')}>
            <Icon name="pin" size={18} color={Colors.white} />
            <Text style={styles.startBtnText}>Sharing live location · {fromNow(trip.data.arrivalEta)} to arrival</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      <View style={styles.tileTrack}>
        <View style={[styles.tileFill, { width: `${Math.min(100, Math.max(0, pct * 100))}%` }]} />
      </View>
    </View>
  );
}

function ChecklistRow({ label, done, meta, metaTone, onPress }: { label: string; done: boolean; meta: string; metaTone?: 'error'; onPress?: () => void }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={styles.checkRow} {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}>
      <View style={[styles.checkbox, done && styles.checkboxDone]}>{done && <Icon name="check" size={13} color={Colors.white} />}</View>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={[styles.checkMeta, metaTone === 'error' && { color: Colors.error }]}>{meta}</Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, gap: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  headerMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary, fontWeight: FontWeight.medium },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 1 },
  breakdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dangerBg, borderRadius: 20, paddingHorizontal: 12, height: 34 },
  breakdownText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error },

  tripCard: { backgroundColor: Colors.primary, borderRadius: 22, padding: 18, gap: 14 },
  tripTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripCode: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: FontWeight.semibold },
  statusPill: { backgroundColor: Colors.orange, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.navy },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontSize: 30, fontWeight: FontWeight.extrabold, color: Colors.white },
  city: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  dash: { flex: 1, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)', marginHorizontal: 10 },
  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, gap: 4 },
  tileLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.75)', fontWeight: FontWeight.medium },
  tileValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white },
  tileTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 2 },
  tileFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 3 },

  emptyTrip: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 4 },
  emptyText: { fontSize: FontSize.sm, color: Colors.inkSecondary, textAlign: 'center' },

  actionsRow: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, padding: 16, gap: 10, shadowColor: Colors.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  actionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },

  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, gap: 2 },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink, marginBottom: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkLabel: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.ink },
  checkMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16, backgroundColor: Colors.primary },
  startBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
});
