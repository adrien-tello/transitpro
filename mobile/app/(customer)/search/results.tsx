import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useTripSearch } from '@/modules/booking/booking.queries';
import type { TripSearchResult } from '@contracts/api-types';

type SortKey = 'earliest' | 'cheapest' | 'rating';

// Date tabs: Mon 2, Tue 3*, Wed 4, Thu 5, Fri 6
const DATE_TABS = [
  { label: 'Mon 2', offset: -1 },
  { label: 'Tue 3', offset: 0 },
  { label: 'Wed 4', offset: 1 },
  { label: 'Thu 5', offset: 2 },
  { label: 'Fri 6', offset: 3 },
];

function formatPrice(n: number) { return n.toLocaleString('fr-FR'); }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

function TagChip({ tag }: { tag: string }) {
  const label = tag === 'CHEAPEST' ? 'Cheapest' : tag === 'BEST_RATED' ? 'Best rated' : 'Fastest';
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipText}>{label}</Text>
    </View>
  );
}

function TripRow({ trip, onPress }: { trip: TripSearchResult; onPress: () => void }) {
  const low = trip.seatsLeft <= 5;
  return (
    <TouchableOpacity style={styles.tripRow} onPress={onPress} activeOpacity={0.75}>
      {/* Left: times */}
      <View style={styles.tripTimes}>
        <Text style={styles.tripDep}>{formatTime(trip.departureAt)}</Text>
        <Text style={styles.tripArr}>{formatTime(trip.arrivalEta)}</Text>
      </View>

      {/* Center timeline dot */}
      <View style={styles.tripDotCol}>
        <View style={[styles.tripDot, { borderColor: trip.agency.color }]} />
        <View style={styles.tripDotLine} />
      </View>

      {/* Right: agency info + tag */}
      <View style={styles.tripInfo}>
        <View style={styles.tripAgencyRow}>
          <Text style={styles.tripAgencyName}>{trip.agency.name}</Text>
          {trip.agency.verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.tripMeta}>
          ★ {trip.agency.rating.toFixed(1)} · {trip.busClass} · {formatDuration(trip.durationMinutes)}
        </Text>
        {trip.tag ? <TagChip tag={trip.tag} /> : null}
      </View>

      {/* Far right: price + seats */}
      <View style={styles.tripRight}>
        <Text style={styles.tripPrice}>{formatPrice(trip.price)}</Text>
        <Text style={[styles.tripSeats, low && styles.tripSeatsLow]}>
          {low ? `${trip.seatsLeft} seats left` : `${trip.seatsLeft} seats`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from: string; to: string; date: string; sort: string }>();
  const [sort, setSort] = useState<SortKey>((params.sort as SortKey) ?? 'earliest');
  const [activeDateIdx, setActiveDateIdx] = useState(1);

  const { data: trips } = useTripSearch(
    { from: params.from ?? 'Douala', to: params.to ?? 'Yaoundé', date: params.date ?? '', sort },
    true,
  );

  const SORT_TABS: { key: SortKey; label: string }[] = [
    { key: 'earliest', label: 'Earliest' },
    { key: 'cheapest', label: 'Cheapest' },
    { key: 'rating', label: 'Best rated' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── DARK HEADER ── */}
      <View style={styles.header}>
        {/* Back + title */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerRoute}>
              {params.from ?? 'Douala'} → {params.to ?? 'Yaoundé'}
            </Text>
            <Text style={styles.headerMeta}>
              {trips?.length ?? 0} departures · 1 passenger
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Date tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateTabs}>
          {DATE_TABS.map((t, i) => (
            <TouchableOpacity
              key={t.label}
              style={styles.dateTab}
              onPress={() => setActiveDateIdx(i)}
            >
              <Text style={[styles.dateTabText, activeDateIdx === i && styles.dateTabTextActive]}>
                {t.label}
              </Text>
              {activeDateIdx === i ? <View style={styles.dateTabUnderline} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── SORT TABS ── */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort</Text>
        {SORT_TABS.map(s => (
          <TouchableOpacity key={s.key} style={styles.sortTab} onPress={() => setSort(s.key)}>
            <Text style={[styles.sortTabText, sort === s.key && styles.sortTabTextActive]}>
              {s.label}
            </Text>
            {sort === s.key ? <View style={styles.sortTabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TRIP LIST ── */}
      <FlatList
        data={trips ?? []}
        keyExtractor={t => t.tripId}
        renderItem={({ item }) => (
          <TripRow
            trip={item}
            onPress={() => router.push(`/(customer)/booking/seats?tripId=${item.tripId}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  // ── Header ──
  header: { backgroundColor: Colors.navy, paddingBottom: 0 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 32, alignItems: 'center' },
  backArrow: { fontSize: 28, color: Colors.white, marginTop: -4 },
  headerTitle: { flex: 1 },
  headerRoute: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  editBtn: { fontSize: 15, color: Colors.white, fontWeight: '600', textDecorationLine: 'underline' },

  dateTabs: { paddingLeft: 16 },
  dateTab: { paddingRight: 28, paddingVertical: 12, position: 'relative', alignItems: 'center' },
  dateTabText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  dateTabTextActive: { color: Colors.white, fontWeight: '700' },
  dateTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 28,
    height: 3,
    backgroundColor: Colors.orange,
    borderRadius: 2,
  },

  // ── Sort bar ──
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sortLabel: { fontSize: 14, color: Colors.inkSecondary, marginRight: 16 },
  sortTab: { paddingVertical: 14, marginRight: 24, position: 'relative' },
  sortTabText: { fontSize: 14, color: Colors.inkSecondary, fontWeight: '500' },
  sortTabTextActive: { color: Colors.ink, fontWeight: '700' },
  sortTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.ink,
    borderRadius: 1,
  },

  // ── Trip rows ──
  listContent: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 20 },

  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
  },
  tripTimes: { width: 52, marginRight: 4 },
  tripDep: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  tripArr: { fontSize: 13, color: Colors.inkSecondary, marginTop: 4 },

  tripDotCol: { alignItems: 'center', width: 24, paddingTop: 6, marginRight: 10 },
  tripDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: Colors.surface,
  },
  tripDotLine: { flex: 1, width: 1, backgroundColor: Colors.border, marginTop: 2 },

  tripInfo: { flex: 1, marginRight: 8 },
  tripAgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  tripAgencyName: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadgeText: { fontSize: 9, color: Colors.white, fontWeight: '700' },
  tripMeta: { fontSize: 13, color: Colors.inkSecondary },

  tagChip: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagChipText: { fontSize: 12, fontWeight: '700', color: Colors.orangeDark },

  tripRight: { alignItems: 'flex-end', minWidth: 70 },
  tripPrice: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  tripSeats: { fontSize: 13, color: Colors.success, marginTop: 4 },
  tripSeatsLow: { color: Colors.error, fontWeight: '700' },
});
