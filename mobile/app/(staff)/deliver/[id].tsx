import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeInput, Icon } from '@/components/ui';
import { useCodPayment, useCourierStats, useCourierStops, useDeliverParcel, useParcel, useRefuseParcel } from '@/modules/parcels/parcels.queries';
import { uploadPhoto } from '@/lib/uploads';
import { timeHM } from '@/lib/format';
import { ApiError } from '@/lib/api';
import { S, amount, shadow } from '@/theme/staff';
import { CheckBadge, DangerButton, Initials, OutlineButton, Pill, PrimaryButton, TextLink, TimeChip, feePaidWith } from '@/modules/staff/StaffUI';

// "Step" (not "View") so it does not shadow React Native's View component.
type Step = 'detail' | 'camera' | 'refuse' | 'delivered';
const REFUSE_REASONS = ['Seal broken or different', 'Contents not as declared', 'Damaged', 'Not my parcel', 'Other'];
const TODAY = '/(staff)/(tabs)' as never;

export default function DeliverScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const parcel = useParcel(id ?? '');
  const deliver = useDeliverParcel(id ?? '');
  const refuse = useRefuseParcel(id ?? '');
  const codPayment = useCodPayment(id ?? '');
  const stops = useCourierStops();
  const stats = useCourierStats();
  const stop = stops.data?.find((s) => s.parcel.trackingCode === id);
  const nextStop = stops.data?.find((s) => s.parcel.trackingCode !== id);

  const [step, setStep] = useState<Step>('detail');
  const [cameraFor, setCameraFor] = useState<'handover' | 'seal'>('handover');
  const [gpsDone, setGpsDone] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoAt, setPhotoAt] = useState<string | null>(null);
  const [sealPhotoUrl, setSealPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState('');
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(REFUSE_REASONS[0]!);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function confirmGps() {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission is needed to confirm you are at the address.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsDone({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read your location.');
    } finally {
      setGpsBusy(false);
    }
  }

  function startPhoto(forWhat: 'handover' | 'seal') {
    setCameraFor(forWhat);
    setStep('camera');
  }

  async function onCaptured(uri: string) {
    setUploading(true);
    try {
      const { url } = await uploadPhoto(uri);
      if (cameraFor === 'handover') {
        setPhotoUrl(url);
        setPhotoAt(new Date().toISOString());
      } else setSealPhotoUrl(url);
    } catch {
      setError('Could not upload the photo. Check your connection and try again.');
    } finally {
      setUploading(false);
      setStep(cameraFor === 'seal' ? 'refuse' : 'detail');
    }
  }

  function collectCod() {
    if (!parcel.data?.codAmount) return;
    codPayment.mutate({ method: 'CASH' });
  }

  async function confirmDelivery() {
    if (!id || code.length !== 4 || !gpsDone) return;
    setError(null);
    try {
      await deliver.mutateAsync({ otp: code, photoUrl: photoUrl ?? undefined, lat: gpsDone.lat, lng: gpsDone.lng });
      setDeliveredAt(new Date().toISOString());
      setStep('delivered');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code is not right. Ask the receiver to check their SMS.');
    }
  }

  async function confirmRefusal() {
    if (!reason) return;
    const full = details.trim() ? `${reason} — ${details.trim()}` : reason;
    try {
      await refuse.mutateAsync({ reason: full });
      router.replace(TODAY);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record the refusal.');
    }
  }

  if (!parcel.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={S.blue} />
      </View>
    );
  }
  const p = parcel.data;
  const firstName = p.receiver.name.split(' ')[0];
  const paidWhere = feePaidWith(p); // "with MTN MoMo in Douala"

  if (step === 'camera') {
    return <PhotoCamera onCaptured={onCaptured} onCancel={() => setStep(cameraFor === 'seal' ? 'refuse' : 'detail')} uploading={uploading} />;
  }

  // ── Delivered ────────────────────────────────────────────────────────────────
  if (step === 'delivered') {
    const doneCount = stats.data ? `${stats.data.deliveredToday + 1} / ${stats.data.stopsToday} today` : null;
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.hero} edges={['top']}>
          <View style={[styles.ring, { width: 340, height: 340, borderRadius: 170, top: -150 }]} />
          <View style={[styles.ring, { width: 230, height: 230, borderRadius: 115, top: -95 }]} />
          <View style={styles.heroCheckOuter}>
            <View style={styles.heroCheck}>
              <Icon name="check" size={34} color={S.green} strokeWidth={3} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Delivered</Text>
          <Text style={styles.heroMeta}>
            {p.trackingCode} handed to <Text style={{ fontWeight: '800', color: S.onBlue }}>{p.receiver.name}</Text>
            {deliveredAt ? ` at ${timeHM(deliveredAt)}` : ''}
          </Text>
          <View style={styles.heroPills}>
            {doneCount && <Pill label={doneCount} bg={S.glass} color={S.onBlue} />}
            <Pill label="Sender notified" bg={S.orange} color={S.ink} />
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>Proof saved with the parcel</Text>
            <ProofLine strong="Receiver code" rest="correct on the first try" />
            {photoAt && <ProofLine strong="Handover photo" rest={timeHM(photoAt)} />}
            <ProofLine strong="At the address" rest="GPS confirmed" />
            <ProofLine strong={p.codAmount ? `Collected ${amount(p.codAmount)}` : 'Nothing to collect'} rest={p.codAmount ? 'in cash' : `paid in ${p.from.city}`} />
          </View>

          {nextStop && (
            <View style={[styles.card, styles.nextRow, shadow]}>
              <TimeChip time={timeHM(nextStop.etaAt)} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nextLabel}>Next</Text>
                <Text style={styles.nextTitle}>{nextStop.parcel.to.branch}</Text>
                <Text style={styles.nextSub}>
                  {nextStop.parcel.receiverName}
                  {nextStop.distanceKm != null ? ` · ${nextStop.distanceKm}km` : ''}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton title="Next delivery" iconRight="arrowRight" onPress={() => router.replace(TODAY)} />
          <TextLink title="Back to today" onPress={() => router.replace(TODAY)} />
        </View>
      </View>
    );
  }

  // ── Refuse ───────────────────────────────────────────────────────────────────
  if (step === 'refuse') {
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.plainHeader} edges={['top']}>
          <TouchableOpacity style={styles.squareBack} onPress={() => setStep('detail')}>
            <Icon name="chevronLeft" size={20} color={S.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.plainTitle}>The receiver refuses</Text>
            <Text style={styles.plainMeta}>
              {p.trackingCode} · {p.receiver.name}
            </Text>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, shadow]}>
            <Text style={styles.cardTitle}>What is wrong?</Text>
            <View style={styles.chipsWrap}>
              {REFUSE_REASONS.map((r) => {
                const on = reason === r;
                return (
                  <TouchableOpacity key={r} style={[styles.reasonChip, on && styles.reasonChipOn]} onPress={() => setReason(r)} activeOpacity={0.8}>
                    <Text style={[styles.reasonText, on && styles.reasonTextOn]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>Details (for the branch manager)</Text>
            <TextInput
              style={styles.textarea}
              value={details}
              onChangeText={setDetails}
              placeholder={`The seal number is different from ${p.security.sealNumber}…`}
              placeholderTextColor={S.ink3}
              multiline
            />
          </View>

          <TouchableOpacity style={[styles.card, styles.photoRow, shadow]} activeOpacity={0.85} onPress={() => startPhoto('seal')}>
            <View style={[styles.photoBox, sealPhotoUrl && { borderStyle: 'solid', borderColor: S.green, backgroundColor: S.greenSoft }]}>
              <Icon name={sealPhotoUrl ? 'check' : 'camera'} size={20} color={sealPhotoUrl ? S.green : S.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Photo of the seal</Text>
              <Text style={styles.cardSub}>Required: it protects you and the agency</Text>
            </View>
            <Pill label={sealPhotoUrl ? 'Retake' : 'Take'} bg={S.blueSoft} color={S.blue} style={{ alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8 }} textStyle={{ fontSize: 13 }} />
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What happens next</Text>
            <Text style={styles.infoText}>
              A claim is opened for the branch manager. You keep the parcel and bring it back to the {p.to.branch} branch. Any cash on delivery goes back to the receiver.
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <DangerButton title="Confirm the refusal" disabled={!reason || !sealPhotoUrl} loading={refuse.isPending} onPress={confirmRefusal} />
          <TextLink title="Go back, the receiver accepts" onPress={() => setStep('detail')} />
        </View>
      </View>
    );
  }

  // ── Detail ───────────────────────────────────────────────────────────────────
  const codDone = !p.codAmount || codPayment.isSuccess;
  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.glassPill} onPress={() => router.back()} activeOpacity={0.8}>
            <Icon name="chevronLeft" size={15} color={S.onBlue} strokeWidth={2.4} />
            <Text style={styles.glassPillText}>Today</Text>
          </TouchableOpacity>
          {stop && (
            <View style={[styles.glassPill, { paddingVertical: 5 }]}>
              <Text style={styles.glassPillText}>
                {stop.stopIndex} of {stop.stopsTotal} today
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.headerTitle}>Deliver {p.trackingCode}</Text>
        <Text style={styles.headerMeta}>Scanned and matched · seal {p.security.sealNumber}</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, styles.receiverRow, shadow]}>
          <Initials name={p.receiver.name} size={46} tone="blue" />
          <View style={{ flex: 1 }}>
            <Text style={styles.receiverName}>{p.receiver.name}</Text>
            <Text style={styles.receiverAddr} numberOfLines={1}>
              {p.deliveryAddress ? p.deliveryAddress.replace(/, ([^,]+)$/, ' · $1') : `${p.to.branch} · ${p.to.city}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${p.receiver.phone}`)}>
            <Icon name="phone" size={19} color={S.green} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>Proof of delivery</Text>
          <ProofRow
            done={!!gpsDone}
            title="At the delivery address"
            sub={gpsDone ? `GPS confirmed near ${firstName}'s address` : gpsBusy ? 'Checking your position…' : 'Tap to confirm with GPS'}
            onPress={gpsDone || gpsBusy ? undefined : confirmGps}
            busy={gpsBusy}
          />
          <ProofRow
            done={!!photoUrl}
            title={photoUrl ? 'Handover photo taken' : 'Handover photo'}
            sub={photoAt ? `${timeHM(photoAt)} · stored with the parcel` : 'Tap to take a photo'}
            onPress={() => startPhoto('handover')}
          />
          <ProofRow
            done={codDone}
            title={p.codAmount ? `Collect ${amount(p.codAmount)} FCFA` : 'Nothing to collect'}
            sub={p.codAmount ? (codPayment.isSuccess ? 'Collected in cash' : 'Tap once you have the cash') : `Already paid ${paidWhere}`}
            onPress={codDone ? undefined : collectCod}
            busy={codPayment.isPending}
          />
        </View>

        <View style={[styles.card, shadow]}>
          <Text style={styles.cardTitle}>Receiver's code</Text>
          <Text style={styles.cardSub}>Ask {firstName} for the 4-digit code from his SMS once he has checked the parcel.</Text>
          <View style={{ marginTop: 6 }}>
            <CodeInput value={code} onChange={setCode} />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={code.length === 4 ? 'Confirm delivery' : 'Confirm delivery (enter the code)'}
          disabled={code.length !== 4 || !gpsDone}
          loading={deliver.isPending}
          onPress={confirmDelivery}
        />
        <OutlineButton title="Receiver refused the parcel" tone="red" onPress={() => setStep('refuse')} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

function ProofRow({ done, title, sub, onPress, busy }: { done: boolean; title: string; sub: string; onPress?: () => void; busy?: boolean }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={styles.proofRow} {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}>
      <CheckBadge size={26} tone={done ? 'ok' : 'todo'} />
      <View style={{ flex: 1 }}>
        <Text style={styles.proofTitle}>{title}</Text>
        <Text style={styles.proofSub}>{sub}</Text>
      </View>
      {busy && <ActivityIndicator size="small" color={S.blue} />}
    </Wrap>
  );
}

function ProofLine({ strong, rest }: { strong: string; rest: string }) {
  return (
    <View style={styles.proofLine}>
      <Icon name="check" size={16} color={S.green} strokeWidth={2.6} />
      <Text style={styles.proofLineText}>
        <Text style={{ fontWeight: '800', color: S.ink }}>{strong}</Text> {rest}
      </Text>
    </View>
  );
}

function PhotoCamera({ onCaptured, onCancel, uploading }: { onCaptured: (uri: string) => void; onCancel: () => void; uploading: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const ref = React.useRef<CameraView>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.permWrap}>
        <Icon name="camera" size={30} color={S.onBlue} />
        <Text style={styles.permText}>Camera access is needed for the photo.</Text>
        <PrimaryButton title="Allow camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
        <TextLink title="Cancel" color={S.onBlue2} onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.cameraTop} edges={['top']}>
        <TouchableOpacity style={styles.camRound} onPress={onCancel}>
          <Icon name="x" size={18} color={S.onBlue} />
        </TouchableOpacity>
      </SafeAreaView>
      <View style={styles.cameraBottom}>
        {uploading ? (
          <ActivityIndicator color={S.onBlue} />
        ) : (
          <TouchableOpacity
            style={styles.shutter}
            onPress={async () => {
              const photo = await ref.current?.takePictureAsync({ quality: 0.6 });
              if (photo?.uri) onCaptured(photo.uri);
            }}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: S.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: S.bg },
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, backgroundColor: S.bg },

  // Detail header
  header: { backgroundColor: S.blue, paddingHorizontal: 18, paddingBottom: 20, gap: 4 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginBottom: 10 },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: S.glass, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  glassPillText: { fontSize: 13, fontWeight: '800', color: S.onBlue },
  headerTitle: { fontSize: 25, fontWeight: '800', color: S.onBlue, letterSpacing: -0.4 },
  headerMeta: { fontSize: 14, color: S.onBlue2 },

  card: { backgroundColor: S.card, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: S.ink },
  cardSub: { fontSize: 13, color: S.ink2, lineHeight: 18 },

  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiverName: { fontSize: 16, fontWeight: '800', color: S.ink },
  receiverAddr: { fontSize: 13, color: S.ink2, marginTop: 2 },
  callBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: S.greenSoft, alignItems: 'center', justifyContent: 'center' },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 3 },
  proofTitle: { fontSize: 15, fontWeight: '800', color: S.ink },
  proofSub: { fontSize: 12.5, color: S.ink2, marginTop: 1 },

  errorText: { fontSize: 13, color: S.red, textAlign: 'center' },

  // Delivered
  hero: { backgroundColor: S.blue, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  ring: { position: 'absolute', alignSelf: 'center', borderWidth: 18, borderColor: 'rgba(255,255,255,0.06)' },
  heroCheckOuter: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  heroCheck: { width: 84, height: 84, borderRadius: 42, backgroundColor: S.card, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 30, fontWeight: '800', color: S.onBlue, marginTop: 14, letterSpacing: -0.5 },
  heroMeta: { fontSize: 14, color: S.onBlue2, textAlign: 'center', marginTop: 6 },
  heroPills: { flexDirection: 'row', gap: 8, marginTop: 12 },
  proofLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  proofLineText: { flex: 1, fontSize: 14, color: S.ink2 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextLabel: { fontSize: 12, color: S.ink2 },
  nextTitle: { fontSize: 16, fontWeight: '800', color: S.ink },
  nextSub: { fontSize: 13, color: S.ink2, marginTop: 1 },

  // Refuse
  plainHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  squareBack: { width: 42, height: 42, borderRadius: 13, backgroundColor: S.card, alignItems: 'center', justifyContent: 'center' },
  plainTitle: { fontSize: 20, fontWeight: '800', color: S.ink, letterSpacing: -0.3 },
  plainMeta: { fontSize: 13, color: S.ink2, marginTop: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { borderWidth: 1.5, borderColor: S.border, backgroundColor: S.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  reasonChipOn: { borderColor: S.red, backgroundColor: S.redSoft },
  reasonText: { fontSize: 14, fontWeight: '600', color: S.ink },
  reasonTextOn: { color: S.red, fontWeight: '800' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: S.ink2, marginTop: 4 },
  textarea: { minHeight: 70, borderWidth: 1.5, borderColor: S.border, borderRadius: 14, padding: 12, fontSize: 14, fontWeight: '700', color: S.ink, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoBox: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: S.ink3, backgroundColor: S.tile, alignItems: 'center', justifyContent: 'center' },
  infoBox: { backgroundColor: S.blueSoft, borderRadius: 16, padding: 14, gap: 5 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: S.blue },
  infoText: { fontSize: 13, color: '#475569', lineHeight: 19 },

  // Camera
  permWrap: { flex: 1, backgroundColor: S.ink, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  permText: { color: S.onBlue, fontSize: 15, textAlign: 'center' },
  cameraTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16 },
  camRound: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cameraBottom: { position: 'absolute', bottom: 44, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 5, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: S.card },
});
