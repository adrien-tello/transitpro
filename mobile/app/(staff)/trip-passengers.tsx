import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useBoardTicket, useMyTrip, usePassengers } from '@/modules/staff/staff.queries';
import { timeHM } from '@/lib/format';
import { MONO, S, shadow } from '@/theme/staff';
import type { DriverPassengerRow } from '@contracts/api-types';

type Filter = 'all' | 'missing' | 'boarded';

export default function TripPassengersScreen() {
  const router = useRouter();
  const { tripId: tripParam } = useLocalSearchParams<{ tripId?: string }>();
  const trip = useMyTrip();
  const tripId = tripParam ?? trip.data?.tripId ?? '';
  const passengers = usePassengers(tripId);
  const boardTicket = useBoardTicket();
  const [filter, setFilter] = useState<Filter>('missing');
  const [q, setQ] = useState('');

  const rows = passengers.data ?? [];
  const missing = useMemo(() => rows.filter((r) => !r.boardedAt).sort((a, b) => a.seatNumber - b.seatNumber), [rows]);
  const boarded = useMemo(() => rows.filter((r) => r.boardedAt).sort((a, b) => (a.boardedAt! < b.boardedAt! ? -1 : 1)), [rows]);
  // Use the trip totals when we have them (the list may be paged), the list otherwise.
  const total = trip.data?.passengersTotal ?? rows.length;
  const onBoard = trip.data ? trip.data.passengersBoarded : boarded.length;
  const missingCount = Math.max(0, total - onBoard);

  const visible = useMemo(() => {
    // "All" lists the missing passengers first: they are the ones the driver acts on.
    const base = filter === 'missing' ? missing : filter === 'boarded' ? boarded : [...missing, ...boarded];
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((r) => r.passengerName.toLowerCase().includes(needle) || String(r.seatNumber) === needle);
  }, [filter, q, missing, boarded]);

  function board(row: DriverPassengerRow) {
    if (!tripId) return;
    boardTicket.mutate({ code: row.ticketCode, tripId });
  }

  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={20} color={S.onBlue} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Passengers</Text>
            {trip.data && (
              <Text style={styles.headerMeta} numberOfLines={2}>
                {trip.data.code} · {timeHM(trip.data.departureAt)} {trip.data.originCity} → {trip.data.destinationCity} · {trip.data.busPlate}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'tickets' } } as never)}
          >
            <Icon name="scan" size={20} color={S.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countValue}>
            {onBoard}
            <Text style={styles.countTotal}> / {total} on board</Text>
          </Text>
          {missingCount > 0 && (
            <View style={styles.missingPill}>
              <Text style={styles.missingPillText}>{missingCount} missing</Text>
            </View>
          )}
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: total ? `${(onBoard / total) * 100}%` : '0%' }]} />
        </View>
      </SafeAreaView>

      <View style={styles.body}>
        <View style={[styles.search, shadow]}>
          <Icon name="search" size={18} color={S.ink2} />
          <TextInput style={styles.searchInput} value={q} onChangeText={setQ} placeholder="Name or seat number" placeholderTextColor={S.ink3} />
        </View>

        <View style={styles.filters}>
          <FilterPill label={`All ${total}`} active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterPill label={`Missing ${missingCount}`} active={filter === 'missing'} onPress={() => setFilter('missing')} />
          <FilterPill label={`On board ${onBoard}`} active={filter === 'boarded'} onPress={() => setFilter('boarded')} />
        </View>

        <View style={[styles.listCard, shadow]}>
        <FlatList
          data={visible}
          keyExtractor={(r) => r.ticketCode}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<Text style={styles.empty}>{passengers.isPending ? 'Loading…' : 'Nobody here.'}</Text>}
          renderItem={({ item }) => {
            const on = !!item.boardedAt;
            return (
              <View style={styles.row}>
                <View style={[styles.seat, { backgroundColor: on ? S.blueSoft : S.cream }]}>
                  <Text style={[styles.seatText, { color: on ? S.blue : S.brown }]}>{item.seatNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.passengerName}
                  </Text>
                  <Text style={styles.code}>{item.ticketCode}</Text>
                </View>
                {on ? (
                  <View style={styles.onBoardPill}>
                    <Text style={styles.onBoardText}>On board {timeHM(item.boardedAt!)}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.boardBtn} onPress={() => board(item)} disabled={boardTicket.isPending} activeOpacity={0.85}>
                    <Text style={styles.boardText}>Board</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
        </View>
        <Text style={styles.footnote}>You see names and seats only, never phone or ID numbers. Tap a missing passenger to board them after checking their CNI.</Text>
      </View>
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.filter, active && styles.filterOn]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.filterText, active && styles.filterTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: S.bg },

  header: { backgroundColor: S.blue, paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: S.onBlue },
  headerMeta: { fontSize: 12.5, color: S.onBlue2, marginTop: 1 },
  scanBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: S.orange, alignItems: 'center', justifyContent: 'center' },

  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countValue: { fontSize: 34, fontWeight: '800', color: S.onBlue, letterSpacing: -1 },
  countTotal: { fontSize: 16, fontWeight: '800', color: S.onBlue, letterSpacing: 0 },
  missingPill: { backgroundColor: S.orange, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  missingPillText: { fontSize: 12, fontWeight: '800', color: S.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: S.card, borderRadius: 3 },

  body: { flex: 1, paddingHorizontal: 14, paddingTop: 14, gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: S.card, borderRadius: 14, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 15, color: S.ink },

  filters: { flexDirection: 'row', gap: 8 },
  filter: { paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: S.card, borderWidth: 1, borderColor: S.border, alignItems: 'center', justifyContent: 'center' },
  filterOn: { backgroundColor: S.blue, borderColor: S.blue },
  filterText: { fontSize: 14, fontWeight: '700', color: S.ink },
  filterTextOn: { color: S.onBlue, fontWeight: '800' },

  listCard: { flexShrink: 1, backgroundColor: S.card, borderRadius: 18, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: S.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  seat: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seatText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '800', color: S.ink },
  code: { fontFamily: MONO, fontSize: 12, color: S.ink2, marginTop: 2 },
  boardBtn: { backgroundColor: S.orange, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  boardText: { fontSize: 14, fontWeight: '800', color: S.ink },
  onBoardPill: { backgroundColor: S.greenSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  onBoardText: { fontSize: 12, fontWeight: '800', color: S.greenText },
  empty: { fontSize: 13, color: S.ink2, textAlign: 'center', paddingVertical: 20 },
  footnote: { fontSize: 12, color: S.ink2, textAlign: 'center', paddingTop: 2, paddingBottom: 24, paddingHorizontal: 6, lineHeight: 17 },
});
