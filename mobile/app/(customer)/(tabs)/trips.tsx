import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgencyAvatar } from '@/components/ui/AgencyAvatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useMyTickets } from '@/modules/booking/booking.queries';
import type { Ticket } from '@contracts/api-types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function ticketStatusVariant(status: Ticket['status']) {
  const map: Record<Ticket['status'], 'success' | 'primary' | 'neutral' | 'error' | 'warning'> = {
    PAID: 'success',
    RESERVED: 'warning',
    BOARDED: 'primary',
    CANCELLED: 'error',
    REFUNDED: 'neutral',
  };
  return map[status] ?? 'neutral';
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/(customer)/booking/ticket?code=${ticket.code}`)}
    >
      <Card style={styles.ticketCard}>
        <View style={styles.row}>
          <AgencyAvatar agency={ticket.agency} size={44} />
          <View style={styles.ticketInfo}>
            <View style={styles.topRow}>
              <Text style={styles.route}>
                {ticket.originCity} → {ticket.destinationCity}
              </Text>
              <Badge
                label={ticket.status}
                variant={ticketStatusVariant(ticket.status)}
              />
            </View>
            <Text style={styles.dateTime}>
              {formatDate(ticket.departureAt)} · {formatTime(ticket.departureAt)}
            </Text>
            <View style={styles.bottomRow}>
              <Text style={styles.detail}>Seat {ticket.seatNumber}</Text>
              <Text style={styles.dot}>·</Text>
              <Badge
                label={ticket.busClass}
                variant={ticket.busClass === 'VIP' ? 'vip' : 'classic'}
              />
              <Text style={styles.dot}>·</Text>
              <Text style={styles.detail}>{ticket.code}</Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const { data: tickets, isLoading, isError } = useMyTickets();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[Typography.h3]}>My Trips</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load trips.</Text>
        </View>
      ) : !tickets?.length ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>
            Your booked tickets will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TicketRow ticket={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  loader: { flex: 1, marginTop: 60 },

  list: { paddingHorizontal: 20, paddingBottom: 24 },

  ticketCard: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  ticketInfo: { flex: 1, marginLeft: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.ink, flex: 1 },
  dateTime: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 3 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 4 },
  detail: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  dot: { color: Colors.inkDisabled, marginHorizontal: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: Colors.error, fontSize: FontSize.base },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.ink },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 4, textAlign: 'center' },
});
