// Driver · Passengers (design picture "Driver · Passengers"). Spec: fidel-staff-app.md 4.5.
// Privacy: names, seats, ticket codes and status only. Never phone or ID numbers.
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { BoardingCheck, ManifestPassenger } from '../staff.types';
import { useTripManifest } from '../staff.screens.queries';
import { useBoardTicket, useCheckTicket } from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatTime } from '../staff.format';
import { StaffIcon } from './StaffIcon';
import { ProgressBar } from './ProgressBar';
import { EmptyState, ErrorState, SkeletonBlock } from './StaffStates';
import { RefusedTicketSheet, ValidTicketSheet } from './ScanResultSheet';

type Filter = 'all' | 'missing' | 'boarded';

export function PassengersScreen({ tripId }: { tripId: string }) {
  const router = useRouter();
  const manifest = useTripManifest(tripId);
  const [filter, setFilter] = useState<Filter>('missing');
  const [q, setQ] = useState('');
  const check = useCheckTicket();
  const board = useBoardTicket();
  const [sheet, setSheet] = useState<{ code: string; result: BoardingCheck } | null>(null);

  const rows = manifest.data?.passengers ?? [];
  const boarded = rows.filter((p) => p.status === 'BOARDED').length;
  const missing = rows.length - boarded;

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((p) => (filter === 'all' ? true : filter === 'missing' ? p.status !== 'BOARDED' : p.status === 'BOARDED'))
      .filter((p) => !term || p.passengerName.toLowerCase().includes(term) || String(p.seatNumber) === term)
      .sort((a, b) => a.seatNumber - b.seatNumber);
  }, [rows, filter, q]);

  // Manual boarding = same check + confirm as the scanner (fallback when a phone is dead).
  function openBoard(p: ManifestPassenger) {
    check.mutate(
      { code: p.ticketCode, tripId },
      { onSuccess: (result) => setSheet({ code: p.ticketCode, result }) },
    );
  }

  const trip = manifest.data?.trip;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.round}>
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <StaffIcon name="chevron" size={18} color={StaffColors.onDark} />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Passengers</Text>
              {trip && (
                <Text style={styles.sub} numberOfLines={2}>
                  {trip.code} · {formatTime(trip.departureAt)} {trip.originCity} → {trip.destinationCity} · {trip.busPlate}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan tickets"
              onPress={() => router.navigate({ pathname: '/(staff)/(tabs)/scan', params: { mode: 'tickets' } } as never)}
              style={styles.scanBtn}
            >
              <StaffIcon name="scan" size={20} color={StaffColors.amberInk} />
            </Pressable>
          </View>
          {manifest.data && (
            <>
              <View style={styles.countRow}>
                <Text style={styles.count}>
                  {boarded}
                  <Text style={styles.countTotal}> / {rows.length} on board</Text>
                </Text>
                {missing > 0 && (
                  <View style={styles.missingPill}>
                    <Text style={styles.missingText}>{missing} missing</Text>
                  </View>
                )}
              </View>
              <ProgressBar value={boarded} total={rows.length} color={StaffColors.onDark} track={StaffColors.heroTrack} />
            </>
          )}
        </SafeAreaView>
      </View>

      {manifest.isPending ? (
        <View style={styles.pad}>
          <SkeletonBlock height={48} />
          <SkeletonBlock height={320} style={{ marginTop: 12 }} />
        </View>
      ) : manifest.isError ? (
        <View style={styles.pad}>
          <ErrorState message={manifest.error.message} onRetry={() => manifest.refetch()} retrying={manifest.isRefetching} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(p) => p.ticketCode}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={manifest.isRefetching} onRefresh={() => manifest.refetch()} tintColor={StaffColors.primary} />
          }
          ListHeaderComponent={
            <>
              <View style={styles.search}>
                <StaffIcon name="search" size={18} color={StaffColors.hint} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Name or seat number"
                  placeholderTextColor={StaffColors.hint}
                  style={styles.searchInput}
                  autoCorrect={false}
                />
              </View>
              <View style={styles.chips}>
                <Chip label={`All ${rows.length}`} active={filter === 'all'} onPress={() => setFilter('all')} />
                <Chip label={`Missing ${missing}`} active={filter === 'missing'} onPress={() => setFilter('missing')} />
                <Chip label={`On board ${boarded}`} active={filter === 'boarded'} onPress={() => setFilter('boarded')} />
              </View>
              {shown.length > 0 && <View style={styles.listTop} />}
            </>
          }
          renderItem={({ item, index }) => (
            <Row
              p={item}
              first={index === 0}
              last={index === shown.length - 1}
              busy={check.isPending && check.variables?.code === item.ticketCode}
              onBoard={() => openBoard(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title={filter === 'missing' && !q ? 'Everyone is on board' : 'No passenger found'}
              text={filter === 'missing' && !q ? 'All sold tickets are scanned.' : 'Try another name or seat number.'}
            />
          }
          ListFooterComponent={
            <Text style={styles.footer}>
              You see names and seats only, never phone or ID numbers. Tap a missing passenger to board them after checking
              their CNI.
            </Text>
          }
        />
      )}

      {sheet && trip && sheet.result.ok && (
        <ValidTicketSheet
          trip={trip}
          code={sheet.code}
          check={sheet.result}
          boarding={board.isPending}
          error={board.error?.message ?? null}
          onConfirm={() =>
            board.mutate(
              { code: sheet.code, tripId },
              {
                onSuccess: () => {
                  setSheet(null);
                  board.reset();
                },
              },
            )
          }
          onCancel={() => {
            setSheet(null);
            board.reset();
          }}
        />
      )}
      {sheet && trip && !sheet.result.ok && (
        <RefusedTicketSheet
          code={sheet.code}
          check={sheet.result}
          onPassengerList={() => setSheet(null)}
          onScanNext={() => setSheet(null)}
        />
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Row({
  p,
  first,
  last,
  busy,
  onBoard,
}: {
  p: ManifestPassenger;
  first: boolean;
  last: boolean;
  busy: boolean;
  onBoard: () => void;
}) {
  const boarded = p.status === 'BOARDED';
  return (
    <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !last && styles.divider]}>
      <View style={[styles.seat, { backgroundColor: boarded ? StaffColors.primaryTint : StaffColors.warningTint }]}>
        <Text style={[styles.seatText, { color: boarded ? StaffColors.primaryInk : StaffColors.warning }]}>{p.seatNumber}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {p.passengerName}
        </Text>
        <Text style={styles.code}>{p.ticketCode}</Text>
      </View>
      {boarded ? (
        <View style={styles.onBoard}>
          <Text style={styles.onBoardText}>On board {p.boardedAt ? formatTime(p.boardedAt) : ''}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Board ${p.passengerName}, seat ${p.seatNumber}`}
          onPress={onBoard}
          disabled={busy}
          style={({ pressed }) => [styles.boardBtn, (pressed || busy) && { opacity: 0.7 }]}
        >
          <Text style={styles.boardText}>{busy ? '…' : 'Board'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.background },
  pad: { padding: StaffSpace.side },
  header: {
    backgroundColor: StaffColors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: StaffSpace.side,
    paddingBottom: 18,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: StaffColors.heroTile, alignItems: 'center', justifyContent: 'center' },
  title: { color: StaffColors.onDark, fontSize: 20, fontWeight: '800' },
  sub: { color: StaffColors.onPrimaryMuted, fontSize: 12, marginTop: 2 },
  scanBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: StaffColors.accent, alignItems: 'center', justifyContent: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  count: { color: StaffColors.onDark, fontSize: 32, fontWeight: '800' },
  countTotal: { fontSize: 15, fontWeight: '600', color: StaffColors.onDark },
  missingPill: { backgroundColor: StaffColors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  missingText: { color: StaffColors.amberInk, fontSize: 12, fontWeight: '700' },

  listContent: { paddingHorizontal: StaffSpace.side, paddingTop: 14, paddingBottom: 40 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: StaffColors.surface,
    borderWidth: 1,
    borderColor: StaffColors.line,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: StaffColors.navy, height: 48 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: StaffColors.surface,
    borderWidth: 1,
    borderColor: StaffColors.line,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: StaffColors.primary, borderColor: StaffColors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: StaffColors.navy },
  chipTextActive: { color: StaffColors.onDark },
  listTop: { height: 0 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: StaffColors.surface, paddingHorizontal: 12, paddingVertical: 10 },
  rowFirst: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  rowLast: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  seat: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seatText: { fontSize: 15, fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  code: { fontFamily: monoFont, fontSize: 12, color: StaffColors.muted, marginTop: 2 },
  onBoard: { backgroundColor: StaffColors.successTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  onBoardText: { color: StaffColors.success, fontSize: 12, fontWeight: '700' },
  boardBtn: {
    minHeight: 36,
    minWidth: 64,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: StaffColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardText: { color: StaffColors.amberInk, fontSize: 13, fontWeight: '800' },
  footer: { fontSize: 12, color: StaffColors.muted, textAlign: 'center', marginTop: 14, lineHeight: 18, paddingHorizontal: 8 },
});
