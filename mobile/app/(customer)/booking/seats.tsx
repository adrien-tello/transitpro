import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useSeatMap } from '@/modules/booking/booking.queries';

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

interface SeatButtonProps {
  number: number;
  taken: boolean;
  front: boolean;
  selected: boolean;
  onPress: () => void;
}

function SeatButton({ number, taken, front, selected, onPress }: SeatButtonProps) {
  // Typed as string so TS allows reassignment to different colour literals
  let bg: string = Colors.surface;
  let borderColor: string = Colors.border;
  let textColor: string = Colors.ink;

  if (taken) {
    bg = Colors.surfaceAlt;
    borderColor = Colors.border;
    textColor = Colors.inkDisabled;
  } else if (selected) {
    bg = Colors.primary;
    borderColor = Colors.primary;
    textColor = Colors.white;
  } else if (front) {
    bg = '#FFFBEB';
    borderColor = Colors.warning;
    textColor = Colors.ink;
  }

  return (
    <TouchableOpacity
      style={[styles.seat, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      disabled={taken}
      activeOpacity={0.8}
    >
      <Text style={[styles.seatNumber, { color: textColor }]}>{number}</Text>
    </TouchableOpacity>
  );
}

export default function SeatsScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { data: map, isLoading } = useSeatMap(tripId ?? '');

  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  if (isLoading || !map) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
      </SafeAreaView>
    );
  }

  const selectedSeatObj = map.seats.find(s => s.number === selectedSeat);
  const price = selectedSeatObj?.front
    ? map.price + map.frontRowExtra
    : map.price;

  function handleContinue() {
    if (!selectedSeat) return;
    router.push(
      `/(customer)/booking/pay?tripId=${map!.tripId}&seatNumber=${selectedSeat}&price=${price}`,
    );
  }

  // Build grid: 4 columns per row with an aisle gap between col 2 and col 3
  const rows = Array.from({ length: map.rows }, (_, rowIdx) =>
    map.seats.filter(s => s.row === rowIdx + 1),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.h4, { flex: 1 }]}>Choose your seat</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bus info */}
        <View style={styles.busInfo}>
          <View style={styles.busInfoRow}>
            <Text style={styles.busInfoLabel}>Bus plate</Text>
            <Text style={styles.busInfoValue}>{map.busPlate}</Text>
          </View>
          <View style={styles.busInfoRow}>
            <Text style={styles.busInfoLabel}>Class</Text>
            <Badge label={map.busClass} variant={map.busClass === 'VIP' ? 'vip' : 'classic'} />
          </View>
          <View style={styles.busInfoRow}>
            <Text style={styles.busInfoLabel}>Base price</Text>
            <Text style={styles.busInfoValue}>{formatPrice(map.price)}</Text>
          </View>
          {map.frontRowExtra > 0 ? (
            <View style={styles.busInfoRow}>
              <Text style={styles.busInfoLabel}>Front row extra</Text>
              <Text style={[styles.busInfoValue, { color: Colors.warning }]}>
                +{formatPrice(map.frontRowExtra)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.surface, borderColor: Colors.border }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.surfaceAlt }]} />
            <Text style={styles.legendText}>Taken</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFFBEB', borderColor: Colors.warning }]} />
            <Text style={styles.legendText}>+{formatPrice(map.frontRowExtra)}</Text>
          </View>
        </View>

        {/* Bus front indicator */}
        <View style={styles.busFront}>
          <Text style={styles.busFrontText}>🚌 Front</Text>
        </View>

        {/* Seat grid */}
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.rowContainer}>
              <Text style={styles.rowNumber}>{rowIdx + 1}</Text>
              <View style={styles.seatRow}>
                {/* Left pair */}
                {row.slice(0, 2).map(seat => (
                  <SeatButton
                    key={seat.number}
                    number={seat.number}
                    taken={seat.taken}
                    front={seat.front}
                    selected={selectedSeat === seat.number}
                    onPress={() => setSelectedSeat(seat.number)}
                  />
                ))}
                {/* Aisle */}
                <View style={styles.aisle} />
                {/* Right pair */}
                {row.slice(2, 4).map(seat => (
                  <SeatButton
                    key={seat.number}
                    number={seat.number}
                    taken={seat.taken}
                    front={seat.front}
                    selected={selectedSeat === seat.number}
                    onPress={() => setSelectedSeat(seat.number)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        {selectedSeat ? (
          <View style={styles.footerInfo}>
            <Text style={styles.footerSeat}>Seat {selectedSeat}</Text>
            <Text style={styles.footerPrice}>{formatPrice(price)}</Text>
          </View>
        ) : (
          <Text style={styles.footerHint}>Tap a seat to select</Text>
        )}
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedSeat}
          style={styles.continueBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const SEAT_SIZE = 44;

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

  busInfo: {
    margin: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  busInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  busInfoLabel: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  busInfoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  legendText: { fontSize: FontSize.xs, color: Colors.inkSecondary },

  busFront: {
    alignItems: 'center',
    marginBottom: 12,
  },
  busFrontText: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  grid: { paddingHorizontal: 20, paddingBottom: 16 },
  rowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rowNumber: {
    width: 20,
    fontSize: FontSize.xs,
    color: Colors.inkDisabled,
    textAlign: 'center',
    marginRight: 8,
  },
  seatRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },

  seat: {
    width: SEAT_SIZE,
    height: SEAT_SIZE,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  seatNumber: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  aisle: { flex: 1 },
  bottomPad: { height: 100 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footerInfo: { flex: 1 },
  footerSeat: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  footerPrice: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  footerHint: { flex: 1, fontSize: FontSize.sm, color: Colors.inkDisabled },
  continueBtn: { flex: 1 },
});
