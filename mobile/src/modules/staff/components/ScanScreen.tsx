// Scan (design 3.3 tickets, 3.8 parcels). Real camera: expo-camera reads QR codes by itself.
// Driver: Tickets | Parcels. Courier: parcels only (a scan opens the delivery screen).
// Spec: docs/tasks/fidel-staff-app.md 4.3 to 4.6.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { Me } from '@contracts/api-types';
import type { BoardingCheck, DriverTrip, ParcelScanView } from '../staff.types';
import {
  pickTodayTrip,
  useBoardTicket,
  useCheckTicket,
  useDriverTrips,
  useLoadParcel,
  useLookupParcel,
} from '../staff.queries';
import { StaffColors, StaffSpace, monoFont } from '../staff.theme';
import { StaffIcon } from './StaffIcon';
import { ProgressBar } from './ProgressBar';
import { ParcelLoadSheet, RefusedTicketSheet, ValidTicketSheet } from './ScanResultSheet';

type Mode = 'tickets' | 'parcels';
const FRAME = 248;
const SAME_CODE_IGNORE_MS = 3000; // the camera reads the same QR many times per second

type Result =
  | { kind: 'ticket'; code: string; check: BoardingCheck }
  | { kind: 'parcel'; code: string; parcel: ParcelScanView | null };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function ScanScreen({ me }: { me: Me }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isDriver = me.role === 'DRIVER';

  const [mode, setMode] = useState<Mode>(isDriver ? 'tickets' : 'parcels');
  const [torch, setTorch] = useState(false);
  const [focused, setFocused] = useState(true);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const trips = useDriverTrips();
  const trip = isDriver && trips.data ? pickTodayTrip(trips.data) : undefined;

  const checkTicket = useCheckTicket();
  const board = useBoardTicket();
  const lookup = useLookupParcel();
  const load = useLoadParcel();
  const busy = checkTicket.isPending || lookup.isPending;

  // Today's "Scan tickets" / "Scan parcels" buttons open this tab in the right mode.
  useEffect(() => {
    if (isDriver && (params.mode === 'tickets' || params.mode === 'parcels')) setMode(params.mode);
  }, [params.mode, isDriver]);

  // The camera runs only while this tab is on screen (battery, and the next tab may need it).
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setTorch(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  function reset() {
    setResult(null);
    setScanError(null);
    board.reset();
    load.reset();
  }

  function handleCode(raw: string) {
    const code = normalizeCode(raw);
    if (!code || busy || result) return;
    const now = Date.now();
    if (lastScan.current && lastScan.current.code === code && now - lastScan.current.at < SAME_CODE_IGNORE_MS) return;
    lastScan.current = { code, at: now };
    Vibration.vibrate(40);
    setScanError(null);

    if (!isDriver) {
      // Courier: a parcel label opens its delivery. The server checks the courier holds it.
      if (!code.startsWith('TP-')) return setScanError('This is not a parcel label (codes start with TP-)');
      router.push({ pathname: '/(staff)/deliver/[code]', params: { code, scanned: '1' } } as never);
      return;
    }
    if (!trip) return setScanError('No trip assigned today. Your branch manager assigns trips.');

    if (mode === 'tickets') {
      if (!code.startsWith('TK-')) return setScanError('This is not a ticket (codes start with TK-)');
      checkTicket.mutate(
        { code, tripId: trip.id },
        {
          onSuccess: (check) => setResult({ kind: 'ticket', code, check }),
          onError: (e) => setScanError(e.message),
        },
      );
    } else {
      if (!code.startsWith('TP-')) return setScanError('This is not a parcel label (codes start with TP-)');
      lookup.mutate(
        { code },
        {
          onSuccess: (parcel) => setResult({ kind: 'parcel', code, parcel }),
          onError: (e) => setScanError(e.message),
        },
      );
    }
  }

  function onBarcode(e: BarcodeScanningResult) {
    handleCode(e.data);
  }

  function submitTyped() {
    const code = typed;
    lastScan.current = null; // typing the same code again on purpose must work
    handleCode(code);
    setTyped('');
  }

  function confirmBoarding(code: string) {
    if (!trip) return;
    board.mutate(
      { code, tripId: trip.id },
      {
        onSuccess: (r) => {
          Vibration.vibrate(60);
          setToast(`Seat ${r.seatNumber} · ${r.passengerName} boarded · ${r.passengers.boarded} / ${r.passengers.sold}`);
          reset(); // camera reopens at once for the next passenger
        },
      },
    );
  }

  function loadParcel(code: string) {
    if (!trip) return;
    load.mutate(
      { code, tripId: trip.id },
      {
        onSuccess: (p) => {
          Vibration.vibrate(60);
          setToast(`${p.trackingCode} loaded on ${trip.busPlate}`);
          reset();
        },
      },
    );
  }

  const openPassengerList = () => {
    if (!trip) return;
    reset();
    router.push({ pathname: '/(staff)/trip/[id]/passengers', params: { id: trip.id } } as never);
  };

  const cameraReady = permission?.granted && focused;
  const canScan = !result && !busy;

  return (
    <View style={styles.root}>
      {cameraReady && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={canScan ? onBarcode : undefined}
        />
      )}
      <FrameOverlay />

      <SafeAreaView style={styles.layer} edges={['top']}>
        <View style={styles.header}>
          <RoundButton
            icon="x"
            label="Close scanner"
            onPress={() => router.navigate('/(staff)/(tabs)' as never)}
          />
          {isDriver ? (
            <View style={styles.segment}>
              {(['tickets', 'parcels'] as const).map((m) => (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                  onPress={() => {
                    setMode(m);
                    reset();
                  }}
                  style={[styles.segmentItem, mode === m && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                    {m === 'tickets' ? 'Tickets' : 'Parcels'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.headerTitle}>Scan a parcel</Text>
          )}
          <RoundButton
            icon="bulb"
            label={torch ? 'Torch off' : 'Torch on'}
            active={torch}
            onPress={() => setTorch((t) => !t)}
            disabled={!cameraReady}
          />
        </View>

        <View style={styles.intro}>
          {trip && (
            <Text style={styles.tripText}>
              Trip {trip.code} · {trip.originCity} → {trip.destinationCity}
            </Text>
          )}
          <Text style={styles.instruction}>
            {mode === 'tickets' ? "Scan the passenger's ticket" : "Scan the parcel's label"}
          </Text>
        </View>

        <View style={styles.frameSlot}>
          {!permission ? null : !permission.granted ? (
            <PermissionCard
              canAsk={permission.canAskAgain}
              onAllow={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
            />
          ) : (
            <ScanLine />
          )}
        </View>
        <Text style={styles.helper}>
          {busy ? 'Checking…' : permission?.granted ? 'Hold steady · it scans by itself' : 'Or type the code below'}
        </Text>
        {scanError && (
          <View style={styles.scanError}>
            <Text style={styles.scanErrorText}>{scanError}</Text>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomWrap}
          pointerEvents="box-none"
        >
          <View style={styles.bottomSheet}>
            <View style={styles.grabber} />
            {isDriver && trip && mode === 'tickets' && <BoardedCounter trip={trip} onList={openPassengerList} />}
            {isDriver && trip && mode === 'parcels' && (
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  Parcels loaded {trip.parcels.loaded} / {trip.parcels.total}
                </Text>
              </View>
            )}
            <Text style={styles.manualLabel}>QR damaged? Type the code</Text>
            <View style={styles.manualRow}>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder={mode === 'tickets' ? 'TK-58104' : 'TP-DLA-48230'}
                placeholderTextColor={StaffColors.hint}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={submitTyped}
                style={styles.manualInput}
                editable={!result}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check this code"
                disabled={!typed.trim() || busy || !!result}
                onPress={submitTyped}
                style={({ pressed }) => [styles.goBtn, (pressed || !typed.trim() || busy) && { opacity: 0.6 }]}
              >
                {busy ? (
                  <ActivityIndicator color={StaffColors.onDark} />
                ) : (
                  <StaffIcon name="chevron" size={22} color={StaffColors.onDark} />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {result && trip && result.kind === 'ticket' && result.check.ok && (
        <ValidTicketSheet
          trip={trip}
          code={result.code}
          check={result.check}
          boarding={board.isPending}
          error={board.error?.message ?? null}
          onConfirm={() => confirmBoarding(result.code)}
          onCancel={reset}
        />
      )}
      {result && trip && result.kind === 'ticket' && !result.check.ok && (
        <RefusedTicketSheet
          code={result.code}
          check={result.check}
          onPassengerList={openPassengerList}
          onScanNext={reset}
        />
      )}
      {result && trip && result.kind === 'parcel' && (
        <ParcelLoadSheet
          trip={trip}
          code={result.code}
          parcel={result.parcel}
          loading={load.isPending}
          error={load.error?.message ?? null}
          onLoad={() => loadParcel(result.code)}
          onScanAnother={reset}
        />
      )}

      {toast && (
        <SafeAreaView style={styles.toastWrap} edges={['top']} pointerEvents="none">
          <View style={styles.toast}>
            <StaffIcon name="check" size={16} color={StaffColors.success} />
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

function BoardedCounter({ trip, onList }: { trip: DriverTrip; onList: () => void }) {
  const missing = Math.max(0, trip.passengers.sold - trip.passengers.boarded);
  return (
    <View>
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          Boarded {trip.passengers.boarded} / {trip.passengers.sold}
        </Text>
        {missing > 0 && (
          <Pressable accessibilityRole="button" onPress={onList} style={styles.missingPill} hitSlop={8}>
            <Text style={styles.missingText}>{missing} missing · list</Text>
          </Pressable>
        )}
      </View>
      <ProgressBar value={trip.passengers.boarded} total={trip.passengers.sold} color={StaffColors.primary} track={StaffColors.chip} />
    </View>
  );
}

// Dark veil around a clear square, so the eye goes to the frame.
function FrameOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.veil} />
    </View>
  );
}

// Corner brackets + the amber line that moves while the camera looks for a code.
function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: FRAME - 24, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <View style={styles.frame}>
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
      <Animated.View style={[styles.line, { transform: [{ translateY: y }] }]} />
    </View>
  );
}

function PermissionCard({ canAsk, onAllow }: { canAsk: boolean; onAllow: () => void }) {
  return (
    <View style={[styles.frame, styles.permission]}>
      <StaffIcon name="qr" size={32} color={StaffColors.onDark} />
      <Text style={styles.permissionText}>Allow the camera to scan QR codes.</Text>
      <Pressable accessibilityRole="button" onPress={onAllow} style={styles.permissionBtn}>
        <Text style={styles.permissionBtnText}>{canAsk ? 'Allow camera' : 'Open settings'}</Text>
      </Pressable>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  active,
  disabled,
}: {
  icon: 'x' | 'bulb';
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.round, active && styles.roundActive, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <StaffIcon name={icon} size={20} color={active ? StaffColors.navy : StaffColors.onDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: StaffColors.scannerBg },
  layer: { flex: 1 },
  veil: { flex: 1, backgroundColor: StaffColors.scannerVeil },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: StaffSpace.side,
    paddingTop: 8,
    gap: 10,
  },
  headerTitle: { color: StaffColors.onDark, fontSize: 16, fontWeight: '700' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: StaffColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundActive: { backgroundColor: StaffColors.onDark },
  segment: { flexDirection: 'row', backgroundColor: StaffColors.glass, borderRadius: 999, padding: 4 },
  segmentItem: { height: 36, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: StaffColors.onDark },
  segmentText: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700' },
  segmentTextActive: { color: StaffColors.navy },

  intro: { alignItems: 'center', marginTop: 18, paddingHorizontal: StaffSpace.side },
  tripText: { color: StaffColors.onDarkMuted, fontSize: 13, fontWeight: '600' },
  instruction: { color: StaffColors.onDark, fontSize: 18, fontWeight: '800', marginTop: 4 },

  frameSlot: { alignItems: 'center', marginTop: 20, minHeight: FRAME },
  frame: { width: FRAME, height: FRAME, borderRadius: 24 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: StaffColors.onDark },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 24 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 24 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 24 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 24 },
  line: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: StaffColors.accent,
    shadowColor: StaffColors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  permission: {
    backgroundColor: StaffColors.glassSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  permissionText: { color: StaffColors.onDark, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  permissionBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtnText: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700' },
  helper: { color: StaffColors.onDarkMuted, fontSize: 13, textAlign: 'center', marginTop: 12 },
  scanError: {
    alignSelf: 'center',
    marginTop: 10,
    marginHorizontal: StaffSpace.side,
    backgroundColor: StaffColors.dangerTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanErrorText: { color: StaffColors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  bottomWrap: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: StaffColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: StaffSpace.side,
    paddingTop: 10,
    // Keeps the input above the floating tab bar.
    paddingBottom: 104,
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: StaffColors.field, marginBottom: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterText: { fontSize: 15, fontWeight: '800', color: StaffColors.navy },
  missingPill: { backgroundColor: StaffColors.warningTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  missingText: { color: StaffColors.warning, fontSize: 12, fontWeight: '700' },
  manualLabel: { fontSize: 13, color: StaffColors.muted, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: StaffColors.field,
    paddingHorizontal: 14,
    fontFamily: monoFont,
    fontSize: 16,
    color: StaffColors.navy,
    backgroundColor: StaffColors.surface,
  },
  goBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toastWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginHorizontal: StaffSpace.side,
    backgroundColor: StaffColors.successTint,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toastText: { color: StaffColors.success, fontSize: 13, fontWeight: '700', flexShrink: 1 },
});
