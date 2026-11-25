import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { useBoardTicket, useMyTrip } from '@/modules/staff/staff.queries';
import { useScanParcel } from '@/modules/parcels/parcels.queries';
import { ApiError } from '@/lib/api';
import { timeHM } from '@/lib/format';
import { MONO, S } from '@/theme/staff';
import { CheckBadge, InfoTile, OutlineButton, PAY_LABEL, PrimaryButton, feePaidWith } from '@/modules/staff/StaffUI';
import type { BoardResult, ParcelDetail } from '@contracts/api-types';

type Mode = 'tickets' | 'parcels';
type Result =
  | { kind: 'ticket'; data: BoardResult }
  | { kind: 'parcel'; data: ParcelDetail }
  | { kind: 'error'; title: string; message: string };

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { data: me } = useMe();
  const isCourier = me?.role === 'COURIER';
  const trip = useMyTrip(!isCourier);
  const boardTicket = useBoardTicket();
  // Parcel scans go through a placeholder id until we know the real one (set on scan).
  const [scanId, setScanId] = useState('');
  const scanParcel = useScanParcel(scanId);

  const [mode, setMode] = useState<Mode>(isCourier ? 'parcels' : params.mode === 'parcels' ? 'parcels' : 'tickets');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const locked = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  async function handleCode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code || locked.current) return;
    locked.current = true;

    if (isCourier) {
      // Courier scan: jump straight to the delivery screen for that parcel.
      router.push({ pathname: '/(staff)/deliver/[id]', params: { id: code } } as never);
      locked.current = false;
      return;
    }

    try {
      if (!trip.data) throw new Error('No trip on the road right now.');
      if (mode === 'tickets') {
        const data = await boardTicket.mutateAsync({ code, tripId: trip.data.tripId });
        setResult({ kind: 'ticket', data });
      } else {
        setScanId(code);
        const data = await scanParcel.mutateAsync({ type: 'LOADED', tripId: trip.data.tripId });
        setResult({ kind: 'parcel', data });
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not read this code.';
      setResult({ kind: 'error', title: mode === 'tickets' ? 'Not a valid ticket' : 'Could not load this parcel', message });
    }
  }

  function scanNext() {
    setResult(null);
    setManualCode('');
    locked.current = false;
  }

  if (!permission) {
    return (
      <View style={styles.permWrap}>
        <ActivityIndicator color={S.onBlue} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Icon name="camera" size={32} color={S.onBlue} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>TransitPro needs the camera to scan ticket and parcel QR codes.</Text>
        <PrimaryButton title="Allow camera" onPress={requestPermission} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : ({ data }) => handleCode(data)}
      />
      {/* Dark veil like the mockup, the frame stays readable on any background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,15,12,0.55)' }]} pointerEvents="none" />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.navigate('/(staff)/(tabs)' as never))}
            activeOpacity={0.8}
          >
            <Icon name="x" size={18} color={S.onBlue} strokeWidth={2.2} />
          </TouchableOpacity>
          {!isCourier && (
            <View style={styles.segment}>
              {(['tickets', 'parcels'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.segBtn, mode === m && styles.segBtnOn]}
                  onPress={() => {
                    setMode(m);
                    scanNext();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'tickets' ? 'Tickets' : 'Parcels'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {!result && (
          <>
            <View style={styles.center} pointerEvents="none">
              {trip.data && !isCourier && (
                <Text style={styles.tripMeta}>
                  Trip {trip.data.code} · {trip.data.originCity} → {trip.data.destinationCity}
                </Text>
              )}
              <Text style={styles.scanTitle}>Scan the {mode === 'tickets' ? "passenger's ticket" : 'parcel label'}</Text>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cTL]} />
                <View style={[styles.corner, styles.cTR]} />
                <View style={[styles.corner, styles.cBL]} />
                <View style={[styles.corner, styles.cBR]} />
              </View>
              <Text style={styles.hint}>Hold steady · it scans by itself</Text>
            </View>

            <View style={styles.manual}>
              <Text style={styles.manualLabel}>{mode === 'tickets' ? 'QR damaged? Type the code' : 'Label damaged? Type the code'}</Text>
              <View style={styles.manualRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder={mode === 'tickets' ? 'TK-58104' : 'TP-DLA-48230'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.manualBtn} onPress={() => handleCode(manualCode)} disabled={!manualCode.trim()}>
                  <Icon name="arrowRight" size={18} color={S.onBlue} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>

      {result && (
        <ResultSheet
          result={result}
          busPlate={trip.data?.busPlate}
          destination={trip.data?.destinationCity}
          parcelsLoaded={trip.data?.parcelsLoaded}
          parcelsTotal={trip.data?.parcelsTotal}
          onScanNext={scanNext}
          onPassengerList={() => router.push({ pathname: '/(staff)/trip-passengers', params: { tripId: trip.data?.tripId } } as never)}
        />
      )}
    </View>
  );
}

function ResultSheet({
  result,
  busPlate,
  destination,
  parcelsLoaded,
  parcelsTotal,
  onScanNext,
  onPassengerList,
}: {
  result: Result;
  busPlate?: string;
  destination?: string;
  parcelsLoaded?: number;
  parcelsTotal?: number;
  onScanNext: () => void;
  onPassengerList: () => void;
}) {
  if (result.kind === 'error') {
    return (
      <Sheet>
        <View style={[styles.sheetIcon, { backgroundColor: S.redSoft }]}>
          <Icon name="alert" size={22} color={S.red} />
        </View>
        <Text style={[styles.sheetTitle, { color: S.red }]}>{result.title}</Text>
        <Text style={styles.sheetSub}>{result.message}</Text>
        <PrimaryButton title="Scan next" onPress={onScanNext} style={{ marginTop: 6 }} />
      </Sheet>
    );
  }

  if (result.kind === 'ticket') {
    const t = result.data.ticket;
    if (result.data.alreadyBoarded) {
      return (
        <Sheet>
          <View style={[styles.sheetIcon, { backgroundColor: S.redSoft }]}>
            <Icon name="alert" size={22} color={S.red} />
          </View>
          <Text style={[styles.sheetTitle, { color: S.red }]}>Already boarded</Text>
          <Text style={styles.sheetSub}>Do not let this person in yet</Text>
          <View style={styles.redBox}>
            <Text style={styles.redBoxText}>
              This ticket was scanned at {timeHM(result.data.alreadyBoarded.at)} for {t.passengerName}, seat {t.seatNumber}. It may have been shared.
            </Text>
            <Text style={styles.redBoxMeta}>
              {t.code} · scanned by {result.data.alreadyBoarded.by}
            </Text>
          </View>
          <View style={styles.btnRow}>
            <OutlineButton title="Passenger list" onPress={onPassengerList} style={{ flex: 1 }} />
            <PrimaryButton title="Scan next" onPress={onScanNext} style={{ flex: 1 }} />
          </View>
        </Sheet>
      );
    }
    return (
      <Sheet>
        <View style={styles.headRow}>
          <View style={[styles.boxIcon, { backgroundColor: S.greenSoft }]}>
            <Icon name="ticket" size={22} color={S.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{t.passengerName}</Text>
            <Text style={styles.sheetSub}>
              {t.code} · paid with {PAY_LABEL[t.payment.method] ?? t.payment.method}
            </Text>
          </View>
        </View>
        <View style={styles.tiles}>
          <InfoTile label="Seat" value={String(t.seatNumber)} />
          <InfoTile label="Class" value={t.busClass === 'VIP' ? 'VIP' : 'Classic'} />
          <InfoTile label="Departs" value={timeHM(t.departureAt)} />
        </View>
        <View style={styles.checks}>
          <CheckRow strong="Valid ticket" rest={`${t.originCity} → ${t.destinationCity}`} />
          <CheckRow strong="Paid" rest={PAY_LABEL[t.payment.method] ?? ''} />
          <CheckRow tone="warn" strong="Check the CNI" rest={`name ${t.passengerName}`} />
        </View>
        <PrimaryButton title="Boarded · scan next" icon="check" onPress={onScanNext} />
        <OutlineButton title="Passenger list" onPress={onPassengerList} />
      </Sheet>
    );
  }

  // parcel
  const p = result.data;
  const destOk = !destination || destination === p.to.city;
  return (
    <Sheet>
      <View style={styles.headRow}>
        <View style={styles.boxIcon}>
          <Icon name="box" size={22} color={S.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{p.trackingCode}</Text>
          <Text style={styles.sheetSub}>
            {p.from.city} {p.from.branch} → {p.to.city} · {p.homeDelivery ? 'home delivery' : 'counter pickup'}
          </Text>
        </View>
      </View>
      <View style={styles.tiles}>
        <InfoTile label="Weight" value={`${p.weightKg} kg`} />
        <InfoTile label="Seal" value={p.security.sealNumber} />
        <InfoTile label="Fee" value={p.payments.some((x) => x.purpose === 'PARCEL_FEE' && x.status === 'PENDING') ? 'Pending' : 'Paid'} />
      </View>
      <View style={styles.checks}>
        <CheckRow tone={destOk ? 'ok' : 'warn'} strong={destOk ? 'Destination matches' : 'Wrong bus'} rest={`this bus goes to ${destination ?? p.to.city}`} />
        <CheckRow strong="Fee paid" rest={feePaidWith(p).replace(/^with /, '')} />
        <CheckRow tone="warn" strong="Check the seal" rest={`number ${p.security.sealNumber}, not broken`} />
      </View>
      <PrimaryButton
        title={`Load on bus ${busPlate ?? ''} · ${parcelsLoaded ?? '—'} / ${parcelsTotal ?? '—'}`}
        disabled={!destOk}
        onPress={onScanNext}
      />
      <OutlineButton title="Scan another parcel" onPress={onScanNext} />
    </Sheet>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

function CheckRow({ strong, rest, tone = 'ok' }: { strong: string; rest: string; tone?: 'ok' | 'warn' }) {
  return (
    <View style={styles.checkRow}>
      <CheckBadge size={22} tone={tone} />
      <Text style={styles.checkText}>
        <Text style={styles.checkStrong}>{strong}</Text> {rest}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#1C1A16' },
  permWrap: { flex: 1, backgroundColor: '#1C1A16', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  permTitle: { fontSize: 20, fontWeight: '800', color: S.onBlue, marginTop: 8 },
  permText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 10 },
  closeBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  segment: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: S.card },
  segText: { fontSize: 14, fontWeight: '800', color: S.onBlue },
  segTextOn: { color: S.ink },

  center: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  tripMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600' },
  scanTitle: { color: S.onBlue, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  frame: { width: 230, height: 230 },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: S.onBlue, borderWidth: 4 },
  cTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  cTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  cBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  cBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 12 },

  manual: { padding: 16, paddingBottom: 36, gap: 8 },
  manualLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  manualRow: { flexDirection: 'row', gap: 10 },
  manualInput: { flex: 1, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', color: S.onBlue, paddingHorizontal: 14, fontSize: 15, fontFamily: MONO },
  manualBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: S.blue, alignItems: 'center', justifyContent: 'center' },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: S.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: S.border, marginBottom: 4 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boxIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: S.cream, alignItems: 'center', justifyContent: 'center' },
  code: { fontFamily: MONO, fontSize: 20, fontWeight: '800', color: S.ink },
  sheetIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: S.ink },
  sheetSub: { fontSize: 13, color: S.ink2, marginTop: 1 },
  tiles: { flexDirection: 'row', gap: 8 },
  checks: { gap: 9 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { flex: 1, fontSize: 14, color: S.ink2 },
  checkStrong: { fontWeight: '800', color: S.ink },
  redBox: { backgroundColor: S.redSoft, borderRadius: 14, padding: 12, gap: 4 },
  redBoxText: { fontSize: 14, color: S.red, fontWeight: '600', lineHeight: 19 },
  redBoxMeta: { fontFamily: MONO, fontSize: 12, color: S.red, opacity: 0.8 },
  btnRow: { flexDirection: 'row', gap: 10 },
});
