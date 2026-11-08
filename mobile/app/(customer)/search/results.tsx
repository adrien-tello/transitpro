import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgencyAvatar } from '@/components/ui/AgencyAvatar';
import { Badge, tripTagVariant } from '@/components/ui/Badge';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useTripSearch } from '@/modules/booking/booking.queries';
import type { TripSearchResult } from '@contracts/api-types';

type SortOption = 'earliest' | 'cheapest' | 'rating';

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function TripCard({ trip }: { trip: TripSearchResult }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.tripCard}
      activeOpacity={0.88}
      onPress={() => router.push(`/(customer)/booking/seats?tripId=${trip.tripId}`)}
    >
      {/* Top row: agency + tag */}
      <View style={styles.tripTop}>
        <View style={styles.agencyRow}>
          <AgencyAvatar agency={trip.agency} size={36} />
          <View style={{ marginLeft: 10 }}>
            <View style={styles.agencyNameRow}>
              <Text style={styles.agencyName}>{trip.agency.name}</Text>
              {trip.agency.verified ? (
                <Text style={styles.verifiedMark}> ✓</Text>
              ) : null}
            </View>
            <Badge
              label={trip.busClass}
              variant={trip.busClass === 'VIP' ? 'vip' : 'classic'}
            />
          </View>
        </View>
        {trip.tag ? (
          <Badge label={trip.tag.replace('_', ' ')} variant={tripTagVariant(trip.tag)} />
        ) : null}
      </View>

      {/* Times + duration */}
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{formatTime(trip.departureAt)}</Text>
          <Text style={styles.cityText}>{trip.originCity}</Text>
        </View>

        <View style={styles.durationBlock}>
          <View style={styles.durationLine} />
          <Text style={styles.durationText}>{formatDuration(trip.durationMinutes)}</Text>
          <View style={styles.durationLine} />
        </View>

        <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.timeText}>{formatTime(trip.arrivalEta)}</Text>
          <Text style={styles.cityText}>{trip.destinationCity}</Text>
        </View>
      </View>

      {/* Price + seats */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(trip.price)}</Text>
        <Text
          style={[
            styles.seatsLeft,
            trip.seatsLeft <= 5 && styles.seatsLeftRed,
          ]}
        >
          {trip.seatsLeft} seat{trip.seatsLeft !== 1 ? 's' : ''} left
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from: string; to: string; date: string; sort: string }>();

  const [sort, setSort] = useState<SortOption>(
    (params.sort as SortOption) ?? 'earliest',
  );

  const { data: trips, isLoading, isError } = useTripSearch(
    {
      from: params.from ?? '',
      to: params.to ?? '',
      date: params.date ?? '',
      sort,
    },
    !!(params.from && params.to && params.date),
  );

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'earliest', label: 'Earliest' },
    { value: 'cheapest', label: 'Cheapest' },
    { value: 'rating', label: 'Best rated' },
  ];

  function formatDateHeader(s: string) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.h4]}>
            {params.from} → {params.to}
          </Text>
          <Text style={styles.dateLabel}>{formatDateHeader(params.date)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Sort pills */}
      <View style={styles.sortBar}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load trips. Please try again.</Text>
        </View>
      ) : !trips?.length ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚍</Text>
          <Text style={styles.emptyTitle}>No trips found</Text>
          <Text style={styles.emptySubtitle}>
            No trips found for this route on {formatDateHeader(params.date)}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.tripId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <TripCard trip={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12, marginTop: 2 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },
  dateLabel: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  editBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },

  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortChipText: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  sortChipTextActive: { color: Colors.white, fontWeight: FontWeight.semibold },

  loader: { flex: 1, marginTop: 60 },
  list: { padding: 20, paddingBottom: 32 },

  tripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tripTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  agencyRow: { flexDirection: 'row', alignItems: 'center' },
  agencyNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  agencyName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink },
  verifiedMark: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.bold },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeBlock: { flex: 1 },
  timeText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  cityText: { fontSize: FontSize.xs, color: Colors.inkSecondary, marginTop: 2 },
  durationBlock: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  durationLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  durationText: {
    fontSize: FontSize.xs,
    color: Colors.inkSecondary,
    marginHorizontal: 6,
    textAlign: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  price: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },
  seatsLeft: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  seatsLeftRed: { color: Colors.error, fontWeight: FontWeight.semibold },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: Colors.error, fontSize: FontSize.base, textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.ink },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 4, textAlign: 'center' },
});
