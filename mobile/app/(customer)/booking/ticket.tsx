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
import { AgencyAvatar } from '@/components/ui/AgencyAvatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useMyTickets } from '@/modules/booking/booking.queries';
import { ticket as mockTicket } from '@contracts/mocks';
import type { Ticket } from '@contracts/api-types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatPrice(n: number) {
  return n.toLocaleString('fr-FR') + ' FCFA';
}

/** QR code placeholder rendered with SVG-like dashes */
function QRPlaceholder({ value }: { value: string }) {
  return (
    <View style={qrStyles.container}>
      {/* Simple grid pattern to suggest QR */}
      <View style={qrStyles.grid}>
        {Array.from({ length: 6 }).map((_, r) => (
          <View key={r} style={qrStyles.row}>
            {Array.from({ length: 6 }).map((__, c) => {
              const filled = (r + c) % 2 === 0 || r === 0 || c === 0 || r === 5 || c === 5;
              return (
                <View
                  key={c}
                  style={[qrStyles.cell, filled && qrStyles.cellFilled]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <Text style={qrStyles.code}>{value}</Text>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  container: { alignItems: 'center', padding: 12 },
  grid: { width: 120, height: 120, flexDirection: 'column' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, margin: 1, backgroundColor: 'transparent' },
  cellFilled: { backgroundColor: Colors.ink },
  code: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    marginTop: 8,
    letterSpacing: 1.5,
  },
});

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <View style={styles.ticketCard}>
      {/* TOP HALF */}
      <View style={styles.topHalf}>
        <View style={styles.agencyRow}>
          <AgencyAvatar agency={ticket.agency} size={52} />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.agencyName}>{ticket.agency.name}</Text>
            {ticket.agency.verified ? (
              <Text style={styles.verifiedText}>✓ Verified agency</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.routeCity}>
            <Text style={styles.cityName}>{ticket.originCity}</Text>
            <Text style={styles.branchName}>{ticket.originBranch}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Text style={styles.arrowEmoji}>✈️</Text>
          </View>
          <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
            <Text style={styles.cityName}>{ticket.destinationCity}</Text>
            <Text style={styles.branchName}>{ticket.destinationBranch}</Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <View>
            <Text style={styles.timeLabel}>Departure</Text>
            <Text style={styles.timeValue}>
              {formatDate(ticket.departureAt)} · {formatTime(ticket.departureAt)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timeLabel}>Arrival ETA</Text>
            <Text style={styles.timeValue}>{formatTime(ticket.arrivalEta)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Boarding closes</Text>
          <Text style={styles.infoValue}>{formatTime(ticket.boardingClosesAt)}</Text>
        </View>
      </View>

      {/* Dashed separator with notches */}
      <View style={styles.separator}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedLine} />
        <View style={styles.notchRight} />
      </View>

      {/* BOTTOM HALF */}
      <View style={styles.bottomHalf}>
        <View style={styles.bottomDetails}>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Seat</Text>
            <Text style={styles.seatNumber}>{ticket.seatNumber}</Text>
          </View>
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Class</Text>
            <Badge label={ticket.busClass} variant={ticket.busClass === 'VIP' ? 'vip' : 'classic'} />
          </View>
          {ticket.gate ? (
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Gate</Text>
              <Text style={styles.seatNumber}>{ticket.gate}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.passengerRow}>
          <Text style={styles.detailLabel}>Passenger</Text>
          <Text style={styles.passengerName}>{ticket.passengerName}</Text>
        </View>

        <View style={styles.passengerRow}>
          <Text style={styles.detailLabel}>Bus</Text>
          <Text style={styles.infoValue}>{ticket.busPlate}</Text>
        </View>

        {/* QR */}
        <View style={styles.qrSection}>
          <View style={styles.qrBox}>
            <QRPlaceholder value={ticket.code} />
          </View>
          <Text style={styles.qrHint}>Show this at the boarding gate</Text>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.detailLabel}>
            {formatPrice(ticket.price)} + {formatPrice(ticket.bookingFee)} fee
          </Text>
          <Badge
            label={ticket.payment.status}
            variant={ticket.payment.status === 'SUCCEEDED' ? 'success' : 'warning'}
          />
        </View>
      </View>
    </View>
  );
}

export default function ETicketScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data: tickets } = useMyTickets();

  // Find ticket by code, fall back to mock
  const ticket = tickets?.find(t => t.code === code) ?? mockTicket;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.h4, { flex: 1 }]}>E-Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Success banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Booking confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your e-ticket is ready. Keep it handy for boarding.
          </Text>
        </View>

        <TicketCard ticket={ticket} />

        <Button
          title="Done"
          onPress={() => router.replace('/(customer)/(tabs)/')}
          style={styles.doneBtn}
        />

        <View style={styles.bottomPad} />
      </ScrollView>
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },

  scroll: { padding: 20, paddingBottom: 40 },

  successBanner: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: { fontSize: 48, marginBottom: 10 },
  successTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.success },
  successSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.inkSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  ticketCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 24,
  },

  topHalf: { padding: 20 },
  agencyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  agencyName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.ink },
  verifiedText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeCity: { flex: 1 },
  cityName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  branchName: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  routeArrow: { paddingHorizontal: 12 },
  arrowEmoji: { fontSize: 22 },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  timeValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink, marginTop: 2 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  infoValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.ink },

  // Dashed separator
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 24,
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    marginLeft: -10,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    borderStyle: 'dashed',
  },

  bottomHalf: { padding: 20 },
  bottomDetails: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  detailBlock: { alignItems: 'center' },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.inkSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seatNumber: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.ink },

  passengerRow: {
    marginBottom: 10,
  },
  passengerName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.ink },

  qrSection: { alignItems: 'center', marginVertical: 8 },
  qrBox: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  qrHint: {
    fontSize: FontSize.xs,
    color: Colors.inkSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  doneBtn: { marginBottom: 16 },
  bottomPad: { height: 20 },
});
