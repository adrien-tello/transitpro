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
import { Badge, parcelStatusVariant, parcelStatusLabel } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';
import { useTrackParcel } from '@/modules/parcels/parcels.queries';
import type { ParcelTracking } from '@contracts/api-types';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    + ' · '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Map raw event type to human-readable label */
function eventLabel(type: string): string {
  const map: Record<string, string> = {
    REGISTERED: 'Registered at agency',
    LOADED: 'Loaded on bus',
    DEPARTED: 'Bus departed',
    ARRIVED: 'Arrived at branch',
    HANDED_TO_COURIER: 'Handed to courier',
    OUT_FOR_DELIVERY: 'Out for delivery',
    DELIVERED: 'Delivered',
    REFUSED: 'Refused by receiver',
    RETURNED: 'Returned to sender',
  };
  return map[type] ?? type;
}

/** Map status to emoji */
function statusEmoji(type: string): string {
  const map: Record<string, string> = {
    REGISTERED: '📋',
    LOADED: '📦',
    DEPARTED: '🚌',
    ARRIVED: '🏢',
    HANDED_TO_COURIER: '🤝',
    OUT_FOR_DELIVERY: '🛵',
    DELIVERED: '✅',
    REFUSED: '❌',
    RETURNED: '↩️',
  };
  return map[type] ?? '●';
}

function Timeline({ events }: { events: ParcelTracking['events'] }) {
  return (
    <View style={timelineStyles.container}>
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <View key={i} style={timelineStyles.step}>
            {/* Icon + line */}
            <View style={timelineStyles.iconCol}>
              <View style={[timelineStyles.iconCircle, isLast && timelineStyles.iconCircleActive]}>
                <Text style={timelineStyles.icon}>{statusEmoji(event.type)}</Text>
              </View>
              {!isLast ? <View style={timelineStyles.line} /> : null}
            </View>
            {/* Content */}
            <View style={timelineStyles.content}>
              <Text style={timelineStyles.eventLabel}>{eventLabel(event.type)}</Text>
              {event.city ? (
                <Text style={timelineStyles.eventCity}>📍 {event.city}</Text>
              ) : null}
              <Text style={timelineStyles.eventTime}>{formatDateTime(event.at)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: { marginTop: 4 },
  step: { flexDirection: 'row', marginBottom: 0 },
  iconCol: { alignItems: 'center', width: 40, marginRight: 12 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  iconCircleActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  icon: { fontSize: 16 },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    minHeight: 24,
    marginVertical: 4,
  },
  content: { flex: 1, paddingBottom: 20 },
  eventLabel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.ink },
  eventCity: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 2 },
  eventTime: { fontSize: FontSize.xs, color: Colors.inkDisabled, marginTop: 2 },
});

function TrackingResult({ tracking }: { tracking: ParcelTracking }) {
  return (
    <View>
      {/* Status badge */}
      <View style={styles.statusRow}>
        <Badge
          label={parcelStatusLabel(tracking.status)}
          variant={parcelStatusVariant(tracking.status)}
        />
        {tracking.homeDelivery ? (
          <View style={styles.homeDeliveryChip}>
            <Text style={styles.homeDeliveryText}>🛵 Home delivery</Text>
          </View>
        ) : null}
      </View>

      {/* Route card */}
      <Card style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.routeCity}>
            <Text style={styles.routeCityLabel}>FROM</Text>
            <Text style={styles.routeCityName}>{tracking.from.city}</Text>
            <Text style={styles.routeBranch}>{tracking.from.branch}</Text>
          </View>
          <Text style={styles.routeArrowText}>→</Text>
          <View style={[styles.routeCity, { alignItems: 'flex-end' }]}>
            <Text style={styles.routeCityLabel}>TO</Text>
            <Text style={styles.routeCityName}>{tracking.to.city}</Text>
            <Text style={styles.routeBranch}>{tracking.to.branch}</Text>
          </View>
        </View>

        <View style={styles.sealRow}>
          <Text style={styles.sealIcon}>🔒</Text>
          <Text style={styles.sealText}>Seal number: {tracking.sealNumber}</Text>
        </View>

        {tracking.photoCount > 0 ? (
          <View style={styles.photosRow}>
            <Text style={styles.photosText}>
              📷 {tracking.photoCount} photo{tracking.photoCount > 1 ? 's' : ''} available
            </Text>
            <Text style={styles.photosHint}> (log in to view)</Text>
          </View>
        ) : null}
      </Card>

      {/* Timeline */}
      <Text style={[Typography.h4, styles.timelineTitle]}>Journey timeline</Text>
      <Card>
        <Timeline events={tracking.events} />
      </Card>
    </View>
  );
}

export default function ParcelsScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [inputCode, setInputCode] = useState(params.code ?? '');
  const [activeCode, setActiveCode] = useState(params.code ?? '');

  const { data: tracking, isLoading, isError } = useTrackParcel(activeCode);

  function handleTrack() {
    setActiveCode(inputCode.trim().toUpperCase());
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h3]}>Track a Parcel</Text>
        </View>

        {/* Code entry */}
        <Card style={styles.entryCard}>
          <Text style={styles.entryLabel}>Tracking code</Text>
          <Input
            placeholder="e.g. TP-DLA-48230"
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleTrack}
            containerStyle={{ marginBottom: 12 }}
          />
          <Button title="Track parcel" onPress={handleTrack} disabled={!inputCode.trim()} />
        </Card>

        {/* Results area */}
        {isLoading && activeCode ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
        ) : isError ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorEmoji}>❌</Text>
            <Text style={styles.errorTitle}>Parcel not found</Text>
            <Text style={styles.errorSubtitle}>
              Check the tracking code and try again.
            </Text>
          </Card>
        ) : tracking ? (
          <>
            <View style={styles.trackingCodeRow}>
              <Text style={styles.trackingCodeLabel}>Parcel</Text>
              <Text style={styles.trackingCode}>{tracking.trackingCode}</Text>
            </View>
            <TrackingResult tracking={tracking} />
          </>
        ) : !activeCode ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Track a parcel</Text>
            <Text style={styles.emptySubtitle}>
              Enter the tracking code you received by SMS above.
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 20 },

  entryCard: { marginBottom: 24 },
  entryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    marginBottom: 8,
  },

  loader: { marginTop: 40 },

  errorCard: { alignItems: 'center', paddingVertical: 32 },
  errorEmoji: { fontSize: 36, marginBottom: 10 },
  errorTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.error },
  errorSubtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 4, textAlign: 'center' },

  trackingCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trackingCodeLabel: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  trackingCode: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.ink,
    letterSpacing: 1,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  homeDeliveryChip: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  homeDeliveryText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },

  routeCard: { marginBottom: 24 },
  routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routeCity: { flex: 1 },
  routeCityLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  routeCityName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.ink },
  routeBranch: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  routeArrowText: { fontSize: FontSize.xl, color: Colors.inkSecondary, paddingHorizontal: 8 },

  sealRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 },
  sealIcon: { fontSize: 14 },
  sealText: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  photosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  photosText: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  photosHint: { fontSize: FontSize.sm, color: Colors.inkDisabled },

  timelineTitle: { marginBottom: 12, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.ink },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.inkSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomPad: { height: 20 },
});
