import React, { useState } from 'react';
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
import { useSeatMap } from '@/modules/booking/booking.queries';

function formatPrice(n: number) { return n.toLocaleString('fr-FR'); }

interface SeatProps {
  number: number;
  taken: boolean;
  front: boolean;
  selected: boolean;
  onPress: () => void;
}

function Seat({ number, taken, front, selected, onPress }: SeatProps) {
  let bg: string = Colors.surface;
  let border: string = Colors.border;
  let textColor: string = Colors.ink;

  if (taken) {
    bg = Colors.surfaceAlt; border = Colors.surfaceAlt; textColor = Colors.inkMuted;
  } else if (selected) {
    bg = Colors.primary; border = Colors.primary; textColor = Colors.white;
  } else if (front) {
    bg = '#FFFBEB'; border = Colors.orange; textColor = Colors.ink;
  }

  return (
    <TouchableOpacity
      style={[styles.seat, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      disabled={taken}
      activeOpacity={0.75}
    >
      <Text style={[styles.seatNum, { color: textColor }]}>{number}</Text>
    </TouchableOpacity>
  );
}

export default function SeatsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: map } = useSeatMap(tripId ?? '');
  const [selected, setSelected] = useState<number | null>(14);

  if (!map) return null;

  const selectedObj = map.seats.find(s => s.number === selected);
  const price = selectedObj?.front ? map.price + map.frontRowExtra : map.price;
  const rows = Array.from({ length: map.rows }, (_, i) =>
    map.seats.filter(s => s.row === i + 1),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Back + title */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Choose your seat</Text>
          <Text style={styles.headerMeta}>Étoile Voyages · Tue 3 Nov · 08:00 · {map.busClass}</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { bg: Colors.surface, border: Colors.border, label: 'Free' },
          { bg: Colors.surfaceAlt, border: Colors.surfaceAlt, label: 'Taken' },
          { bg: Colors.primary, border: Colors.primary, label: 'Yours' },
          { bg: '#FFFBEB', border: Colors.orange, label: `Front +${formatPrice(map.frontRowExtra)}` },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: item.bg, borderColor: item.border }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Bus grid card */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
        <View style={styles.gridCard}>
          {/* Driver + Door row */}
          <View style={styles.busTopRow}>
            <View style={styles.driverArea}>
              <Text style={styles.driverIcon}>⊕</Text>
              <Text style={styles.driverLabel}> Driver</Text>
            </View>
            <Text style={styles.doorLabel}>Door</Text>
          </View>
          <View style={styles.gridDivider} />

          {/* Seat rows */}
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.seatRow}>
              {row.slice(0, 2).map(s => (
                <Seat key={s.number} number={s.number} taken={s.taken} front={s.front}
                  selected={selected === s.number} onPress={() => setSelected(s.number)} />
              ))}
              <View style={styles.aisle} />
              {row.slice(2, 4).map(s => (
                <Seat key={s.number} number={s.number} taken={s.taken} front={s.front}
                  selected={selected === s.number} onPress={() => setSelected(s.number)} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Dark footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {selected ? (
            <>
              <Text style={styles.footerSeatLabel}>Seat {selected} · window</Text>
              <View style={styles.footerPriceRow}>
                <Text style={styles.footerPriceBig}>{formatPrice(price)}</Text>
                <Text style={styles.footerPriceFcfa}> FCFA</Text>
              </View>
            </>
          ) : (
            <Text style={styles.footerHint}>Tap a seat to select</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          disabled={!selected}
          onPress={() => router.push(
            `/(customer)/booking/pay?tripId=${map.tripId}&seatNumber=${selected}&price=${price}`
          )}
          activeOpacity={0.9}
        >
          <Text style={styles.continueBtnText}>Continue  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const SEAT = 70;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 28, color: Colors.ink, marginTop: -4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  headerMeta: { fontSize: 13, color: Colors.inkSecondary, marginTop: 2 },

  legend: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5 },
  legendLabel: { fontSize: 13, color: Colors.inkSecondary },

  gridScroll: { paddingHorizontal: 16, paddingBottom: 16 },
  gridCard: { backgroundColor: Colors.surface, borderRadius: 24, padding: 16, paddingBottom: 24 },
  busTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  driverArea: { flexDirection: 'row', alignItems: 'center' },
  driverIcon: { fontSize: 18, color: Colors.inkSecondary },
  driverLabel: { fontSize: 14, color: Colors.inkSecondary, fontWeight: '500' },
  doorLabel: { fontSize: 14, color: Colors.inkSecondary, fontWeight: '500' },
  gridDivider: { borderTopWidth: 1, borderTopColor: Colors.border, borderStyle: 'dashed', marginBottom: 12 },

  seatRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  seat: { width: SEAT, height: SEAT, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  seatNum: { fontSize: 16, fontWeight: '700' },
  aisle: { flex: 1 },

  footer: {
    backgroundColor: Colors.navy,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 18, paddingBottom: 32, gap: 16,
  },
  footerLeft: { flex: 1 },
  footerSeatLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  footerPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  footerPriceBig: { fontSize: 30, fontWeight: '900', color: Colors.white },
  footerPriceFcfa: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  footerHint: { fontSize: 15, color: 'rgba(255,255,255,0.4)' },
  continueBtn: {
    backgroundColor: Colors.surface, borderRadius: 28,
    paddingHorizontal: 22, paddingVertical: 14,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { fontSize: 15, fontWeight: '700', color: Colors.navy },
});
