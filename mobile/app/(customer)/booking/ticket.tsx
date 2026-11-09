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
import { useMyTickets } from '@/modules/booking/booking.queries';
import { ticket as mockTicket } from '@contracts/mocks';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

/** QR code visual (pixel-art style using nested Views) */
function QRCode({ size = 160 }: { size?: number }) {
  const cell = size / 10;
  // Simplified QR pattern
  const pattern = [
    [1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,0,0,0],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,1,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,0,0],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,0,0,1,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0],
    [0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,1,0,0],
    [0,1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0,1,1,0],
  ];
  return (
    <View style={{ width: size, height: size / 2 }}>
      {pattern.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', height: cell }}>
          {row.map((v, c) => (
            <View
              key={c}
              style={{
                width: cell,
                height: cell,
                backgroundColor: v ? Colors.white : 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ETicketScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data: tickets } = useMyTickets();
  const ticket = tickets?.find(t => t.code === code) ?? mockTicket;

  const infoChips = [
    { label: 'Date', value: 'Tue 3' },
    { label: 'Seat', value: String(ticket.seatNumber) },
    { label: 'Bus', value: ticket.busPlate.replace(' ', '\u00A0') },
    { label: 'Gate', value: ticket.gate ?? '–' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── SUCCESS HEADER ── */}
        <View style={styles.successRow}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <View>
            <Text style={styles.successTitle}>You're booked</Text>
            <Text style={styles.successSub}>
              Paid {(ticket.price + ticket.bookingFee).toLocaleString('fr-FR')} FCFA with MTN MoMo
            </Text>
          </View>
        </View>

        {/* ── DARK TICKET CARD ── */}
        <View style={styles.ticketCard}>
          {/* Top: agency + VIP */}
          <View style={styles.ticketTopRow}>
            <View style={styles.ticketAgencyRow}>
              <View style={[styles.ticketAgencyAvatar, { backgroundColor: Colors.agencyEV }]}>
                <Text style={styles.ticketAgencyInitials}>{ticket.agency.initials}</Text>
              </View>
              <Text style={styles.ticketAgencyName}>{ticket.agency.name}</Text>
            </View>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>{ticket.busClass}</Text>
            </View>
          </View>

          {/* Times + route */}
          <View style={styles.ticketTimesRow}>
            <View style={styles.ticketTimeBlock}>
              <Text style={styles.ticketTime}>{formatTime(ticket.departureAt)}</Text>
              <Text style={styles.ticketCity}>{ticket.originCity}, {ticket.originBranch}</Text>
            </View>
            {/* Dashed line with bus icon */}
            <View style={styles.ticketRouteLine}>
              <View style={styles.dashedLineLeft} />
              <Text style={styles.busEmoji}>🚌</Text>
              <View style={styles.dashedLineRight} />
            </View>
            <View style={[styles.ticketTimeBlock, { alignItems: 'flex-end' }]}>
              <Text style={[styles.ticketTime, styles.ticketTimeArrival]}>
                {formatTime(ticket.arrivalEta)}
              </Text>
              <Text style={styles.ticketCity}>{ticket.destinationCity}, {ticket.destinationBranch}</Text>
            </View>
          </View>

          {/* Info chips */}
          <View style={styles.infoChips}>
            {infoChips.map(chip => (
              <View key={chip.label} style={styles.chip}>
                <Text style={styles.chipLabel}>{chip.label}</Text>
                <Text style={styles.chipValue}>{chip.value}</Text>
              </View>
            ))}
          </View>

          {/* Dashed separator with notches */}
          <View style={styles.ticketSeparator}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedSep} />
            <View style={styles.notchRight} />
          </View>

          {/* QR + passenger info */}
          <View style={styles.ticketBottom}>
            <View style={styles.qrBox}>
              <QRCode size={160} />
            </View>
            <View style={styles.ticketPassengerInfo}>
              <Text style={styles.passengerLabel}>Passenger</Text>
              <Text style={styles.passengerName}>{ticket.passengerName}</Text>
              <Text style={[styles.passengerLabel, { marginTop: 12 }]}>Ticket</Text>
              <Text style={styles.ticketCode}>{ticket.code}</Text>
              <Text style={styles.boardingWarning}>
                Boarding closes {formatTime(ticket.boardingClosesAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnIcon}>📅</Text>
            <Text style={styles.actionBtnText}>Add to calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnIcon}>⬆</Text>
            <Text style={styles.actionBtnText}>Share ticket</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.offlineHint}>
          Show this QR to the conductor. It works offline. On the day you can follow your bus live.
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── DARK FLOATING TAB BAR ── */}
      <View style={styles.tabBar}>
        {[
          { icon: '⌂', label: 'Home', route: '/(customer)/(tabs)/' },
          { icon: '🎫', label: 'Trips', route: '/(customer)/(tabs)/trips', active: true },
          { icon: '⬡', label: 'Parcels', route: '/(customer)/(tabs)/parcels' },
          { icon: '👤', label: 'Profile', route: '/(customer)/(tabs)/profile' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.label}
            style={[styles.tabItem, tab.active && styles.tabItemActive]}
            onPress={() => router.replace(tab.route as Parameters<typeof router.replace>[0])}
          >
            <Text style={[styles.tabIcon, tab.active && styles.tabIconActive]}>{tab.icon}</Text>
            {tab.active && <Text style={styles.tabLabel}>{tab.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  successIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center' },
  successCheck: { fontSize: 22, color: Colors.success, fontWeight: '900' },
  successTitle: { fontSize: 24, fontWeight: '800', color: Colors.ink },
  successSub: { fontSize: 14, color: Colors.inkSecondary, marginTop: 2 },

  ticketCard: { backgroundColor: Colors.navy, borderRadius: 20, padding: 20, marginBottom: 16 },

  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ticketAgencyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketAgencyAvatar: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ticketAgencyInitials: { fontSize: 13, fontWeight: '800', color: Colors.navy },
  ticketAgencyName: { fontSize: 16, fontWeight: '700', color: Colors.white },
  vipBadge: { backgroundColor: Colors.orange, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  vipBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.navy },

  ticketTimesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ticketTimeBlock: { flex: 1 },
  ticketTime: { fontSize: 36, fontWeight: '900', color: Colors.white, letterSpacing: -1 },
  ticketTimeArrival: { color: 'rgba(255,255,255,0.5)' },
  ticketCity: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  ticketRouteLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  dashedLineLeft: { flex: 1, height: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
  busEmoji: { fontSize: 18, marginHorizontal: 4 },
  dashedLineRight: { flex: 1, height: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },

  infoChips: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: { flex: 1, backgroundColor: Colors.navyCard, borderRadius: 10, padding: 10 },
  chipLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  chipValue: { fontSize: 15, fontWeight: '700', color: Colors.white },

  ticketSeparator: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginHorizontal: -20 },
  notchLeft: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.background },
  dashedSep: { flex: 1, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed' },
  notchRight: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.background },

  ticketBottom: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  qrBox: { backgroundColor: Colors.navy, padding: 8, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  ticketPassengerInfo: { flex: 1 },
  passengerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  passengerName: { fontSize: 18, fontWeight: '800', color: Colors.white, marginTop: 2 },
  ticketCode: { fontSize: 18, fontWeight: '800', color: Colors.white, marginTop: 2 },
  boardingWarning: { fontSize: 13, color: Colors.orange, fontWeight: '600', marginTop: 8 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 16,
  },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.ink },

  offlineHint: { fontSize: 13, color: Colors.inkSecondary, textAlign: 'center', lineHeight: 20 },

  // Inline tab bar (matches the dark pill design)
  tabBar: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: Colors.navy, borderRadius: 36, height: 68,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26 },
  tabItemActive: { backgroundColor: Colors.orange, flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  tabIcon: { fontSize: 22, color: Colors.white },
  tabIconActive: { color: Colors.navy, fontSize: 20 },
  tabLabel: { fontSize: 14, fontWeight: '700', color: Colors.navy },
});
