import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { Icon, SegmentedControl } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { useMyTrip, useBoardTicket } from '@/modules/staff/staff.queries';
import { useScanParcel } from '@/modules/parcels/parcels.queries';
import { ApiError } from '@/lib/api';
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

  const [mode, setMode] = useState<Mode>(isCourier ? 'parcels' : params.mode === 'tickets' ? 'tickets' : 'tickets');
  const [manualCode, setManualCode] = useState('');
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const locked = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  async function handleCode(raw: string) {
    const code = raw.trim().toUpperCase();
    if (!code || locked.current) return;
    locked.current = true;

    if (isCourier) {
      // Courier scan: jump straight to the delivery screen for that parcel.
      router.push({ pathname: '/(staff)/deliver/[id]', params: { id: code } });
      locked.current = false;
      return;
    }

    try {
      if (mode === 'tickets') {
        if (!trip.data) throw new Error('No trip on the road right now.');
        const data = await boardTicket.mutateAsync({ code, tripId: trip.data.tripId });
        setResult({ kind: 'ticket', data });
      } else {
        setScanId(code);
        if (!trip.data) throw new Error('No trip on the road right now.');
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
        <ActivityIndicator color={Colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Icon name="camera" size={32} color={Colors.white} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permText}>TransitPro needs the camera to scan ticket and parcel QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={result ? undefined : ({ data }) => handleCode(data)}
      />

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.roundBtn} onPress={() => router.back()}>
            <Icon name="x" size={18} color={Colors.white} />
          </TouchableOpacity>
          {!isCourier && (
            <View style={styles.segmentWrap}>
              <SegmentedControl options={[{ value: 'tickets', label: 'Tickets' }, { value: 'parcels', label: 'Parcels' }]} value={mode} onChange={(v) => { setMode(v); scanNext(); }} onDark />
            </View>
          )}
          <TouchableOpacity style={styles.roundBtn} onPress={() => setTorch((v) => !v)}>
            <Icon name="zap" size={18} color={torch ? Colors.orange : Colors.white} />
          </TouchableOpacity>
        </View>

        {!result && (
          <>
            <View style={styles.center} pointerEvents="none">
              <Text style={styles.tripMeta}>{trip.data ? `Trip ${trip.data.code} · ${trip.data.originCity} → ${trip.data.destinationCity}` : ''}</Text>
              <Text style={styles.scanTitle}>Scan the {mode === 'tickets' ? "passenger's ticket" : 'parcel label'}</Text>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.hint}>Hold steady · it scans by itself</Text>
            </View>

            <View style={styles.manualRow}>
              <Text style={styles.manualLabel}>{mode === 'tickets' ? 'QR damaged? Type the code' : 'Label damaged? Type the code'}</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder={mode === 'tickets' ? 'TK-58104' : 'TP-DLA-48230'}
                  placeholderTextColor={Colors.inkMuted}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.manualBtn} onPress={() => handleCode(manualCode)} disabled={!manualCode.trim()}>
                  <Icon name="arrowRight" size={18} color={Colors.white} />
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
          parcelsLoaded={trip.data?.parcelsLoaded}
          parcelsTotal={trip.data?.parcelsTotal}
          onScanNext={scanNext}
          onPassengerList={() => router.push({ pathname: '/(staff)/trip-passengers', params: { tripId: trip.data?.tripId } })}
        />
      )}
    </View>
  );
}

function ResultSheet({
  result,
  busPlate,
  parcelsLoaded,
  parcelsTotal,
  onScanNext,
  onPassengerList,
}: {
  result: Result;
  busPlate?: string;
  parcelsLoaded?: number;
  parcelsTotal?: number;
  onScanNext: () => void;
  onPassengerList: () => void;
}) {
  if (result.kind === 'error') {
    return (
      <View style={styles.sheet}>
        <View style={[styles.sheetIcon, { backgroundColor: Colors.dangerBg }]}>
          <Icon name="alert" size={22} color={Colors.error} />
        </View>
        <Text style={[styles.sheetTitle, { color: Colors.error }]}>{result.title}</Text>
        <Text style={styles.sheetText}>{result.message}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onScanNext}>
          <Text style={styles.primaryBtnText}>Scan next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (result.kind === 'ticket') {
    if (result.data.alreadyBoarded) {
      const t = result.data.ticket;
      return (
        <View style={styles.sheet}>
          <View style={[styles.sheetIcon, { backgroundColor: Colors.dangerBg }]}>
            <Icon name="alert" size={22} color={Colors.error} />
          </View>
          <Text style={[styles.sheetTitle, { color: Colors.error }]}>ALREADY BOARDED</Text>
          <Text style={styles.sheetSubtitle}>Do not let this person in yet</Text>
          <View style={styles.sheetBanner}>
            <Text style={styles.sheetBannerText}>
              This ticket was scanned at {new Date(result.data.alreadyBoarded.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} for {t.passengerName}, seat {t.seatNumber}. It may have been shared.
            </Text>
            <Text style={styles.sheetBannerMeta}>{t.code} · scanned by {result.data.alreadyBoarded.by}</Text>
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onPassengerList}>
              <Text style={styles.secondaryBtnText}>Passenger list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={onScanNext}>
              <Text style={styles.primaryBtnText}>Scan next</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    const t = result.data.ticket;
    return (
      <View style={styles.sheet}>
        <View style={[styles.sheetIcon, { backgroundColor: Colors.successLight }]}>
          <Icon name="check" size={22} color={Colors.success} />
        </View>
        <Text style={[styles.sheetTitle, { color: Colors.success }]}>VALID TICKET</Text>
        <Text style={styles.sheetSubtitle}>Paid with {t.payment.method.replace('_', ' ')}, for this bus</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Passenger</Text>
            <Text style={styles.infoValue}>{t.passengerName}</Text>
            <Text style={styles.infoMeta}>{t.code}</Text>
          </View>
          <View style={styles.seatBox}>
            <Text style={styles.seatLabel}>Seat</Text>
            <Text style={styles.seatValue}>{t.seatNumber}</Text>
            <Text style={styles.seatMeta}>{t.busClass === 'VIP' ? 'Window · VIP' : 'Classic'}</Text>
          </View>
        </View>
        <View style={styles.tripRow}>
          <MiniStat label="From" value={t.originCity} />
          <MiniStat label="To" value={t.destinationCity} />
          <MiniStat label="Departs" value={new Date(t.departureAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} />
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={onScanNext}>
          <Icon name="check" size={16} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Confirm boarding</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onScanNext} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={styles.cancelText}>Scan next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // parcel
  const p = result.data;
  return (
    <View style={styles.sheet}>
      <View style={styles.parcelHeaderRow}>
        <View style={styles.parcelIcon}>
          <Icon name="box" size={18} color={Colors.orangeDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle}>{p.trackingCode}</Text>
          <Text style={styles.sheetSubtitle}>
            {p.from.city} Akwa → {p.to.city} · {p.homeDelivery ? 'home delivery' : 'counter pickup'}
          </Text>
        </View>
      </View>
      <View style={styles.tripRow}>
        <MiniStat label="Weight" value={`${p.weightKg} kg`} />
        <MiniStat label="Seal" value={p.security.sealNumber} />
        <MiniStat label="Fee" value="Paid" />
      </View>
      <View style={styles.checklistBox}>
        <CheckLine text={`Destination matches this bus goes to ${p.to.city}`} />
        <CheckLine text="Fee paid" />
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onScanNext}>
        <Text style={styles.primaryBtnText}>
          Load on bus {busPlate ?? ''} · {parcelsLoaded ?? '—'}/{parcelsTotal ?? '—'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onScanNext} style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Text style={styles.cancelText}>Scan another parcel</Text>
      </TouchableOpacity>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function CheckLine({ text }: { text: string }) {
  return (
    <View style={styles.checkLine}>
      <Icon name="check" size={14} color={Colors.success} />
      <Text style={styles.checkLineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.navy },
  permWrap: { flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  permTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.white, marginTop: 8 },
  permText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  permBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  permBtnText: { color: Colors.white, fontWeight: FontWeight.bold, fontSize: FontSize.base },

  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  segmentWrap: { flex: 1, maxWidth: 220 },

  center: { alignItems: 'center', gap: 8, paddingHorizontal: 24 },
  tripMeta: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  scanTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: 8 },
  frame: { width: 230, height: 230 },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: Colors.white, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 14 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 14 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 14 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm, marginTop: 12 },

  manualRow: { backgroundColor: 'rgba(0,0,0,0.35)', padding: 16, paddingBottom: 28, gap: 8 },
  manualLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  manualInputRow: { flexDirection: 'row', gap: 10 },
  manualInput: { flex: 1, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', color: Colors.white, paddingHorizontal: 14, fontSize: FontSize.base },
  manualBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },

  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 36, gap: 10 },
  sheetIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink, letterSpacing: 0.3 },
  sheetSubtitle: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  sheetText: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  sheetBanner: { backgroundColor: Colors.dangerBg, borderRadius: 14, padding: 12, gap: 4 },
  sheetBannerText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: FontWeight.medium, lineHeight: 19 },
  sheetBannerMeta: { fontSize: FontSize.xs, color: Colors.error, opacity: 0.8 },

  infoRow: { flexDirection: 'row', gap: 10 },
  infoBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 12, gap: 2 },
  infoLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  infoValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  infoMeta: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  seatBox: { width: 78, backgroundColor: Colors.primary, borderRadius: 14, padding: 12, alignItems: 'center' },
  seatLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)' },
  seatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.white },
  seatMeta: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  tripRow: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 10, gap: 2 },
  miniStatLabel: { fontSize: FontSize.xs, color: Colors.inkSecondary },
  miniStatValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.ink },

  parcelHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  parcelIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: Colors.orangeLight, alignItems: 'center', justifyContent: 'center' },

  checklistBox: { gap: 6 },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLineText: { fontSize: FontSize.sm, color: Colors.ink, flex: 1 },

  btnRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, backgroundColor: Colors.primary, marginTop: 4 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  secondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border },
  secondaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  cancelText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.inkSecondary },
});
