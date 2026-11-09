import React from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useMyTickets } from '@/modules/booking/booking.queries';
import { useAgencies } from '@/modules/agencies/agencies.queries';
import { meCustomer } from '@contracts/mocks';
import type { AgencyListItem } from '@contracts/api-types';

const POPULAR = [
  { city: 'Yaoundé', duration: '4 h', agencies: 9, from: 4000 },
  { city: 'Bafoussam', duration: '5 h', agencies: 6, from: 5000 },
  { city: 'Kribi', duration: '3 h', agencies: 4, from: 3500 },
];

function formatPrice(n: number) { return n.toLocaleString('fr-FR'); }

function AgencyChip({ item, onPress }: { item: AgencyListItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.agencyChip} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.agencyChipAvatar}>
        <View style={[styles.agencyAvatarCircle, { backgroundColor: item.color }]}>
          <Text style={styles.agencyAvatarText}>{item.initials}</Text>
        </View>
        {/* Verified blue checkmark badge */}
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>✓</Text>
        </View>
      </View>
      <Text style={styles.agencyChipName} numberOfLines={1}>
        {item.name.split(' ')[0]}
      </Text>
      <Text style={styles.agencyChipRating}>★ {item.rating.toFixed(1)}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: tickets } = useMyTickets();
  const { data: agenciesPage } = useAgencies();
  const agencies = agenciesPage?.items ?? [];
  const nextTicket = tickets?.[0] ?? null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── DARK NAVY HEADER ── */}
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            {/* Top bar: logo + avatar */}
            <View style={styles.headerTopBar}>
              <View style={styles.logoRow}>
                <View style={styles.logoBox}>
                  <Text style={styles.logoT}>T</Text>
                  <View style={styles.logoDot} />
                </View>
                <Text style={styles.logoName}>TransitPro</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(customer)/(tabs)/profile')}
                style={styles.meAvatar}
              >
                <Text style={styles.meAvatarText}>ME</Text>
              </TouchableOpacity>
            </View>

            {/* Greeting + headline */}
            <View style={styles.headerBody}>
              <Text style={styles.headerGreeting}>Bonjour Marie,</Text>
              <Text style={styles.headerHeadline}>
                From{' '}
                <Text style={styles.headerHeadlineCity}>Douala</Text>
                {'\n'}to{' '}
                <Text style={styles.headerHeadlineWhere}>where?</Text>
              </Text>
              <Text style={styles.headerMeta}>Tue 3 Nov · 1 passenger</Text>

              {/* Action row */}
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.findTripsBtn}
                  onPress={() => router.push('/(customer)/search/' as never)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.findTripsBtnText}>Find trips  →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(customer)/(tabs)/parcels')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.trackParcelLink}>Track a parcel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ── NEXT TRIP TIMELINE ── */}
        {nextTicket ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>NEXT TRIP · TOMORROW</Text>
              <TouchableOpacity onPress={() => router.push(`/(customer)/booking/ticket?code=${nextTicket.code}`)}>
                <Text style={styles.sectionAction}>Ticket</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.nextTripCard}>
              {/* Timeline row */}
              <View style={styles.timelineRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeValue}>08:00</Text>
                  <Text style={styles.timeCity}>Douala, Akwa</Text>
                </View>
                {/* Progress line */}
                <View style={styles.timelineTrack}>
                  <View style={styles.timelineLeft} />
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineRight} />
                  <View style={styles.timelineOrangeDot} />
                </View>
                <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
                  <Text style={styles.timeValue}>12:00</Text>
                  <Text style={styles.timeCity}>Yaoundé</Text>
                </View>
              </View>
              <Text style={styles.timelineMeta}>
                Étoile Voyages · seat {nextTicket.seatNumber}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── VERIFIED AGENCIES ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>VERIFIED AGENCIES</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/agency/')}>
              <Text style={styles.sectionAction}>See all 24</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={agencies}
            keyExtractor={a => a.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.agencyList}
            renderItem={({ item }) => (
              <AgencyChip
                item={item}
                onPress={() => router.push(`/(customer)/agency/${item.slug}`)}
              />
            )}
          />
        </View>

        {/* ── POPULAR DESTINATIONS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>POPULAR FROM DOUALA</Text>
          {POPULAR.map(dest => (
            <TouchableOpacity
              key={dest.city}
              style={styles.popularRow}
              onPress={() => router.push(
                `/(customer)/search/results?from=Douala&to=${encodeURIComponent(dest.city)}&date=${new Date().toISOString().slice(0, 10)}&sort=earliest`
              )}
              activeOpacity={0.7}
            >
              <Text style={styles.popularCity}>{dest.city}</Text>
              <Text style={styles.popularMeta}>{dest.duration} · {dest.agencies} agencies</Text>
              <Text style={styles.popularPrice}>from {formatPrice(dest.from)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: {},

  // ── Header ──
  header: {
    backgroundColor: Colors.navy,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 24,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoT: { fontSize: 20, fontWeight: '900', color: Colors.primary, marginTop: -2 },
  logoDot: {
    position: 'absolute',
    bottom: 5,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  logoName: { fontSize: 17, fontWeight: '700', color: Colors.white },
  meAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meAvatarText: { fontSize: 13, fontWeight: '700', color: Colors.navy },

  headerBody: {},
  headerGreeting: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  headerHeadline: { fontSize: 36, fontWeight: '900', color: Colors.white, lineHeight: 42, marginBottom: 8 },
  headerHeadlineCity: { textDecorationLine: 'underline' },
  headerHeadlineWhere: { color: Colors.orange, textDecorationLine: 'underline', textDecorationStyle: 'dashed' },
  headerMeta: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 20 },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  findTripsBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
  },
  findTripsBtnText: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  trackParcelLink: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
    textDecorationLine: 'underline',
  },

  // ── Section ──
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary, letterSpacing: 0.8 },
  sectionAction: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  // ── Next trip ──
  nextTripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timeBlock: { width: 80 },
  timeValue: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  timeCity: { fontSize: 12, color: Colors.inkSecondary, marginTop: 2 },
  timelineTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  timelineLeft: { flex: 1, height: 2, backgroundColor: Colors.primary },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginHorizontal: 2 },
  timelineRight: { flex: 1, height: 2, backgroundColor: Colors.primary },
  timelineOrangeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.orange },
  timelineMeta: { fontSize: 13, color: Colors.inkSecondary, textAlign: 'center' },

  // ── Agency chips ──
  agencyList: { paddingRight: 4 },
  agencyChip: { alignItems: 'center', marginRight: 16, width: 64 },
  agencyChipAvatar: { marginBottom: 6, position: 'relative' },
  agencyAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agencyAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.navy },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  verifiedBadgeText: { fontSize: 9, color: Colors.white, fontWeight: '700' },
  agencyChipName: { fontSize: 11, fontWeight: '600', color: Colors.ink, textAlign: 'center' },
  agencyChipRating: { fontSize: 11, color: Colors.inkSecondary, textAlign: 'center' },

  // ── Popular destinations ──
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  popularCity: { fontSize: 16, fontWeight: '700', color: Colors.ink, flex: 1 },
  popularMeta: { fontSize: 13, color: Colors.inkSecondary, marginRight: 12 },
  popularPrice: { fontSize: 15, fontWeight: '700', color: Colors.ink },
});
