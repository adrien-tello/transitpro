// Courier · Delivery (design 3.12), Delivered (3.13), Receiver refused (3.14).
// Real proof of delivery: GPS from expo-location (high accuracy), handover photo from the camera,
// the receiver's 4-digit code, and cash on delivery settled first. The server checks all of it again.
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import type { ParcelDetail, PaymentMethod } from '@contracts/api-types';
import {
  codPayment,
  codSettled,
  uploadDeliveryPhoto,
  useCodPayment,
  useDeliver,
  useParcelDetail,
  useRefuse,
} from '../staff.delivery';
import { useCourierDay, useMyParcels } from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { formatMoney, formatTime, initials } from '../staff.format';
import { StaffIcon } from './StaffIcon';
import { ErrorState, SkeletonBlock } from './StaffStates';
import { HandoverCamera } from './HandoverCamera';

// A position less precise than this does not prove the courier was at the door.
const GPS_MAX_ACCURACY_M = 100;

const REFUSAL_REASONS = [
  'Seal broken or different',
  'Contents not as declared',
  'Damaged',
  'Not my parcel',
  'Other',
] as const;

interface Gps {
  lat: number;
  lng: number;
  accuracy: number;
  at: string;
}

interface Photo {
  uri: string;
  at: string;
  url: string | null; // set once uploaded
  uploading: boolean;
  error: string | null;
}

export function DeliveryScreen({ code, scanned }: { code: string; scanned: boolean }) {
  const parcel = useParcelDetail(code);
  const [view, setView] = useState<'deliver' | 'refuse' | 'done'>('deliver');
  const router = useRouter();
  const goToday = () => router.navigate('/(staff)/(tabs)' as never);

  return (
    <View style={styles.root}>
      {parcel.isPending ? (
        <SafeAreaView style={styles.pad}>
          <SkeletonBlock height={160} style={{ borderRadius: 32 }} />
          <SkeletonBlock height={90} style={{ marginTop: 16 }} />
          <SkeletonBlock height={220} style={{ marginTop: 16 }} />
        </SafeAreaView>
      ) : parcel.isError ? (
        <SafeAreaView style={styles.pad}>
          <BackRow label="Today" onPress={goToday} dark={false} />
          <ErrorState message={parcel.error.message} onRetry={() => parcel.refetch()} retrying={parcel.isRefetching} />
        </SafeAreaView>
      ) : view === 'done' ? (
        <DeliveredView parcel={parcel.data} onToday={goToday} />
      ) : view === 'refuse' ? (
        <RefuseView parcel={parcel.data} onBack={() => setView('deliver')} onDone={goToday} />
      ) : (
        <DeliverView
          parcel={parcel.data}
          scanned={scanned}
          onToday={goToday}
          onDelivered={() => setView('done')}
          onRefuse={() => setView('refuse')}
        />
      )}
    </View>
  );
}

// ── Deliver ───────────────────────────────────────────────────────────────────

function DeliverView({
  parcel,
  scanned,
  onToday,
  onDelivered,
  onRefuse,
}: {
  parcel: ParcelDetail;
  scanned: boolean;
  onToday: () => void;
  onDelivered: () => void;
  onRefuse: () => void;
}) {
  const code = parcel.trackingCode;
  const day = useCourierDay();
  const mine = useMyParcels();
  const deliver = useDeliver(code);

  const [gps, setGps] = useState<Gps | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const otpRef = useRef<TextInput>(null);

  const openForDelivery = parcel.status === 'OUT_FOR_DELIVERY';
  const gpsOk = !!gps && gps.accuracy <= GPS_MAX_ACCURACY_M;
  const photoOk = !!photo?.url;
  const cashOk = codSettled(parcel);
  const codeOk = otp.length === 4;
  const ready = openForDelivery && gpsOk && photoOk && cashOk && codeOk;

  // "3 of 7 today": delivered so far + this one, of delivered + still in the bag.
  const delivered = day.data?.delivered;
  const left = mine.data?.length;
  const progress = delivered != null && left != null ? `${delivered + 1} of ${delivered + left} today` : null;

  async function recordGps() {
    setGpsBusy(true);
    setGpsError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setGpsError('Allow location: the position proves where the parcel was delivered.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setGps({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy ?? 9999),
        at: new Date().toISOString(),
      });
    } catch {
      setGpsError('No GPS position. Check that location is on, then try again.');
    } finally {
      setGpsBusy(false);
    }
  }

  async function sendPhoto(uri: string) {
    const at = new Date().toISOString();
    setPhoto({ uri, at, url: null, uploading: true, error: null });
    try {
      const url = await uploadDeliveryPhoto(uri);
      setPhoto({ uri, at, url, uploading: false, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'The photo could not be sent';
      setPhoto({ uri, at, url: null, uploading: false, error: message });
    }
  }

  function confirm() {
    if (!ready || !gps || !photo?.url) return;
    deliver.mutate(
      { otp, photoUrl: photo.url, lat: gps.lat, lng: gps.lng },
      {
        onSuccess: onDelivered,
        onError: () => {
          setOtp(''); // wrong code: the server says how many tries are left
          otpRef.current?.focus();
        },
      },
    );
  }

  const missing = [!gpsOk && 'GPS', !photoOk && 'photo', !cashOk && 'cash', !codeOk && 'code'].filter(Boolean);
  const confirmLabel = ready
    ? 'Confirm delivery'
    : missing.length === 1 && !codeOk
      ? 'Confirm delivery (enter the code)'
      : `Confirm delivery (${missing.join(', ')} missing)`;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerTop}>
              <BackRow label="Today" onPress={onToday} dark />
              {progress && (
                <View style={styles.headerPill}>
                  <Text style={styles.headerPillText}>{progress}</Text>
                </View>
              )}
            </View>
            <Text style={styles.h1}>
              Deliver <Text style={{ fontFamily: monoFont }}>{code}</Text>
            </Text>
            <Text style={styles.headerSub}>
              {scanned ? 'Scanned and matched' : 'Label not scanned'} · seal {parcel.security.sealNumber}
            </Text>
          </SafeAreaView>
        </View>

        <View style={styles.pad}>
          {!openForDelivery && (
            <View style={[styles.card, styles.cardWarning]}>
              <Text style={styles.bold}>This parcel is {parcel.status.toLowerCase().replaceAll('_', ' ')}.</Text>
              <Text style={styles.body}>It cannot be delivered now. Call your branch if this is wrong.</Text>
            </View>
          )}

          <View style={[styles.card, styles.receiver]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(parcel.receiver.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bold}>{parcel.receiver.name}</Text>
              <Text style={styles.body}>
                {parcel.deliveryAddress ?? parcel.to.branch} · {parcel.to.city}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${parcel.receiver.name}`}
              onPress={() => Linking.openURL(`tel:${parcel.receiver.phone}`)}
              style={styles.call}
            >
              <StaffIcon name="phone" size={20} color={StaffColors.success} />
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Proof of delivery</Text>
            <ProofRow
              done={gpsOk}
              title="At the delivery address"
              sub={
                gpsBusy
                  ? 'Getting your position…'
                  : gpsError
                    ? gpsError
                    : gps
                      ? gpsOk
                        ? `GPS recorded · ±${gps.accuracy} m · ${formatTime(gps.at)}`
                        : `Weak signal (±${gps.accuracy} m). Step outside and try again.`
                      : 'Record your position at the door'
              }
              warn={!!gpsError || (!!gps && !gpsOk)}
              action={gpsBusy ? 'busy' : { label: gps ? 'Again' : 'Record', onPress: recordGps }}
            />
            <ProofRow
              done={photoOk}
              title="Handover photo taken"
              sub={
                !photo
                  ? "The parcel in the receiver's hands"
                  : photo.uploading
                    ? 'Sending the photo…'
                    : photo.error
                      ? photo.error
                      : `${formatTime(photo.at)} · stored with the parcel`
              }
              warn={!!photo?.error}
              action={
                photo?.uploading
                  ? 'busy'
                  : photo?.error
                    ? { label: 'Retry', onPress: () => sendPhoto(photo.uri) }
                    : { label: photo ? 'Retake' : 'Take', onPress: () => setCameraOpen(true) }
              }
            />
            <CashRow parcel={parcel} last />
          </View>

          <View style={[styles.card, { paddingBottom: 14 }]}>
            <Text style={styles.cardTitle}>Receiver's code</Text>
            {deliver.error ? (
              <Text style={styles.error}>{deliver.error.message}</Text>
            ) : (
              <Text style={styles.helper}>
                Ask {parcel.receiver.name.split(' ')[0]} for the 4-digit code from the SMS once they have checked the parcel.
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter the receiver's code"
              onPress={() => otpRef.current?.focus()}
              style={styles.otpRow}
            >
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.otpBox, (!!otp[i] || otp.length === i) && styles.otpBoxActive]}>
                  <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                </View>
              ))}
            </Pressable>
          {/* One hidden field drives the 4 boxes: auto-advance and paste work for free. */}
          <TextInput
            ref={otpRef}
            value={otp}
            onChangeText={(t) => {
              setOtp(t.replace(/\D/g, '').slice(0, 4));
              deliver.reset();
            }}
            keyboardType="number-pad"
            maxLength={4}
            textContentType="oneTimeCode"
            style={styles.hiddenInput}
          />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || deliver.isPending, busy: deliver.isPending }}
            disabled={!ready || deliver.isPending}
            onPress={confirm}
            style={({ pressed }) => [styles.primary, !ready && styles.primaryDisabled, (pressed || deliver.isPending) && { opacity: 0.8 }]}
          >
            {deliver.isPending ? (
              <ActivityIndicator color={StaffColors.onDark} />
            ) : (
              <Text style={[styles.primaryText, !ready && { color: StaffColors.muted }]}>{confirmLabel}</Text>
            )}
          </Pressable>
          {openForDelivery && (
            <Pressable accessibilityRole="button" onPress={onRefuse} style={[styles.secondary, styles.refuseBtn]} disabled={deliver.isPending}>
              <Text style={styles.refuseText}>Receiver refused the parcel</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <HandoverCamera
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onTaken={(uri) => {
          setCameraOpen(false);
          void sendPhoto(uri);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// Cash on delivery: cash in hand, or Mobile Money approved on the receiver's phone.
function CashRow({ parcel, last }: { parcel: ParcelDetail; last?: boolean }) {
  const cod = useCodPayment(parcel.trackingCode);
  const [momoOpen, setMomoOpen] = useState(false);
  const [method, setMethod] = useState<Extract<PaymentMethod, 'MTN_MOMO' | 'ORANGE_MONEY'>>('MTN_MOMO');
  const [phone, setPhone] = useState('');

  if (!parcel.codAmount) {
    return <ProofRow done title="Nothing to collect" sub="Already paid" last={last} />;
  }
  const amount = `${formatMoney(parcel.codAmount)} FCFA`;
  const pay = codPayment(parcel);
  if (pay?.status === 'SUCCEEDED') {
    return <ProofRow done title={`Collected ${amount}`} sub={pay.method === 'CASH' ? 'Cash in your hands: remit it today' : 'Paid by Mobile Money'} last={last} />;
  }
  if (pay?.status === 'PENDING') {
    return <ProofRow done={false} title={`Collect ${amount}`} sub="Waiting for the receiver to approve on their phone…" action="busy" last={last} />;
  }

  const failed = pay?.status === 'FAILED';
  const confirmCash = () =>
    Alert.alert('Cash received?', `Confirm you have ${amount} in your hands.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, received', onPress: () => cod.mutate({ method: 'CASH' }) },
    ]);

  return (
    <View style={[styles.proofRow, { flexDirection: 'column', alignItems: 'stretch' }, !last && styles.divider]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Dot done={false} warn />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bold, { color: StaffColors.warning }]}>Collect {amount}</Text>
          <Text style={[styles.small, (failed || cod.isError) && { color: StaffColors.danger }]}>
            {cod.error?.message ?? (failed ? 'The Mobile Money payment failed. Try again.' : 'Before the receiver gets the parcel')}
          </Text>
        </View>
      </View>
      <View style={styles.cashButtons}>
        <SmallButton label="Collect cash" onPress={confirmCash} busy={cod.isPending && cod.variables?.method === 'CASH'} disabled={cod.isPending} />
        <SmallButton label="Mobile Money" onPress={() => setMomoOpen((v) => !v)} outline disabled={cod.isPending} />
      </View>
      {momoOpen && (
        <View style={{ marginTop: 10 }}>
          <View style={styles.cashButtons}>
            {(['MTN_MOMO', 'ORANGE_MONEY'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ selected: method === m }}
                onPress={() => setMethod(m)}
                style={[styles.chip, method === m && styles.chipActive]}
              >
                <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Receiver's number, e.g. 6 90 00 33 12"
            placeholderTextColor={StaffColors.hint}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <SmallButton
            label={`Send the request · ${amount}`}
            onPress={() => cod.mutate({ method, payerPhone: phone.replace(/\s/g, '') })}
            busy={cod.isPending && cod.variables?.method !== 'CASH'}
            disabled={cod.isPending || phone.replace(/\D/g, '').length < 9}
          />
        </View>
      )}
    </View>
  );
}

// ── Delivered ─────────────────────────────────────────────────────────────────

function DeliveredView({ parcel, onToday }: { parcel: ParcelDetail; onToday: () => void }) {
  const router = useRouter();
  const mine = useMyParcels();
  const next = mine.data
    ?.filter((p) => p.status === 'OUT_FOR_DELIVERY' && p.trackingCode !== parcel.trackingCode)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  const at = parcel.delivery.deliveredAt ?? new Date().toISOString();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.header, styles.doneHeader]}>
        <SafeAreaView edges={['top']} style={{ alignItems: 'center' }}>
          <View style={styles.bigCheck}>
            <StaffIcon name="check" size={44} color={StaffColors.success} />
          </View>
          <Text style={[styles.h1, styles.center]}>Delivered</Text>
          <Text style={[styles.headerSub, styles.center]}>
            {parcel.trackingCode} handed to <Text style={styles.heroStrong}>{parcel.receiver.name}</Text> at {formatTime(at)}
          </Text>
          <View style={styles.doneChips}>
            <View style={styles.headerPill}>
              <Text style={styles.headerPillText}>Proof saved</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.pad}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Proof saved with the parcel</Text>
          <ProofRow done title="Receiver code" sub="Correct" />
          <ProofRow done title="Handover photo" sub="Stored with the parcel" />
          <ProofRow done title="At the address" sub="GPS position saved" />
          <ProofRow
            done
            title={parcel.codAmount ? `Collected ${formatMoney(parcel.codAmount)} FCFA` : 'Nothing to collect'}
            sub={parcel.codAmount ? 'Held until the sender is paid' : 'Already paid'}
            last
          />
        </View>

        {next && (
          <>
            <View style={[styles.card, styles.receiver]}>
              <View style={styles.timeTile}>
                <Text style={styles.timeTileText}>{formatTime(next.updatedAt)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.small}>Next</Text>
                <Text style={styles.bold}>{next.receiverName}</Text>
                <Text style={styles.small}>{next.trackingCode}</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace({ pathname: '/(staff)/deliver/[code]', params: { code: next.trackingCode } } as never)}
              style={[styles.primary, styles.rowCenter]}
            >
              <Text style={styles.primaryText}>Next delivery</Text>
              <StaffIcon name="arrow" size={18} color={StaffColors.onDark} />
            </Pressable>
          </>
        )}
        <Pressable accessibilityRole="button" onPress={onToday} style={next ? styles.textBtn : styles.primary}>
          <Text style={next ? styles.secondaryText : styles.primaryText}>Back to today</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Receiver refused ──────────────────────────────────────────────────────────

function RefuseView({ parcel, onBack, onDone }: { parcel: ParcelDetail; onBack: () => void; onDone: () => void }) {
  const refuse = useRefuse(parcel.trackingCode);
  const [reason, setReason] = useState<(typeof REFUSAL_REASONS)[number]>('Seal broken or different');
  const [details, setDetails] = useState('');

  function confirm() {
    const text = details.trim() ? `${reason}. ${details.trim()}` : reason;
    refuse.mutate(
      { reason: text },
      {
        onSuccess: () => {
          Alert.alert('Refusal recorded', `Keep the parcel and bring it back to the ${parcel.to.branch} branch.`);
          onDone();
        },
      },
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.refuseHead}>
            <BackRow label="Back" onPress={onBack} dark={false} />
            <View style={{ flex: 1 }}>
              <Text style={styles.refuseTitle}>The receiver refuses</Text>
              <Text style={styles.small}>
                {parcel.trackingCode} · {parcel.receiver.name}
              </Text>
            </View>
          </View>

          <View style={[styles.card, { paddingBottom: 14 }]}>
            <Text style={styles.cardTitle}>What is wrong?</Text>
            <View style={styles.reasons}>
              {REFUSAL_REASONS.map((r) => (
                <Pressable
                  key={r}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reason === r }}
                  onPress={() => setReason(r)}
                  style={[styles.reason, reason === r && styles.reasonActive]}
                >
                  <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.bold, { marginTop: 14 }]}>Details (for the branch manager)</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder={`e.g. The seal number is not ${parcel.security.sealNumber} as registered.`}
              placeholderTextColor={StaffColors.hint}
              multiline
              maxLength={400}
              style={[styles.input, styles.textarea]}
            />
          </View>

          <View style={styles.nextBox}>
            <Text style={styles.nextTitle}>What happens next</Text>
            <Text style={styles.nextText}>
              A claim is opened for the branch manager. You keep the parcel and bring it back to the {parcel.to.branch}{' '}
              branch. Any cash on delivery goes back to the receiver.
            </Text>
          </View>

          {refuse.error && <Text style={styles.error}>{refuse.error.message}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={refuse.isPending}
            onPress={confirm}
            style={({ pressed }) => [styles.primary, styles.danger, (pressed || refuse.isPending) && { opacity: 0.8 }]}
          >
            {refuse.isPending ? <ActivityIndicator color={StaffColors.onDark} /> : <Text style={styles.primaryText}>Confirm the refusal</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.textBtn} disabled={refuse.isPending}>
            <Text style={styles.secondaryText}>Go back, the receiver accepts</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Small pieces ──────────────────────────────────────────────────────────────

function BackRow({ label, onPress, dark }: { label: string; onPress: () => void; dark: boolean }) {
  const color = dark ? StaffColors.onDark : StaffColors.navy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.back, !dark && styles.backLight]}
      hitSlop={8}
    >
      <View style={{ transform: [{ rotate: '180deg' }] }}>
        <StaffIcon name="chevron" size={18} color={color} />
      </View>
      {dark && <Text style={[styles.backText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

function Dot({ done, warn }: { done: boolean; warn?: boolean }) {
  const bg = done ? StaffColors.successTint : warn ? StaffColors.warningTint : StaffColors.chip;
  return (
    <View style={[styles.dot, { backgroundColor: bg }]}>
      {done ? <StaffIcon name="check" size={14} color={StaffColors.success} /> : warn ? <StaffIcon name="alert" size={14} color={StaffColors.warning} /> : null}
    </View>
  );
}

function ProofRow({
  done,
  title,
  sub,
  warn,
  action,
  last,
}: {
  done: boolean;
  title: string;
  sub: string;
  warn?: boolean;
  action?: 'busy' | { label: string; onPress: () => void };
  last?: boolean;
}) {
  return (
    <View style={[styles.proofRow, !last && styles.divider]}>
      <Dot done={done} warn={warn} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bold}>{title}</Text>
        <Text style={[styles.small, warn && { color: StaffColors.danger }]}>{sub}</Text>
      </View>
      {action === 'busy' ? (
        <ActivityIndicator color={StaffColors.primary} />
      ) : action ? (
        <SmallButton label={action.label} onPress={action.onPress} outline={done} />
      ) : null}
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  outline,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [styles.small_btn, outline && styles.small_btnOutline, (pressed || disabled) && { opacity: 0.6 }]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? StaffColors.primary : StaffColors.onDark} />
      ) : (
        <Text style={[styles.small_btnText, outline && { color: StaffColors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.background },
  pad: { paddingHorizontal: StaffSpace.side, paddingTop: 12 },
  center: { textAlign: 'center' },

  // Blue header (design pictures "Courier · Delivery" and "Delivered")
  header: {
    backgroundColor: StaffColors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: StaffSpace.side,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  headerPill: { backgroundColor: StaffColors.heroTile, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  headerPillText: { color: StaffColors.onDark, fontSize: 12, fontWeight: '700' },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: StaffColors.heroTile,
    alignSelf: 'flex-start',
  },
  backLight: { backgroundColor: StaffColors.surface, width: 44, height: 44, paddingHorizontal: 0, borderRadius: 14, justifyContent: 'center' },
  backText: { fontSize: 14, fontWeight: '700' },
  h1: { color: StaffColors.onDark, fontSize: 22, fontWeight: '800', marginTop: 10 },
  headerSub: { color: StaffColors.onPrimaryMuted, fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: StaffColors.surface,
    borderRadius: StaffSpace.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: StaffColors.navy, paddingTop: 12, paddingBottom: 2 },
  cardWarning: { backgroundColor: StaffColors.warningTint, borderColor: StaffColors.warningTint, paddingVertical: 12 },
  receiver: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: StaffColors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: StaffColors.primaryInk, fontWeight: '800', fontSize: 15 },
  call: { width: 48, height: 48, borderRadius: 14, backgroundColor: StaffColors.successTint, alignItems: 'center', justifyContent: 'center' },

  bold: { fontSize: 14, fontWeight: '700', color: StaffColors.navy },
  body: { fontSize: 14, color: StaffColors.body, lineHeight: 21, marginTop: 2 },
  small: { fontSize: 12, color: StaffColors.muted, marginTop: 2 },
  section: { fontSize: 15, fontWeight: '700', color: StaffColors.navy, marginTop: 22 },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: StaffColors.divider },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cashButtons: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },

  small_btn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small_btnOutline: { backgroundColor: StaffColors.surface, borderWidth: 1, borderColor: StaffColors.field },
  small_btnText: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700' },

  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: StaffColors.field, justifyContent: 'center' },
  chipActive: { borderColor: StaffColors.primary, backgroundColor: StaffColors.primaryTint },
  chipText: { fontSize: 13, fontWeight: '700', color: StaffColors.body },
  chipTextActive: { color: StaffColors.primaryInk },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StaffColors.field,
    backgroundColor: StaffColors.surface,
    paddingHorizontal: 14,
    fontSize: 15,
    color: StaffColors.navy,
    marginTop: 10,
    marginBottom: 10,
  },
  textarea: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },

  otpRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  otpBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StaffColors.field,
    backgroundColor: StaffColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: { borderWidth: 2, borderColor: StaffColors.primaryInk },
  otpDigit: { fontFamily: monoFont, fontSize: 26, fontWeight: '700', color: StaffColors.navy },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  helper: { fontSize: 13, color: StaffColors.muted, marginTop: 8, lineHeight: 19 },
  error: { fontSize: 13, color: StaffColors.danger, fontWeight: '700', marginTop: 8 },

  primary: {
    minHeight: StaffSpace.buttonHeight,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 12,
  },
  primaryText: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  danger: { backgroundColor: StaffColors.danger },
  primaryDisabled: { backgroundColor: StaffColors.primaryTint },
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
  refuseBtn: { backgroundColor: StaffColors.surface },
  refuseText: { color: StaffColors.danger, fontSize: 15, fontWeight: '700' },

  refuseHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  refuseTitle: { fontSize: 20, fontWeight: '800', color: StaffColors.navy },
  nextBox: { backgroundColor: StaffColors.primaryTint, borderRadius: 16, padding: 14, marginTop: 12 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: StaffColors.primaryInk },
  nextText: { fontSize: 13, color: StaffColors.primaryInk, lineHeight: 19, marginTop: 4 },
  doneHeader: { paddingTop: 12, paddingBottom: 28 },
  doneChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  heroStrong: { color: StaffColors.onDark, fontWeight: '700' },
  rowCenter: { flexDirection: 'row', gap: 8 },
  textBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  bigCheck: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: StaffColors.surface, // white circle on the blue header
    borderWidth: 10,
    borderColor: StaffColors.heroTile,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  timeTile: { backgroundColor: StaffColors.chip, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  timeTileText: { fontFamily: monoFont, fontSize: 13, fontWeight: '700', color: StaffColors.navy },

  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  reason: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: StaffColors.field,
    backgroundColor: StaffColors.surface,
    justifyContent: 'center',
  },
  reasonActive: { borderWidth: 2, borderColor: StaffColors.danger, backgroundColor: StaffColors.dangerTint },
  reasonText: { fontSize: 13, fontWeight: '700', color: StaffColors.body },
  reasonTextActive: { color: StaffColors.danger },
});
