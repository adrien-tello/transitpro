// What slides up after a scan (design 3.4 valid ticket, 3.5 refused ticket, 3.8 parcel to load).
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PaymentMethod } from '@contracts/api-types';
import type { BoardingCheck, BoardingRefusal, DriverTrip, ParcelScanView } from '../staff.types';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatTime } from '../staff.format';
import { StaffIcon } from './StaffIcon';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  MTN_MOMO: 'MTN MoMo',
  ORANGE_MONEY: 'Orange Money',
  CASH: 'cash',
};

const REFUSAL_TITLE: Record<BoardingRefusal, string> = {
  ALREADY_BOARDED: 'Already boarded',
  WRONG_TRIP: 'Wrong bus',
  NOT_PAID: 'Not paid',
  CANCELLED: 'Cancelled ticket',
  NOT_FOUND: 'Unknown code',
};

// Amber = the person may still travel after a check; red = this ticket can never board.
const REFUSAL_TONE: Record<BoardingRefusal, 'warning' | 'danger'> = {
  ALREADY_BOARDED: 'warning',
  WRONG_TRIP: 'warning',
  NOT_PAID: 'warning',
  CANCELLED: 'danger',
  NOT_FOUND: 'danger',
};

// ── Ticket: valid ─────────────────────────────────────────────────────────────

export function ValidTicketSheet({
  trip,
  code,
  check,
  boarding,
  error,
  onConfirm,
  onCancel,
}: {
  trip: DriverTrip;
  code: string;
  check: Extract<BoardingCheck, { ok: true }>;
  boarding: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = check.ticket;
  const next = `${trip.passengers.boarded + 1} / ${trip.passengers.sold}`;
  return (
    <Sheet>
      <SheetHead tone="success" icon="check" kicker="VALID TICKET" text={`Paid with ${PAYMENT_LABEL[t.paymentMethod]} · for this bus`} />

      <View style={styles.passengerRow}>
        <View style={styles.passengerCard}>
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.passengerName}>{t.passengerName}</Text>
          <Text style={styles.code}>{t.ticketCode || code}</Text>
        </View>
        <View style={styles.seatBox}>
          <Text style={styles.seatLabel}>Seat</Text>
          <Text style={styles.seatNumber}>{t.seatNumber}</Text>
        </View>
      </View>
      <View style={styles.facts}>
        <Fact label="From" value={t.originCity} />
        <Fact label="To" value={t.destinationCity} />
        <Fact label="Departs" value={formatTime(trip.departureAt)} mono />
      </View>

      <View style={styles.notice}>
        <StaffIcon name="idcard" size={18} color={StaffColors.warning} />
        <Text style={styles.noticeText}>Check the CNI matches the name before confirming.</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton label={`Confirm boarding · ${next}`} icon="check" busy={boarding} onPress={onConfirm} />
      <OutlineButton label="Cancel" onPress={onCancel} disabled={boarding} />
    </Sheet>
  );
}

// ── Ticket: refused ───────────────────────────────────────────────────────────

export function RefusedTicketSheet({
  code,
  check,
  onPassengerList,
  onScanNext,
}: {
  code: string;
  check: Extract<BoardingCheck, { ok: false }>;
  onPassengerList: () => void;
  onScanNext: () => void;
}) {
  const tone = REFUSAL_TONE[check.reason];
  const already = check.reason === 'ALREADY_BOARDED';
  const seat = check.seatNumber;
  return (
    <Sheet>
      <SheetHead
        tone="danger"
        icon={tone === 'danger' ? 'x' : 'alert'}
        kicker={REFUSAL_TITLE[check.reason].toUpperCase()}
        text={already ? 'Do not let this person in yet' : 'Do not let this person board'}
        strong
      />

      <View style={styles.refusalBox}>
        <Text style={styles.refusalText}>
          {already && check.boardedAt
            ? `This ticket was scanned at ${formatTime(check.boardedAt)}${seat ? ` for seat ${seat}` : ''}. It may have been shared.`
            : check.message}
        </Text>
        <Text style={styles.refusalMeta}>
          {code}
          {already ? ' · scanned by you' : ''}
        </Text>
      </View>

      {already && (
        <>
          <Text style={styles.kickerGrey}>WHAT TO DO</Text>
          <Step n={1} text="Ask for the CNI and compare it with the name." />
          <Step n={2} text="If the name does not match the ticket, send the person to the counter." />
          {seat ? <Step n={3} text={`Look at seat ${seat}: is someone already sitting there?`} /> : null}
        </>
      )}

      <View style={styles.row2}>
        <Pressable
          accessibilityRole="button"
          onPress={onPassengerList}
          style={({ pressed }) => [styles.secondary, { flex: 1, marginTop: 0 }, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Passenger list</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onScanNext}
          style={({ pressed }) => [styles.primary, { flex: 1, marginTop: 0 }, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Scan next</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

// ── Parcel: load on the bus (driver) ──────────────────────────────────────────

export function ParcelLoadSheet({
  trip,
  code,
  parcel,
  loading,
  error,
  onLoad,
  onScanAnother,
}: {
  trip: DriverTrip;
  code: string;
  parcel: ParcelScanView | null; // null: the server lets the driver read it only once loaded
  loading: boolean;
  error: string | null;
  onLoad: () => void;
  onScanAnother: () => void;
}) {
  const canLoad = !parcel || parcel.status === 'REGISTERED';
  const destinationOk = parcel ? parcel.toCity === trip.destinationCity : null;
  return (
    <Sheet>
      <View style={styles.headRow}>
        <View style={[styles.headIcon, { backgroundColor: StaffColors.warningTint }]}>
          <StaffIcon name="box" size={22} color={StaffColors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.parcelCode}>{parcel?.trackingCode ?? code}</Text>
          <Text style={styles.small}>
            {parcel
              ? `${parcel.fromCity} ${parcel.fromBranch} → ${parcel.toCity}${parcel.homeDelivery ? ' · home delivery' : ''}`
              : 'Details show after loading. The server checks the bus and the fee when you tap Load.'}
          </Text>
        </View>
      </View>

      {parcel && (
        <>
          <View style={styles.facts}>
            <Fact label="Weight" value={`${parcel.weightKg} kg`} filled />
            <Fact label="Seal" value={parcel.sealNumber} filled />
            <Fact label="Fee" value={parcel.feePaid ? 'Paid' : 'Not paid'} filled />
          </View>
          <View style={{ marginTop: 6 }}>
            <CheckLine
              state={destinationOk ? 'ok' : 'bad'}
              title={destinationOk ? 'Destination matches' : 'Wrong destination'}
              sub={`this bus goes to ${trip.destinationCity}`}
            />
            <CheckLine
              state={parcel.feePaid ? 'ok' : 'bad'}
              title={parcel.feePaid ? 'Fee paid' : 'Fee not paid'}
              sub={parcel.feePaid ? `paid in ${parcel.fromCity}` : 'send it back to the counter'}
            />
            <CheckLine state="warn" title="Check the seal" sub={`number ${parcel.sealNumber}, not broken`} last />
          </View>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {canLoad ? (
        <PrimaryButton
          label={`Load on bus ${trip.busPlate} · ${trip.parcels.loaded + 1} / ${Math.max(trip.parcels.total, trip.parcels.loaded + 1)}`}
          busy={loading}
          onPress={onLoad}
        />
      ) : (
        <View style={[styles.card, styles.cardWarning]}>
          <Text style={styles.refusalText}>This parcel is {parcel?.status.toLowerCase().replaceAll('_', ' ')}: nothing to load.</Text>
        </View>
      )}
      <OutlineButton label="Scan another parcel" onPress={onScanAnother} disabled={loading} />
    </Sheet>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

function SheetHead({
  tone,
  icon,
  kicker,
  text,
  strong,
}: {
  tone: 'success' | 'danger';
  icon: 'check' | 'alert' | 'x';
  kicker: string;
  text: string;
  strong?: boolean;
}) {
  const bg = tone === 'success' ? StaffColors.successTint : StaffColors.dangerTint;
  const fg = tone === 'success' ? StaffColors.success : StaffColors.danger;
  return (
    <View style={styles.headRow}>
      <View style={[styles.headIcon, { backgroundColor: bg, borderRadius: 24 }]}>
        <StaffIcon name={icon} size={24} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.kicker, { color: fg }]}>{kicker}</Text>
        <Text style={strong ? styles.headStrong : styles.small}>{text}</Text>
      </View>
    </View>
  );
}

function OutlineButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function Fact({ label, value, mono, filled }: { label: string; value: string; mono?: boolean; filled?: boolean }) {
  return (
    <View style={[styles.fact, filled && styles.factFilled]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.factValue, mono && { fontFamily: monoFont }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function CheckLine({ state, title, sub, last }: { state: 'ok' | 'bad' | 'warn'; title: string; sub: string; last?: boolean }) {
  const bg = state === 'ok' ? StaffColors.successTint : state === 'bad' ? StaffColors.dangerTint : StaffColors.warningTint;
  const fg = state === 'ok' ? StaffColors.success : state === 'bad' ? StaffColors.danger : StaffColors.warning;
  return (
    <View style={[styles.checkLine, !last && styles.divider]}>
      <View style={[styles.checkDot, { backgroundColor: bg }]}>
        <StaffIcon name={state === 'ok' ? 'check' : state === 'bad' ? 'x' : 'alert'} size={14} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.checkTitle, state === 'warn' && { color: StaffColors.warning }]}>{title}</Text>
        <Text style={styles.checkSub}>{sub}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  sub,
  icon,
  busy,
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: 'check';
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator color={StaffColors.onDark} />
      ) : (
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon && <StaffIcon name={icon} size={18} color={StaffColors.onDark} />}
            <Text style={styles.primaryText}>{label}</Text>
          </View>
          {sub && <Text style={styles.primarySub}>{sub}</Text>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    backgroundColor: StaffColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: StaffColors.field },
  // Bottom space keeps the buttons above the floating tab bar.
  sheetContent: { paddingHorizontal: StaffSpace.side, paddingTop: 12, paddingBottom: 110 },
  pressed: { opacity: 0.75 },

  tripLine: { fontSize: 12, color: StaffColors.muted, fontWeight: '600', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: StaffColors.navy, textAlign: 'center', marginTop: 12 },
  subtitle: { fontSize: 14, color: StaffColors.body, textAlign: 'center', marginTop: 4 },
  subtitleLeft: { fontSize: 14, color: StaffColors.body, marginTop: 4, lineHeight: 20 },
  parcelCode: { fontFamily: monoFont, fontSize: 22, fontWeight: '700', color: StaffColors.navy, marginTop: 10 },

  card: {
    backgroundColor: StaffColors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: StaffColors.line,
    padding: 14,
    marginTop: 16,
  },
  cardWarning: { backgroundColor: StaffColors.warningTint, borderColor: StaffColors.warningTint },
  cardDanger: { backgroundColor: StaffColors.dangerTint, borderColor: StaffColors.dangerTint },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  headIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  kickerGrey: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: StaffColors.muted, marginTop: 16, marginBottom: 4 },
  headStrong: { fontSize: 17, fontWeight: '800', color: StaffColors.navy, marginTop: 1 },
  small: { fontSize: 12, color: StaffColors.muted, marginTop: 2 },
  passengerRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 16 },
  passengerCard: { flex: 1, backgroundColor: StaffColors.chip, borderRadius: 16, padding: 14 },
  fact: { flex: 1, borderWidth: 1, borderColor: StaffColors.line, borderRadius: 12, padding: 10 },
  factFilled: { backgroundColor: StaffColors.chip, borderColor: StaffColors.chip },
  refusalBox: {
    backgroundColor: StaffColors.dangerTint,
    borderWidth: 1,
    borderColor: StaffColors.danger,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  label: { fontSize: 12, color: StaffColors.muted, fontWeight: '600' },
  passengerName: { fontSize: 18, fontWeight: '800', color: StaffColors.navy, marginTop: 2 },
  code: { fontFamily: monoFont, fontSize: 13, color: StaffColors.body, marginTop: 4 },
  // Blue seat box (design picture "Boarding · valid ticket")
  seatBox: {
    backgroundColor: StaffColors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  seatLabel: { fontSize: 12, color: StaffColors.onPrimaryMuted, fontWeight: '700' },
  seatNumber: { fontSize: 40, color: StaffColors.onDark, fontWeight: '800' },
  facts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  factValue: { fontSize: 14, color: StaffColors.navy, fontWeight: '700', marginTop: 2 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: StaffColors.warningTint,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  noticeText: { flex: 1, fontSize: 13, color: StaffColors.warning, fontWeight: '600' },

  refusalText: { fontSize: 14, color: StaffColors.navy, lineHeight: 20, fontWeight: '600' },
  refusalMeta: { fontSize: 12, color: StaffColors.body, marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: StaffColors.navy, marginTop: 18, marginBottom: 6 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: StaffColors.chip, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '800', color: StaffColors.navy },
  stepText: { flex: 1, fontSize: 14, color: StaffColors.body, lineHeight: 20 },

  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  checkDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  checkSub: { fontSize: 12, color: StaffColors.muted, marginTop: 1 },

  error: { color: StaffColors.danger, fontSize: 13, fontWeight: '600', marginTop: 12 },
  row2: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primary: {
    minHeight: StaffSpace.buttonHeight,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  primaryText: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700' },
  primarySub: { color: StaffColors.primaryTint, fontSize: 12, fontWeight: '600', marginTop: 1 },
  secondary: {
    minHeight: StaffSpace.buttonHeight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StaffColors.field,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: { color: StaffColors.navy, fontSize: 15, fontWeight: '700' },
});
