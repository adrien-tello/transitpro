import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useAgencies } from '@/modules/agencies/agencies.queries';
import type { AgencyListItem } from '@contracts/api-types';

type FilterTab = 'Top rated' | 'Most trips' | 'Parcels' | 'Near me';
const FILTER_TABS: FilterTab[] = ['Top rated', 'Most trips', 'Parcels', 'Near me'];

// Extended mock agencies to fill the list like the design (24 agencies, all verified)
const EXTRA_AGENCIES = [
  { id: 'ag_gc', slug: 'grassfield-coaches', name: 'Grassfield Coaches', initials: 'GC', color: '#F4A7A7', verified: true, rating: 4.1, reviewCount: 512, cities: ['Bamenda', 'Bafoussam', 'Douala'] },
  { id: 'ag_le', slug: 'littoral-express', name: 'Littoral Express', initials: 'LE', color: '#C4B5FD', verified: true, rating: 3.9, reviewCount: 318, cities: ['Douala', 'Limbé', 'Buea'] },
  { id: 'ag_st', slug: 'savane-transport', name: 'Savane Transport', initials: 'ST', color: '#93C5FD', verified: true, rating: 3.8, reviewCount: 204, cities: ['Garoua', 'Maroua', 'Ngaoundéré'] },
] as AgencyListItem[];

export default function AgenciesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Top rated');
  const { data } = useAgencies(search || undefined);

  const base = data?.items ?? [];
  const allAgencies = [...base, ...EXTRA_AGENCIES.filter(e => !base.find(b => b.id === e.id))];

  const filtered = search
    ? allAgencies.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.cities.some(c => c.toLowerCase().includes(search.toLowerCase()))
      )
    : allAgencies;

  function renderItem({ item, index }: { item: AgencyListItem; index: number }) {
    return (
      <TouchableOpacity
        style={styles.agencyRow}
        onPress={() => router.push(`/(customer)/agency/${item.slug}`)}
        activeOpacity={0.75}
      >
        {/* Rank number */}
        <Text style={styles.rank}>{index + 1}</Text>

        {/* Avatar with verified badge */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: item.color }]}>
            <Text style={styles.avatarText}>{item.initials}</Text>
          </View>
          {item.verified ? (
            <View style={styles.verifiedDot}>
              <Text style={styles.verifiedDotText}>✓</Text>
            </View>
          ) : null}
        </View>

        {/* Name + cities */}
        <View style={styles.agencyInfo}>
          <Text style={styles.agencyName}>{item.name}</Text>
          <Text style={styles.agencyCities} numberOfLines={1}>
            {item.cities.join(' · ')}
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingValue}>{item.rating.toFixed(1)}</Text>
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.reviewCount}>{item.reviewCount.toLocaleString('fr-FR')} reviews</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>
          24 agencies,{'\n'}
          <Text style={styles.titleBlue}>all verified.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Each one showed us its RCCM, NIU and transport licence before selling a single ticket.
        </Text>
      </View>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Agency name or city"
          placeholderTextColor={Colors.inkMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.filterTabs}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={styles.filterTab}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
            {activeFilter === tab ? <View style={styles.filterTabUnderline} /> : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LIST ── */}
      <FlatList
        data={filtered}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  backArrow: { fontSize: 28, color: Colors.ink },

  titleBlock: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: Colors.ink, lineHeight: 38 },
  titleBlue: { color: Colors.primary },
  subtitle: { fontSize: 14, color: Colors.inkSecondary, lineHeight: 20, marginTop: 6 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.surfaceAlt, borderRadius: 28,
    paddingHorizontal: 18, height: 48,
  },
  searchIcon: { fontSize: 16, color: Colors.inkMuted },
  searchInput: { flex: 1, fontSize: 15, color: Colors.ink },

  filterTabs: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 },
  filterTab: { paddingRight: 24, paddingVertical: 12, position: 'relative' },
  filterTabText: { fontSize: 15, color: Colors.inkSecondary, fontWeight: '500' },
  filterTabTextActive: { color: Colors.ink, fontWeight: '700' },
  filterTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 24, height: 2, backgroundColor: Colors.ink, borderRadius: 1 },

  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: Colors.border },

  agencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 14 },
  rank: { width: 24, fontSize: 15, color: Colors.inkMuted, fontWeight: '600', textAlign: 'center' },

  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: Colors.navy },
  verifiedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surface,
  },
  verifiedDotText: { fontSize: 9, color: Colors.white, fontWeight: '700' },

  agencyInfo: { flex: 1 },
  agencyName: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  agencyCities: { fontSize: 13, color: Colors.inkSecondary, marginTop: 2 },

  ratingBlock: { alignItems: 'flex-end' },
  ratingValue: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  ratingStar: { fontSize: 14, color: Colors.orange },
  reviewCount: { fontSize: 12, color: Colors.inkSecondary },
});
