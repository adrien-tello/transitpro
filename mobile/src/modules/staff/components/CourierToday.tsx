// Courier · Today (design: Staff app page, screen 3.11).
// Data: GET /parcels/mine (works today), the parcels this courier holds right now,
// plus GET /parcels/:code per stop for the address and seal.
import React, { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Me, ParcelListItem } from '@contracts/api-types';
import type { CourierDay, StopDetail } from '../staff.types';
import { useCourierDay, useMyParcels, useStopDetails } from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { firstName, formatDay, formatMoney, formatTime, greeting, initials } from '../staff.format';
import { StaffHeader } from './StaffHeader';
import { StaffIcon } from './StaffIcon';
import { EmptyState, ErrorState, SkeletonBlock } from './StaffStates';

const LATER_PREVIEW = 3; // rows shown before "See all"

// Oldest handover first: the parcel handed to the courier first is delivered first.
function sortStops(parcels: ParcelListItem[]): ParcelListItem[] {
  return parcels
    .filter((p) => p.status === 'OUT_FOR_DELIVERY')
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

// "Mvog-Ada, near the pharmacy" → "Mvog-Ada": the area shown in the "Later today" list.
function areaOf(address: string | null | undefined, parcel: ParcelListItem): string {
  return address?.split(',')[0]?.trim() || parcel.to.branch;
}

function dash(n: number | null | undefined): string {
  return n == null ? '–' : String(n);
}

export function CourierToday({ me }: { me: Me }) {
  const parcels = useMyParcels();
  const day = useCourierDay();
  const stops = parcels.data ? sortStops(parcels.data) : [];
  const details = useStopDetails(stops.map((p) => p.trackingCode));
  const detailOf = (i: number): StopDetail | undefined => details[i]?.data;

  const branch = stops[0]?.to.branch;
  const delivered = day.data?.delivered ?? null;
  // Today's total = already delivered + still in the bag (design: "5 / 9", "Stop 6 of 9").
  const total = delivered == null ? stops.length : delivered + stops.length;
  const stopNumber = delivered == null ? 1 : delivered + 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={parcels.isRefetching}
            onRefresh={() => {
              parcels.refetch();
              day.refetch();
            }}
            tintColor={StaffColors.primary}
          />
        }
      >
        <StaffHeader
          initials={initials(me.fullName)}
          subtitle={[formatDay(), 'Courier', branch].filter(Boolean).join(' · ')}
          title={`${greeting()}, ${firstName(me.fullName)}`}
          avatarTone="warning"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => Alert.alert('Notifications', 'No new notifications.')}
              style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
            >
              <StaffIcon name="bell" size={20} color={StaffColors.navy} />
            </Pressable>
          }
        />

        {parcels.isPending ? (
          <CourierSkeleton />
        ) : parcels.isError ? (
          <ErrorState message={parcels.error.message} onRetry={() => parcels.refetch()} retrying={parcels.isRefetching} />
        ) : (
          <>
            <Stats day={day.data} total={total} />
            {stops.length === 0 ? (
              <EmptyState
                icon="box"
                title="No deliveries right now"
                text="Parcels appear here when your branch hands them to you."
              />
            ) : (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Next up</Text>
                  <Text style={styles.sectionMeta}>
                    Stop {stopNumber} of {total}
                  </Text>
                </View>
                <NextUpCard parcel={stops[0]} detail={detailOf(0)} detailLoading={!!details[0]?.isPending} />
                {stops.length > 1 && (
                  <LaterToday
                    stops={stops.slice(1)}
                    areaFor={(i) => areaOf(detailOf(i + 1)?.deliveryAddress, stops[i + 1])}
                  />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stats({ day, total }: { day: CourierDay | undefined; total: number }) {
  const delivered = day?.delivered;
  return (
    <View style={styles.stats}>
      <StatTile label="Delivered" value={dash(delivered)} total={delivered == null ? undefined : `/ ${total}`} />
      <StatTile label="Refused" value={dash(day?.refused)} />
      <StatTile label="Cash to remit" value={day?.cashToRemit == null ? '–' : formatMoney(day.cashToRemit)} />
    </View>
  );
}

function StatTile({
  label,
  value,
  total,
  unit,
  tone,
}: {
  label: string;
  value: string;
  total?: string;
  unit?: string;
  tone?: 'warning';
}) {
  const warn = tone === 'warning';
  return (
    <View style={[styles.stat, warn && { backgroundColor: StaffColors.warningTint, borderColor: StaffColors.warningTint }]}>
      <Text style={[styles.statLabel, warn && { color: StaffColors.warning }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, warn && { color: StaffColors.warning }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {total ? <Text style={styles.statTotal}> {total}</Text> : null}
      </Text>
      {unit && <Text style={[styles.statUnit, warn && { color: StaffColors.warning }]}>{unit}</Text>}
    </View>
  );
}

function NextUpCard({
  parcel,
  detail,
  detailLoading,
}: {
  parcel: ParcelListItem;
  detail: StopDetail | undefined;
  detailLoading: boolean;
}) {
  const router = useRouter();
  const address = detail?.deliveryAddress ?? `${parcel.to.branch}, ${parcel.to.city}`;

  function navigate() {
    // Add the city so Maps finds short addresses like "Mvog-Ada, near the pharmacy".
    const query = `${address}, ${parcel.to.city}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => Alert.alert('Could not open maps', query));
  }

  return (
    <View style={styles.hero}>
      <View style={styles.chips}>
        {parcel.homeDelivery && (
          <View style={styles.chipHero}>
            <Text style={styles.chipHeroText}>Home delivery</Text>
          </View>
        )}
        <View style={styles.chipHero}>
          <Text style={styles.chipHeroText}>{parcel.codAmount ? `Collect ${formatMoney(parcel.codAmount)}` : 'Paid'}</Text>
        </View>
      </View>

      <Text style={styles.heroTime}>{formatTime(parcel.updatedAt)}</Text>

      <View style={styles.heroLine}>
        <View style={[styles.heroDot, { backgroundColor: StaffColors.accent }]} />
        <Text style={styles.heroLineText} numberOfLines={2}>
          <Text style={styles.heroStrong}>{parcel.receiverName}</Text>
          {'  ·  '}
          {detailLoading ? 'Loading address…' : address}
        </Text>
      </View>
      <View style={styles.heroLine}>
        <View style={[styles.heroDot, styles.heroDotHollow]} />
        <Text style={styles.heroLineText} numberOfLines={1}>
          <Text style={{ fontFamily: monoFont }}>{parcel.trackingCode}</Text>
          {detail ? ` · seal ${detail.sealNumber}` : ''} · {parcel.weightKg} kg
        </Text>
      </View>

      <View style={styles.heroButtons}>
        <Pressable
          accessibilityRole="button"
          onPress={navigate}
          style={({ pressed }) => [styles.heroBtn, styles.heroBtnGhost, pressed && styles.pressed]}
        >
          <StaffIcon name="navigate" size={16} color={StaffColors.onDark} />
          <Text style={styles.heroBtnText}>Navigate</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/(staff)/deliver/[code]', params: { code: parcel.trackingCode } } as never)
          }
          style={({ pressed }) => [styles.heroBtn, styles.heroBtnAmber, pressed && styles.pressed]}
        >
          <Text style={[styles.heroBtnText, { color: StaffColors.amberInk }]}>Start delivery</Text>
          <StaffIcon name="arrow" size={16} color={StaffColors.amberInk} />
        </Pressable>
      </View>
    </View>
  );
}

function LaterToday({ stops, areaFor }: { stops: ParcelListItem[]; areaFor: (i: number) => string }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? stops : stops.slice(0, LATER_PREVIEW);
  return (
    <>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Later today</Text>
        {stops.length > LATER_PREVIEW && (
          <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} hitSlop={12}>
            <Text style={styles.seeAll}>{showAll ? 'Show less' : 'See all'}</Text>
          </Pressable>
        )}
      </View>
      <View style={{ gap: 8 }}>
        {shown.map((p, i) => (
          <LaterRow key={p.id} parcel={p} area={areaFor(i)} />
        ))}
      </View>
    </>
  );
}

function LaterRow({ parcel, area }: { parcel: ParcelListItem; area: string }) {
  return (
    <View style={styles.laterRow}>
      <View style={styles.timeTile}>
        <Text style={styles.timeTileText}>{formatTime(parcel.updatedAt)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.laterArea} numberOfLines={1}>
          {area}
        </Text>
        <Text style={styles.laterName} numberOfLines={1}>
          Receiver: {parcel.receiverName}
        </Text>
      </View>
      {parcel.codAmount ? (
        <View style={styles.collectChip}>
          <Text style={styles.collectText}>Collect {formatMoney(parcel.codAmount)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CourierSkeleton() {
  return (
    <View>
      <View style={styles.stats}>
        <SkeletonBlock height={84} style={{ flex: 1 }} />
        <SkeletonBlock height={84} style={{ flex: 1 }} />
        <SkeletonBlock height={84} style={{ flex: 1 }} />
      </View>
      <SkeletonBlock height={220} style={{ marginTop: 40, borderRadius: StaffSpace.heroRadius }} />
      <SkeletonBlock height={140} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background },
  // Bottom space keeps the list above the floating tab bar.
  content: { paddingHorizontal: StaffSpace.side, paddingBottom: 120 },
  pressed: { opacity: 0.75 },

  bell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: StaffColors.surface,
    borderWidth: 1,
    borderColor: StaffColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stat: { flex: 1, backgroundColor: StaffColors.surface, borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 12, color: StaffColors.muted, fontWeight: '600' },
  statValue: { fontSize: 20, color: StaffColors.navy, fontWeight: '800', marginTop: 4, fontFamily: monoFont },
  statTotal: { fontSize: 20, color: StaffColors.navy, fontWeight: '800' },
  statUnit: { fontSize: 11, color: StaffColors.muted, fontWeight: '600' },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: StaffColors.navy },
  sectionMeta: { fontSize: 13, color: StaffColors.muted, fontWeight: '600' },
  seeAll: { fontSize: 13, color: StaffColors.primary, fontWeight: '700' },

  // Blue "Next up" card (design picture "Courier · Today")
  hero: { backgroundColor: StaffColors.primary, borderRadius: StaffSpace.heroRadius, padding: 16 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chipHero: { backgroundColor: StaffColors.heroTile, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipHeroText: { color: StaffColors.onDark, fontSize: 12, fontWeight: '700' },
  heroTime: { color: StaffColors.onDark, fontFamily: monoFont, fontSize: 34, fontWeight: '700', marginTop: 12 },
  heroLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  heroDot: { width: 8, height: 8, borderRadius: 4 },
  heroDotHollow: { borderWidth: 1.5, borderColor: StaffColors.onDark },
  heroLineText: { flex: 1, color: StaffColors.onPrimaryMuted, fontSize: 13 },
  heroStrong: { color: StaffColors.onDark, fontWeight: '700' },
  heroButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroBtnGhost: { backgroundColor: StaffColors.heroTile },
  heroBtnAmber: { backgroundColor: StaffColors.accent },
  heroBtnText: { color: StaffColors.onDark, fontSize: 15, fontWeight: '700' },

  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: StaffColors.surface,
    borderRadius: 14,
  },
  timeTile: { backgroundColor: StaffColors.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  timeTileText: { fontFamily: monoFont, fontSize: 13, fontWeight: '700', color: StaffColors.navy },
  laterArea: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  laterName: { fontSize: 13, color: StaffColors.muted, marginTop: 2 },
  collectChip: { backgroundColor: StaffColors.warningTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  collectText: { color: StaffColors.warning, fontSize: 12, fontWeight: '700' },
});
