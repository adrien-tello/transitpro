import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, PersonAvatar, StatTile } from '@/components/ui';
import type { Me } from '@contracts/api-types';
import { useCourierStats, useCourierStops } from '@/modules/parcels/parcels.queries';
import { fcfa, timeHM, weekdayDate } from '@/lib/format';

export function CourierToday({ me }: { me: Me }) {
  const router = useRouter();
  const stops = useCourierStops();
  const stats = useCourierStats();
  const next = stops.data?.[0];
  const later = stops.data?.slice(1) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <PersonAvatar name={me.fullName} role="COURIER" />
          <View style={styles.headerText}>
            <Text style={styles.headerMeta}>{weekdayDate()} · Courier · Mvan</Text>
            <Text style={styles.headerTitle}>Morning, {me.fullName.split(' ')[0]}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.85}>
            <Icon name="bell" size={18} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats.data && (
          <View style={styles.statsRow}>
            <StatTile label="Delivered" value={`${stats.data.deliveredToday}/${stats.data.stopsToday}`} tone="success" />
            <StatTile label="Refused" value={String(stats.data.refusedToday)} tone={stats.data.refusedToday > 0 ? 'error' : 'ink'} />
            <StatTile label="Cash to remit" value={fcfa(stats.data.cashToRemitToday)} />
          </View>
        )}

        {/* Next up */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Next up</Text>
          {next && <Text style={styles.sectionMeta}>Stop {next.stopIndex} of {next.stopsTotal}</Text>}
        </View>

        {next ? (
          <View style={styles.nextCard}>
            <View style={styles.pillRow}>
              <View style={styles.pillLight}>
                <Text style={styles.pillLightText}>{next.parcel.homeDelivery ? 'Home delivery' : 'Counter pickup'}</Text>
              </View>
              <View style={styles.pillLight}>
                <Text style={styles.pillLightText}>{next.parcel.codAmount ? `Collect ${fcfa(next.parcel.codAmount)}` : 'Paid'}</Text>
              </View>
            </View>
            <View style={styles.etaRow}>
              <Text style={styles.etaTime}>{timeHM(next.etaAt)}</Text>
              {next.distanceKm != null && (
                <Text style={styles.etaMeta}>
                  <Icon name="arrowRight" size={13} color="rgba(255,255,255,0.8)" /> {next.distanceKm} km · {next.etaMinutes} min
                </Text>
              )}
            </View>
            <View style={styles.locationRow}>
              <View style={styles.orangeDot} />
              <Text style={styles.locationText} numberOfLines={1}>
                {next.parcel.receiverName} · {next.parcel.to.branch}, near the market
              </Text>
            </View>
            <Text style={styles.subMeta}>
              {next.parcel.trackingCode} · {next.parcel.weightKg} kg
            </Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.navigateBtn} activeOpacity={0.85}>
                <Icon name="navigate" size={16} color={Colors.white} />
                <Text style={styles.navigateText}>Navigate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.startDeliveryBtn}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(staff)/deliver/[id]', params: { id: next.parcel.trackingCode } })}
              >
                <Text style={styles.startDeliveryText}>Start delivery</Text>
                <Icon name="arrowRight" size={16} color={Colors.navy} />
              </TouchableOpacity>
            </View>
          </View>
        ) : stops.isPending ? null : (
          <View style={styles.emptyNext}>
            <Icon name="check" size={20} color={Colors.success} />
            <Text style={styles.emptyTitle}>All deliveries done</Text>
            <Text style={styles.emptyText}>Parcels handed to you for delivery appear here.</Text>
          </View>
        )}

        {/* Later today */}
        {later.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Later today</Text>
            </View>
            <View style={styles.laterCard}>
              {later.map((s, i) => (
                <View key={s.parcel.id} style={[styles.laterRow, i > 0 && styles.laterRowBorder]}>
                  <View style={styles.timeChip}>
                    <Text style={styles.timeChipText}>{timeHM(s.etaAt)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.laterTitle}>{s.parcel.to.branch}</Text>
                    <Text style={styles.laterSub}>Receiver: {s.parcel.receiverName}</Text>
                  </View>
                  {s.parcel.codAmount ? (
                    <View style={styles.pillAmber}>
                      <Text style={styles.pillAmberText}>Collect {fcfa(s.parcel.codAmount)}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, gap: 16 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  headerMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary, fontWeight: FontWeight.medium },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 1 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  nextCard: { backgroundColor: Colors.primary, borderRadius: 22, padding: 18, gap: 12 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillLightText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },
  etaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  etaTime: { fontSize: 30, fontWeight: FontWeight.extrabold, color: Colors.white },
  etaMeta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', fontWeight: FontWeight.semibold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orangeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange },
  locationText: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.white },
  subMeta: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  navigateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
  navigateText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  startDeliveryBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14, backgroundColor: Colors.orange },
  startDeliveryText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.navy },

  emptyNext: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink, marginTop: 4 },
  emptyText: { fontSize: FontSize.sm, color: Colors.inkSecondary, textAlign: 'center' },

  laterCard: { backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 14 },
  laterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  laterRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  timeChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  timeChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink },
  laterTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  laterSub: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 1 },
  pillAmber: { backgroundColor: Colors.warningLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillAmberText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
});
