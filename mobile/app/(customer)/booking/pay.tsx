import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { Input } from '@/components/ui/Input';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useCreateTicket } from '@/modules/booking/booking.queries';
import { ticket as mockTicket, tripSearchResults } from '@contracts/mocks';
import type { PaymentMethod } from '@contracts/api-types';

const BOOKING_FEE = 150;

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; emoji: string; color: string }[] = [
  { value: 'MTN_MOMO', label: 'MTN MoMo', emoji: '📱', color: '#FFC107' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', emoji: '📱', color: '#FF7A00' },
  { value: 'CASH', label: 'Cash at counter', emoji: '💵', color: '#16A34A' },
];

export default function PayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId: string; seatNumber: string; price: string }>();

  const tripId = params.tripId ?? mockTicket.id;
  const seatNumber = Number(params.seatNumber ?? mockTicket.seatNumber);
  const basePrice = Number(params.price ?? mockTicket.price);
  const total = basePrice + BOOKING_FEE;

  // Use the first trip from mocks as context for agency info
  const trip = tripSearchResults.find(t => t.tripId === tripId) ?? tripSearchResults[0];

  const [passengerName, setPassengerName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN_MOMO');
  const [payerPhone, setPayerPhone] = useState('');
  const [errors, setErrors] = useState<{
    passengerName?: string;
    payerPhone?: string;
  }>({});

  const { mutate: createTicket, isPending, error } = useCreateTicket();

  function validate() {
    const e: typeof errors = {};
    if (!passengerName.trim()) e.passengerName = 'Passenger name is required';
    if (paymentMethod !== 'CASH' && !payerPhone.trim())
      e.payerPhone = 'Phone number is required for mobile payment';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePay() {
    if (!validate()) return;
    createTicket(
      {
        tripId,
        seatNumber,
        passengerName: passengerName.trim(),
        passengerIdNumber: idNumber.trim() || undefined,
        paymentMethod,
        payerPhone: payerPhone.trim() || '0000000000',
      },
      {
        onSuccess: (ticket) => {
          router.replace(`/(customer)/booking/ticket?code=${ticket.code}`);
        },
        onError: () => {
          // API not ready — navigate with mock
          router.replace(`/(customer)/booking/ticket?code=${mockTicket.code}`);
        },
      },
    );
  }

  const needsPhone = paymentMethod !== 'CASH';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[Typography.h4, { flex: 1 }]}>Payment</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Trip summary card */}
          <View style={styles.summaryCard}>
            <Text style={[Typography.h4, styles.summaryTitle]}>Trip summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{trip.originCity} → {trip.destinationCity}</Text>
              <Badge label={trip.busClass} variant={trip.busClass === 'VIP' ? 'vip' : 'classic'} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {new Date(trip.departureAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(trip.arrivalEta).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.summaryLabel}>{trip.agency.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Seat {seatNumber}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ticket price</Text>
              <Text style={styles.summaryValue}>{formatPrice(basePrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking fee</Text>
              <Text style={styles.summaryValue}>{formatPrice(BOOKING_FEE)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>

          {/* Passenger details */}
          <Text style={[Typography.h4, styles.sectionTitle]}>Passenger details</Text>
          <Input
            label="Full name"
            placeholder="As on your ID"
            value={passengerName}
            onChangeText={setPassengerName}
            autoCapitalize="words"
            error={errors.passengerName}
          />
          <Input
            label="CNI / Passport number (optional)"
            placeholder="Optional"
            value={idNumber}
            onChangeText={setIdNumber}
            autoCapitalize="characters"
          />

          {/* Payment method */}
          <Text style={[Typography.h4, styles.sectionTitle]}>Payment method</Text>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              key={pm.value}
              style={[
                styles.pmOption,
                paymentMethod === pm.value && styles.pmOptionActive,
              ]}
              onPress={() => setPaymentMethod(pm.value)}
              activeOpacity={0.8}
            >
              <View style={[styles.pmIcon, { backgroundColor: pm.color + '22' }]}>
                <Text style={{ fontSize: 20 }}>{pm.emoji}</Text>
              </View>
              <Text style={styles.pmLabel}>{pm.label}</Text>
              <View
                style={[
                  styles.radio,
                  paymentMethod === pm.value && styles.radioSelected,
                ]}
              />
            </TouchableOpacity>
          ))}

          {needsPhone ? (
            <Input
              label="Mobile money phone number"
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              value={payerPhone}
              onChangeText={setPayerPhone}
              error={errors.payerPhone}
            />
          ) : null}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error.message}</Text>
            </View>
          ) : null}

          <Button
            title={`Pay ${formatPrice(total)}`}
            onPress={handlePay}
            loading={isPending}
            style={styles.payBtn}
          />

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

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

  scroll: { padding: 20, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: { marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  summaryValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.ink },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  totalRow: { marginTop: 4 },
  totalLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  totalValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primary },

  sectionTitle: { marginBottom: 14 },

  pmOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  pmOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pmIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pmLabel: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.ink },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: Colors.error, fontSize: FontSize.sm },

  payBtn: { marginTop: 8 },
  bottomPad: { height: 20 },
});
