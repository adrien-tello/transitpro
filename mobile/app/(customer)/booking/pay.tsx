import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useCreateTicket } from '@/modules/booking/booking.queries';
import { ticket as mockTicket } from '@contracts/mocks';
import type { PaymentMethod } from '@contracts/api-types';

const BOOKING_FEE = 150;
function formatPrice(n: number) { return n.toLocaleString('fr-FR'); }

type PMKey = 'MTN_MOMO' | 'ORANGE_MONEY';

export default function PayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId: string; seatNumber: string; price: string }>();
  const seatNumber = Number(params.seatNumber ?? mockTicket.seatNumber);
  const basePrice = Number(params.price ?? mockTicket.price);
  const total = basePrice + BOOKING_FEE;

  const [passengerName, setPassengerName] = useState('Marie Ekane');
  const [idNumber, setIdNumber] = useState('1145 2087 3301');
  const [pm, setPm] = useState<PMKey>('MTN_MOMO');
  const [phone, setPhone] = useState('6 77 18 18 90');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createTicket, isPending } = useCreateTicket();

  function validate() {
    const e: Record<string, string> = {};
    if (!passengerName.trim()) e.name = 'Required';
    if (!phone.trim()) e.phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handlePay() {
    if (!validate()) return;
    createTicket(
      {
        tripId: params.tripId ?? mockTicket.id,
        seatNumber,
        passengerName: passengerName.trim(),
        passengerIdNumber: idNumber.trim() || undefined,
        paymentMethod: pm as PaymentMethod,
        payerPhone: phone.trim(),
      },
      {
        onSuccess: t => router.replace(`/(customer)/booking/ticket?code=${t.code}`),
        onError: () => router.replace(`/(customer)/booking/ticket?code=${mockTicket.code}`),
      },
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Passenger and payment</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── PASSENGER CARD ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Passenger</Text>
              <Text style={styles.cardSeatLabel}>Seat {seatNumber}</Text>
            </View>
            <Text style={styles.fieldLabel}>Full name (as on your CNI)</Text>
            <View style={[styles.inputWrap, errors.name ? styles.inputError : null]}>
              <TextInput style={styles.input} value={passengerName} onChangeText={setPassengerName}
                autoCapitalize="words" placeholderTextColor={Colors.inkMuted} placeholder="Full name" />
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>CNI number (checked at boarding)</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber}
                autoCapitalize="characters" placeholderTextColor={Colors.inkMuted} placeholder="Optional" />
            </View>
          </View>

          {/* ── PAYMENT CARD ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pay with</Text>

            {/* MTN MoMo */}
            <TouchableOpacity
              style={[styles.pmRow, pm === 'MTN_MOMO' && styles.pmRowSelected]}
              onPress={() => setPm('MTN_MOMO')}
              activeOpacity={0.85}
            >
              <View style={[styles.pmLogo, { backgroundColor: '#FFC107' }]}>
                <Text style={styles.pmLogoText}>MoMo</Text>
              </View>
              <View style={styles.pmInfo}>
                <Text style={styles.pmName}>MTN Mobile Money</Text>
                <Text style={styles.pmSub}>Instant confirmation</Text>
              </View>
              <View style={[styles.radio, pm === 'MTN_MOMO' && styles.radioSelected]} />
            </TouchableOpacity>

            {/* Orange Money */}
            <TouchableOpacity
              style={[styles.pmRow, pm === 'ORANGE_MONEY' && styles.pmRowSelected]}
              onPress={() => setPm('ORANGE_MONEY')}
              activeOpacity={0.85}
            >
              <View style={[styles.pmLogo, { backgroundColor: '#FF7A00' }]}>
                <Text style={styles.pmLogoText}>OM</Text>
              </View>
              <View style={styles.pmInfo}>
                <Text style={styles.pmName}>Orange Money</Text>
                <Text style={styles.pmSub}>Instant confirmation</Text>
              </View>
              <View style={[styles.radio, pm === 'ORANGE_MONEY' && styles.radioSelected]} />
            </TouchableOpacity>

            {/* Phone input */}
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
              {pm === 'MTN_MOMO' ? 'MoMo number' : 'Orange Money number'}
            </Text>
            <View style={[styles.inputWrap, errors.phone ? styles.inputError : null]}>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" placeholderTextColor={Colors.inkMuted} placeholder="6 XX XX XX XX" />
            </View>

            {/* PIN notice */}
            <View style={styles.pinNotice}>
              <Text style={styles.pinNoticeIcon}>🔒</Text>
              <Text style={styles.pinNoticeText}>
                You will confirm on your phone with your MoMo PIN. TransitPro never asks for your PIN.
              </Text>
            </View>
          </View>

          {/* ── PRICE SUMMARY ── */}
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ticket, VIP</Text>
              <Text style={styles.summaryValue}>{formatPrice(basePrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Booking fee</Text>
              <Text style={styles.summaryValue}>{formatPrice(BOOKING_FEE)}</Text>
            </View>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* ── DARK FOOTER ── */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTotalLabel}>Total</Text>
            <View style={styles.footerPriceRow}>
              <Text style={styles.footerPriceBig}>{formatPrice(total)}</Text>
              <Text style={styles.footerPriceFcfa}> FCFA</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.payBtn, isPending && { opacity: 0.7 }]}
            onPress={handlePay}
            disabled={isPending}
            activeOpacity={0.9}
          >
            <Text style={styles.payBtnText}>Pay {formatPrice(total)}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.ink, marginTop: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.ink },

  scroll: { padding: 16, gap: 12 },

  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  cardSeatLabel: { fontSize: 14, color: Colors.inkSecondary },

  fieldLabel: { fontSize: 13, color: Colors.inkSecondary, marginBottom: 6 },
  inputWrap: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, height: 52, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: Colors.surface },
  inputError: { borderColor: Colors.error },
  input: { fontSize: 15, color: Colors.ink },

  // Payment method rows
  pmRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 10, gap: 12 },
  pmRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pmLogo: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pmLogoText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  pmInfo: { flex: 1 },
  pmName: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  pmSub: { fontSize: 13, color: Colors.inkSecondary, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border },
  radioSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },

  pinNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 12 },
  pinNoticeIcon: { fontSize: 16 },
  pinNoticeText: { flex: 1, fontSize: 13, color: Colors.inkSecondary, lineHeight: 18 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 15, color: Colors.inkSecondary },
  summaryValue: { fontSize: 15, fontWeight: '600', color: Colors.ink },

  // Footer
  footer: {
    backgroundColor: Colors.navy, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32,
  },
  footerTotalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  footerPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  footerPriceBig: { fontSize: 28, fontWeight: '900', color: Colors.white },
  footerPriceFcfa: { fontSize: 14, color: Colors.white, fontWeight: '600' },
  payBtn: { backgroundColor: Colors.orange, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 14 },
  payBtnText: { fontSize: 16, fontWeight: '800', color: Colors.navy },
});
