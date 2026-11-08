import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgencyAvatar } from '@/components/ui/AgencyAvatar';
import { Card } from '@/components/ui/Card';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useAgencyProfile } from '@/modules/agencies/agencies.queries';

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatVerifiedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RatingRow({ label, value }: { label: string; value: number }) {
  const filled = Math.round(value);
  return (
    <View style={styles.ratingRowItem}>
      <Text style={styles.ratingRowLabel}>{label}</Text>
      <View style={styles.ratingRowRight}>
        <Text style={styles.ratingStars}>{'⭐'.repeat(filled)}</Text>
        <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
      </View>
    </View>
  );
}

export default function AgencyProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: profile, isLoading } = useAgencyProfile(slug ?? '');

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.h4, { flex: 1 }]} numberOfLines={1}>{profile.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <AgencyAvatar agency={profile} size={80} />
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName}>{profile.name}</Text>
            {profile.verified ? (
              <View style={styles.verifiedChip}>
                <Text style={styles.verifiedChipText}>✓ Verified</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroRating}>
            <Text style={styles.starEmoji}>⭐</Text>
            <Text style={styles.heroRatingText}>{profile.rating.toFixed(1)}</Text>
            <Text style={styles.heroReviewCount}>
              ({profile.reviewCount.toLocaleString('fr-FR')} reviews)
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Since {profile.since}</Text>
              <Text style={styles.statLabel}>Founded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.busCount}</Text>
              <Text style={styles.statLabel}>Buses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.branchCount}</Text>
              <Text style={styles.statLabel}>Branches</Text>
            </View>
          </View>
        </View>

        {/* Ratings breakdown */}
        <View style={styles.section}>
          <Text style={[Typography.h4, styles.sectionTitle]}>Ratings</Text>
          <Card>
            <RatingRow label="On time" value={profile.ratings.onTime} />
            <RatingRow label="Comfort" value={profile.ratings.comfort} />
            <RatingRow label="Parcels" value={profile.ratings.parcels} />
            <RatingRow label="Staff" value={profile.ratings.staff} />
          </Card>
        </View>

        {/* Cities served */}
        <View style={styles.section}>
          <Text style={[Typography.h4, styles.sectionTitle]}>Routes</Text>
          <Card>
            <Text style={styles.citiesText}>📍 {profile.cities.join('  ·  ')}</Text>
            <View style={styles.classesPillRow}>
              {profile.classes.map(cls => (
                <View
                  key={cls}
                  style={[styles.classPill, cls === 'VIP' ? styles.classPillVip : styles.classPillClassic]}
                >
                  <Text style={[styles.classPillText, cls === 'VIP' ? styles.classPillVipText : styles.classPillClassicText]}>
                    {cls}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Today's departures */}
        {profile.departuresToday.length > 0 ? (
          <View style={styles.section}>
            <Text style={[Typography.h4, styles.sectionTitle]}>Today's departures</Text>
            <Card noPadding>
              {profile.departuresToday.map((dep, i) => (
                <TouchableOpacity
                  key={dep.tripId}
                  style={[
                    styles.departureRow,
                    i < profile.departuresToday.length - 1 && styles.departureRowBorder,
                  ]}
                  onPress={() => router.push(`/(customer)/booking/seats?tripId=${dep.tripId}`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.depTime}>{formatTime(dep.departureAt)}</Text>
                  <Text style={styles.depDest}>→ {dep.destinationCity}</Text>
                  <Text style={styles.depPrice}>{formatPrice(dep.price)}</Text>
                  <Text style={styles.depChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Latest review */}
        {profile.latestReview ? (
          <View style={styles.section}>
            <Text style={[Typography.h4, styles.sectionTitle]}>Latest review</Text>
            <Card>
              <Text style={styles.reviewQuote}>"{profile.latestReview.comment}"</Text>
              <Text style={styles.reviewAuthor}>
                — {profile.latestReview.authorName} · {profile.latestReview.tripCode}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Verified notice */}
        <View style={styles.section}>
          <Card style={styles.verifiedCard}>
            <Text style={styles.verifiedCardIcon}>🛡️</Text>
            <View>
              <Text style={styles.verifiedCardTitle}>Verified by TransitPro</Text>
              <Text style={styles.verifiedCardSubtitle}>
                On {formatVerifiedDate(profile.verifiedAt)}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, marginTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },

  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  heroName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  verifiedChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedChipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  heroRating: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  starEmoji: { fontSize: 16 },
  heroRatingText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    marginLeft: 4,
  },
  heroReviewCount: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginLeft: 4 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  statLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { marginBottom: 12 },

  ratingRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ratingRowLabel: { fontSize: FontSize.base, color: Colors.ink },
  ratingRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingStars: { fontSize: 13 },
  ratingValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink },

  citiesText: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginBottom: 12 },
  classesPillRow: { flexDirection: 'row', gap: 8 },
  classPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  classPillVip: { backgroundColor: '#FEF3C7' },
  classPillVipText: { color: '#B45309', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  classPillClassic: { backgroundColor: Colors.surfaceAlt },
  classPillClassicText: { color: Colors.inkSecondary, fontSize: FontSize.sm },

  departureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  departureRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  depTime: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink, width: 52 },
  depDest: { flex: 1, fontSize: FontSize.sm, color: Colors.inkSecondary },
  depPrice: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primary },
  depChevron: { fontSize: 20, color: Colors.inkDisabled },

  reviewQuote: {
    fontSize: FontSize.base,
    color: Colors.ink,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 10,
  },
  reviewAuthor: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  verifiedCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  verifiedCardIcon: { fontSize: 28 },
  verifiedCardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.ink },
  verifiedCardSubtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 2 },

  bottomPad: { height: 32 },
});
