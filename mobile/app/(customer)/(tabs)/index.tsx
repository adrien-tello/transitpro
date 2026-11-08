import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useMyTickets } from '@/modules/booking/booking.queries';
import { useAgencies } from '@/modules/agencies/agencies.queries';
import { meCustomer } from '@contracts/mocks';
import type { Ticket } from '@contracts/api-types';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function NextTripCard({ ticket }: { ticket: Ticket }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push(`/(customer)/booking/ticket?code=${ticket.code}`)}
    >
      <View style={styles.nextTripCard}>
        {/* Blue gradient header */}
        <View style={styles.nextTripHeader}>
          <AgencyAvatar agency={ticket.agency} size={40} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.nextTripAgency}>{ticket.agency.name}</Text>
            <Text style={styles.nextTripDate}>
              {formatDate(ticket.departureAt)} · {formatTime(ticket.departureAt)}
            </Text>
          </View>
          <Badge
            label={ticket.busClass}
            variant={ticket.busClass === 'VIP' ? 'vip' : 'classic'}
          />
        </View>

        {/* Route */}
        <View style={styles.nextTripRoute}>
          <View style={styles.routeCity}>
            <Text style={styles.cityLabel}>FROM</Text>
            <Text style={styles.cityName}>{ticket.originCity}</Text>
            <Text style={styles.branchName}>{ticket.originBranch}</Text>
          </View>
          <View style={styles.routeArrow}>
            <View style={styles.arrowLine} />
            <Text style={styles.arrowText}>🚌</Text>
          </View>
          <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
            <Text style={styles.cityLabel}>TO</Text>
            <Text style={styles.cityName}>{ticket.destinationCity}</Text>
            <Text style={styles.branchName}>{ticket.destinationBranch}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.nextTripFooter}>
          <Text style={styles.ticketCode}>{ticket.code}</Text>
          <View style={styles.seatChip}>
            <Text style={styles.seatChipText}>Seat {ticket.seatNumber}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: tickets } = useMyTickets();
  const { data: agenciesPage } = useAgencies();
  const [trackCode, setTrackCode] = useState('');

  // Next upcoming ticket (first one)
  const nextTicket = tickets?.[0] ?? null;
  const agencies = agenciesPage?.items ?? [];

  function handleSearch() {
    router.push('/(customer)/search/');
  }

  function handleTrack() {
    if (trackCode.trim()) {
      router.push(`/(customer)/(tabs)/parcels?code=${encodeURIComponent(trackCode.trim())}`);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {meCustomer.fullName.split(' ')[0]} 👋
            </Text>
            <Text style={styles.subtitle}>Where would you like to go?</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search CTA card */}
        <TouchableOpacity activeOpacity={0.9} onPress={handleSearch}>
          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Text style={styles.searchDot}>📍</Text>
              <Text style={styles.searchPlaceholder}>Where to?</Text>
              <View style={styles.searchArrow}>
                <Text style={styles.searchArrowText}>→</Text>
              </View>
            </View>
            <View style={[styles.searchRow, styles.searchRowTo]}>
              <Text style={styles.searchDot}>🏁</Text>
              <Text style={styles.searchPlaceholderMuted}>Destination city</Text>
            </View>
            <Button
              title="Search trips"
              onPress={handleSearch}
              style={styles.searchBtn}
            />
          </View>
        </TouchableOpacity>

        {/* Next trip */}
        <View style={styles.section}>
          <Text style={[Typography.h4, styles.sectionTitle]}>Your next trip</Text>
          {nextTicket ? (
            <NextTripCard ticket={nextTicket} />
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyText}>No upcoming trips</Text>
              <TouchableOpacity onPress={handleSearch}>
                <Text style={styles.emptyLink}>Book your first trip</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>

        {/* Verified agencies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.h4, styles.sectionTitle]}>Verified agencies</Text>
            <TouchableOpacity onPress={() => router.push('/(customer)/agency/')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={agencies}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.agencyList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.agencyItem}
                onPress={() => router.push(`/(customer)/agency/${item.slug}`)}
                activeOpacity={0.8}
              >
                <AgencyAvatar agency={item} size={52} />
                <Text style={styles.agencyName} numberOfLines={1}>
                  {item.name.split(' ')[0]}
                </Text>
                {item.verified ? (
                  <Text style={styles.verifiedBadge}>✓</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Track a parcel */}
        <View style={[styles.section, styles.lastSection]}>
          <Text style={[Typography.h4, styles.sectionTitle]}>Track a parcel</Text>
          <Card>
            <Input
              placeholder="e.g. TP-DLA-48230"
              value={trackCode}
              onChangeText={setTrackCode}
              containerStyle={{ marginBottom: 8 }}
              returnKeyType="search"
              onSubmitEditing={handleTrack}
              autoCapitalize="characters"
            />
            <Button title="Track" onPress={handleTrack} disabled={!trackCode.trim()} />
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.ink },
  subtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 2 },
  bellBtn: { padding: 4 },

  searchCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRowTo: {
    borderBottomWidth: 0,
    marginBottom: 12,
  },
  searchDot: { fontSize: 18, width: 28 },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.ink,
  },
  searchPlaceholderMuted: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.inkDisabled,
  },
  searchArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchArrowText: { color: Colors.primary, fontWeight: FontWeight.bold },
  searchBtn: { height: 44 },

  section: { marginTop: 28, paddingHorizontal: 20 },
  lastSection: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { marginBottom: 12 },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },

  // Next trip card
  nextTripCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  nextTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
  },
  nextTripAgency: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.white,
  },
  nextTripDate: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  nextTripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  routeCity: { flex: 1 },
  cityLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    letterSpacing: 1,
  },
  cityName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.ink },
  branchName: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  routeArrow: { alignItems: 'center', paddingHorizontal: 12 },
  arrowLine: {
    position: 'absolute',
    width: 40,
    height: 1,
    backgroundColor: Colors.border,
  },
  arrowText: { fontSize: 18 },

  nextTripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  ticketCode: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    letterSpacing: 0.5,
  },
  seatChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  seatChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: FontSize.base, color: Colors.inkSecondary, marginBottom: 8 },
  emptyLink: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.base },

  agencyList: { paddingRight: 4 },
  agencyItem: { alignItems: 'center', marginRight: 20, width: 60 },
  agencyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.ink,
    marginTop: 6,
    textAlign: 'center',
  },
  verifiedBadge: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
