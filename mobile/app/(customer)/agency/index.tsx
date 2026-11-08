import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgencyAvatar } from '@/components/ui/AgencyAvatar';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useAgencies } from '@/modules/agencies/agencies.queries';
import type { AgencyListItem } from '@contracts/api-types';

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={styles.stars}>
      <Text style={styles.starEmoji}>⭐</Text>
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function AgencyCard({ item }: { item: AgencyListItem }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/agency/${item.slug}`)}
      activeOpacity={0.85}
    >
      <AgencyAvatar agency={item} size={56} />
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.agencyName}>{item.name}</Text>
          {item.verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.ratingRow}>
          <StarRating rating={item.rating} />
          <Text style={styles.reviewCount}>({item.reviewCount.toLocaleString('fr-FR')} reviews)</Text>
        </View>
        <Text style={styles.cities} numberOfLines={1}>
          📍 {item.cities.join(' · ')}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function AgenciesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAgencies(search || undefined);

  const agencies = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.h3, { flex: 1 }]}>Agencies</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or city…"
          placeholderTextColor={Colors.inkDisabled}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={agencies}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>No agencies found</Text>
            </View>
          }
          renderItem={({ item }) => <AgencyCard item={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: FontSize.base, color: Colors.ink },
  clearIcon: { fontSize: 14, color: Colors.inkSecondary, padding: 4 },

  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardContent: { flex: 1, marginLeft: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  agencyName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  verifiedBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stars: { flexDirection: 'row', alignItems: 'center' },
  starEmoji: { fontSize: 13 },
  ratingText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink, marginLeft: 3 },
  reviewCount: { fontSize: FontSize.xs, color: Colors.inkSecondary, marginLeft: 4 },
  cities: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  chevron: { fontSize: 22, color: Colors.inkDisabled, marginLeft: 8 },

  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: FontSize.base, color: Colors.inkSecondary },
});
