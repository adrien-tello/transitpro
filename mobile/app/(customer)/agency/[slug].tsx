import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useAgencyProfile } from '@/modules/agencies/agencies.queries';

function formatPrice(n: number) { return n.toLocaleString('fr-FR') + ' FCFA'; }
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatVerifiedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** Horizontal rating bar exactly as in design */
function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <View style={ratingStyles.row}>
      <Text style={ratingStyles.label}>{label}</Text>
      <View style={ratingStyles.track}>
        <View style={[ratingStyles.fill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={ratingStyles.value}>{value.toFixed(1)}</Text>
    </View>
  );
}
const ratingStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { width: 72, fontSize: 15, color: Colors.inkSecondary },
  track: { flex: 1, height: 8, backgroundColor: Colors.ratingBarBg, borderRadius: 4, marginHorizontal: 12, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: Colors.ratingBar, borderRadius: 4 },
  value: { fontSize: 15, fontWeight: '700', color: Colors.ink, width: 28, textAlign: 'right' },
});

/** Wave shape for header background */
function WaveHeader({ color }: { color: string }) {
  return (
    <View style={[waveStyles.container, { backgroundColor: color }]}>
      {/* Simple wave simulation with rounded views */}
      <View style={[waveStyles.wave1, { backgroundColor: color }]} />
      <View style={[waveStyles.wave2, { backgroundColor: color }]} />
    </View>
  );
}
const waveStyles = StyleSheet.create({
  container: { height: 160, overflow: 'hidden' },
  wave1: {
    position: 'absolute', top: 80, left: -40, right: -40, height: 80,
    borderRadius: 40, opacity: 0.5,
    transform: [{ scaleX: 1.4 }],
  },
  wave2: {
    position: 'absolute', top: 100, left: -80, right: -60, height: 80,
    borderRadius: 40, opacity: 0.3,
    transform: [{ scaleX: 1.6 }],
  },
});

export default function AgencyProfileScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: profile } = useAgencyProfile(slug ?? 'etoile-voyages');

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* ── GOLDEN WAVE HEADER ── */}
      <View style={[styles.heroContainer, { backgroundColor: profile.color }]}>
        {/* Wavy background shapes */}
        <View style={[styles.waveBg1, { backgroundColor: profile.color }]} />
        <View style={[styles.waveBg2, { backgroundColor: profile.color }]} />

        {/* Back + bookmark buttons */}
        <SafeAreaView edges={['top']} style={styles.heroButtons}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
            <Text style={styles.heroBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroBtn}>
            <Text style={styles.heroBtnText}>🔖</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── AVATAR (overlaps header) ── */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: profile.color }]}>
            <Text style={styles.avatarText}>{profile.initials}</Text>
          </View>
        </View>

        {/* ── NAME + META ── */}
        <View style={styles.nameMeta}>
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedIcon}>✅</Text>
            <Text style={styles.verifiedText}>Verified · {formatVerifiedDate(profile.verifiedAt)}</Text>
          </View>
          <Text style={styles.agencyName}>{profile.name}</Text>
          <Text style={styles.agencyMeta}>
            Since {profile.since} · {profile.branchCount} branches · {profile.busCount} buses · {profile.classes.join(' and ')}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* ── RATINGS ── */}
        <View style={styles.ratingsSection}>
          <View style={styles.ratingsBig}>
            <Text style={styles.ratingsBigNum}>{profile.rating.toFixed(1)}</Text>
            <Text style={styles.ratingsBigSub}>{profile.reviewCount.toLocaleString('fr-FR')} rated trips</Text>
          </View>
          <View style={styles.ratingsBars}>
            <RatingBar label="On time" value={profile.ratings.onTime} />
            <RatingBar label="Comfort" value={profile.ratings.comfort} />
            <RatingBar label="Parcels" value={profile.ratings.parcels} />
            <RatingBar label="Staff" value={profile.ratings.staff} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── LEAVING TODAY ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>LEAVING TODAY</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>All routes</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.departureList}>
            {profile.departuresToday.map((dep, i) => (
              <TouchableOpacity
                key={dep.tripId}
                style={[styles.departureCard, i === 0 && styles.departureCardActive]}
                onPress={() => router.push(`/(customer)/booking/seats?tripId=${dep.tripId}`)}
                activeOpacity={0.85}
              >
                <Text style={[styles.depTime, i === 0 && styles.depTimeActive]}>
                  {formatTime(dep.departureAt).replace(':', ' : ')}
                </Text>
                <Text style={[styles.depDest, i === 0 && styles.depDestActive]}>to {dep.destinationCity}</Text>
                <Text style={[styles.depPrice, i === 0 && styles.depPriceActive]}>{formatPrice(dep.price)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── LATEST REVIEW QUOTE ── */}
        {profile.latestReview ? (
          <View style={styles.quoteSection}>
            <Text style={styles.quoteMarks}>"</Text>
            <Text style={styles.quoteText}>{profile.latestReview.comment}</Text>
            <Text style={styles.quoteAuthor}>
              {profile.latestReview.authorName} · <Text style={styles.quoteTrip}>rated after trip {profile.latestReview.tripCode}</Text>
            </Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── DUAL CTA FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtnOutline}>
          <Text style={styles.footerBtnOutlineText}>Send parcel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.footerBtnFilled}
          onPress={() => router.push('/(customer)/search/' as never)}
          activeOpacity={0.9}
        >
          <Text style={styles.footerBtnFilledText}>Book a trip  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  // Wave header
  heroContainer: { height: 160, position: 'relative', overflow: 'hidden' },
  waveBg1: {
    position: 'absolute', bottom: -30, left: -60, right: -40,
    height: 120, borderRadius: 60, opacity: 0.6,
    transform: [{ scaleX: 1.3 }],
  },
  waveBg2: {
    position: 'absolute', bottom: -50, left: -20, right: -80,
    height: 120, borderRadius: 60, opacity: 0.35,
    transform: [{ scaleX: 1.5 }],
  },
  heroButtons: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 4,
  },
  heroBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnText: { fontSize: 22, color: Colors.ink },

  scroll: { backgroundColor: Colors.surface },

  // Avatar overlapping header
  avatarContainer: { alignItems: 'flex-start', paddingHorizontal: 20, marginTop: -40 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: Colors.surface,
  },
  avatarText: { fontSize: 26, fontWeight: '900', color: Colors.navy },

  // Name area
  nameMeta: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  verifiedIcon: { fontSize: 16 },
  verifiedText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  agencyName: { fontSize: 26, fontWeight: '900', color: Colors.ink, marginBottom: 6 },
  agencyMeta: { fontSize: 14, color: Colors.inkSecondary, lineHeight: 20 },

  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },

  // Ratings section
  ratingsSection: {
    flexDirection: 'row', padding: 20, gap: 20, alignItems: 'flex-start',
  },
  ratingsBig: { alignItems: 'center', width: 100 },
  ratingsBigNum: { fontSize: 52, fontWeight: '900', color: Colors.ink, lineHeight: 58 },
  ratingsBigSub: { fontSize: 13, color: Colors.inkSecondary, textAlign: 'center', lineHeight: 18 },
  ratingsBars: { flex: 1, paddingTop: 6 },

  section: { padding: 20, paddingBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary, letterSpacing: 0.8 },
  sectionAction: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  departureList: { gap: 10, paddingBottom: 20, paddingRight: 20 },
  departureCard: {
    width: 160, borderRadius: 16, padding: 16,
    backgroundColor: Colors.surfaceAlt,
  },
  departureCardActive: { backgroundColor: Colors.navy },
  depTime: { fontSize: 28, fontWeight: '900', color: Colors.ink, marginBottom: 6 },
  depTimeActive: { color: Colors.white },
  depDest: { fontSize: 14, color: Colors.inkSecondary, marginBottom: 4 },
  depDestActive: { color: 'rgba(255,255,255,0.7)' },
  depPrice: { fontSize: 14, fontWeight: '600', color: Colors.inkSecondary },
  depPriceActive: { color: Colors.white },

  // Quote
  quoteSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  quoteMarks: { fontSize: 40, color: Colors.orange, lineHeight: 40, marginBottom: -8 },
  quoteText: { fontSize: 16, color: Colors.ink, lineHeight: 24, marginBottom: 10 },
  quoteAuthor: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  quoteTrip: { fontWeight: '400', color: Colors.inkSecondary },

  // Footer CTAs
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerBtnOutline: {
    flex: 1, height: 52, borderRadius: 28,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  footerBtnOutlineText: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  footerBtnFilled: {
    flex: 1, height: 52, borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  footerBtnFilledText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
