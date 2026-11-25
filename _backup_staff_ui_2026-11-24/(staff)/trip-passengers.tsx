import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, SegmentedControl } from '@/components/ui';
import { usePassengers, useMyTrip, useBoardTicket } from '@/modules/staff/staff.queries';
import { timeHM } from '@/lib/format';
import type { DriverPassengerRow } from '@contracts/api-types';

type Filter = 'all' | 'missing' | 'boarded';

export default function TripPassengersScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useMyTrip();
  const passengers = usePassengers(tripId ?? trip.data?.tripId ?? '');
  const boardTicket = useBoardTicket();
  const [filter, setFilter] = useState<Filter>('missing');
  const [q, setQ] = useState('');

  const rows = passengers.data ?? [];
  const missing = rows.filter((r) => !r.boardedAt);
  const boarded = rows.filter((r) => r.boardedAt);

  const visible = useMemo(() => {
    const base = filter === 'missing' ? missing : filter === 'boarded' ? boarded : rows;
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((r) => r.passengerName.toLowerCase().includes(needle) || String(r.seatNumber).includes(needle));
  }, [filter, q, rows, missing, boarded]);

  function board(row: DriverPassengerRow) {
    const id = tripId ?? trip.data?.tripId;
    if (!id) return;
    boardTicket.mutate({ code: row.ticketCode, tripId: id });
  }

  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.roundBtnLight} onPress={() => router.back()}>
            <Icon name="chevronLeft" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Passengers</Text>
            {trip.data && (
              <Text style={styles.headerMeta}>
                {trip.data.code} · {timeHM(trip.data.departureAt)} {trip.data.originCity} → {trip.data.destinationCity} · {trip.data.busPlate}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.roundBtnLight} onPress={() => router.back()}>
            <Icon name="scan" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countValue}>
            {boarded.length}
            <Text style={styles.countTotal}>/{rows.length} on board</Text>
          </Text>
          {missing.length > 0 && (
            <View style={styles.missingPill}>
              <Text style={styles.missingPillText}>{missing.length} missing</Text>
            </View>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: rows.length ? `${(boarded.length / rows.length) * 100}%` : '0%' }]} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={styles.searchRow}>
          <Icon name="user" size={16} color={Colors.inkMuted} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Name or seat number" placeholderTextColor={Colors.inkMuted} />
        </View>

        <SegmentedControl
          options={[
            { value: 'all', label: `All ${rows.length}` },
            { value: 'missing', label: `Missing ${missing.length}` },
            { value: 'boarded', label: `On board ${boarded.length}` },
          ]}
          value={filter}
          onChange={setFilter}
        />

        <FlatList
          data={visible}
          keyExtractor={(r) => r.ticketCode}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40, gap: 2 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.seatChip, item.boardedAt ? styles.seatChipBoarded : styles.seatChipMissing]}>
                <Text style={[styles.seatChipText, item.boardedAt ? styles.seatChipTextBoarded : styles.seatChipTextMissing]}>{item.seatNumber}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.passengerName}</Text>
                <Text style={styles.code}>{item.ticketCode}</Text>
              </View>
              {item.boardedAt ? (
                <Text style={styles.boardedAt}>On board {timeHM(item.boardedAt)}</Text>
              ) : (
                <TouchableOpacity style={styles.boardBtn} onPress={() => board(item)} disabled={boardTicket.isPending}>
                  <Text style={styles.boardBtnText}>Board</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
        <Text style={styles.footnote}>You see names and seats only, never phone or ID numbers. Tap a missing passenger to board them after checking their CNI.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  roundBtnLight: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.white },
  headerMeta: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  countValue: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.white },
  countTotal: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: 'rgba(255,255,255,0.8)' },
  missingPill: { backgroundColor: Colors.orange, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-end' },
  missingPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.navy },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 3 },

  body: { flex: 1, padding: 16, gap: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14, height: 46 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.ink },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, marginBottom: 6 },
  seatChip: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seatChipMissing: { backgroundColor: Colors.orangeLight },
  seatChipBoarded: { backgroundColor: Colors.primaryLight },
  seatChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  seatChipTextMissing: { color: Colors.orangeDark },
  seatChipTextBoarded: { color: Colors.primary },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  code: { fontSize: FontSize.xs, color: Colors.inkSecondary, marginTop: 1 },
  boardedAt: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.success },
  boardBtn: { backgroundColor: Colors.orange, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  boardBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.navy },

  footnote: { fontSize: FontSize.xs, color: Colors.inkMuted, textAlign: 'center', paddingBottom: 8 },
});
