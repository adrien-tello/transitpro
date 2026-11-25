import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight } from '@/theme';
import { CodeInput, Icon, PersonAvatar } from '@/components/ui';
import { useCodPayment, useCourierStops, useDeliverParcel, useParcel, useRefuseParcel } from '@/modules/parcels/parcels.queries';
import { uploadPhoto } from '@/lib/uploads';
import { fcfa } from '@/lib/format';
import { ApiError } from '@/lib/api';

type View = 'detail' | 'camera' | 'refuse' | 'delivered';
const REFUSE_REASONS = ['Seal broken or different', 'Contents not as declared', 'Damaged', 'Not my parcel', 'Other'];

export default function DeliverScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const parcel = useParcel(id ?? '');
  const deliver = useDeliverParcel(id ?? '');
  const refuse = useRefuseParcel(id ?? '');
  const codPayment = useCodPayment(id ?? '');
  const stops = useCourierStops();
  const stop = stops.data?.find((s) => s.parcel.trackingCode === id);

  const [view, setView] = useState<View>('detail');
  const [cameraFor, setCameraFor] = useState<'handover' | 'seal'>('handover');
  const [gpsDone, setGpsDone] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sealPhotoUrl, setSealPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState('');
  const [reason, setReason] = useState<string | null>(null);
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
    setView('camera');
  }

  async function onCaptured(uri: string) {
    setUploading(true);
    try {
      const { url } = await uploadPhoto(uri);
      if (cameraFor === 'handover') setPhotoUrl(url);
      else setSealPhotoUrl(url);
    } catch {
      setError('Could not upload the photo. Check your connection and try again.');
    } finally {
      setUploading(false);
      setView(cameraFor === 'seal' ? 'refuse' : 'detail');
    }
  }

  async function collectCod() {
    if (!parcel.data?.codAmount) return;
    codPayment.mutate({ method: 'CASH' });
  }

  async function confirmDelivery() {
    if (!id || code.length !== 4 || !gpsDone) return;
    setError(null);
    try {
      await deliver.mutateAsync({ otp: code, photoUrl: photoUrl ?? undefined, lat: gpsDone.lat, lng: gpsDone.lng });
      setView('delivered');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code is not right. Ask the receiver to check their SMS.');
    }
  }

  async function confirmRefusal() {
    if (!reason) return;
    const full = details.trim() ? `${reason} — ${details.trim()}` : reason;
    try {
      await refuse.mutateAsync({ reason: full });
      router.replace('/(staff)/(tabs)/');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not record the refusal.');
    }
  }

  if (!parcel.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }
  const p = parcel.data;

  if (view === 'camera') {
    return <PhotoCamera onCaptured={onCaptured} onCancel={() => setView(cameraFor === 'seal' ? 'refuse' : 'detail')} uploading={uploading} />;
  }

  if (view === 'delivered') {
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.deliveredHero} edges={['top']}>
          <View style={styles.checkCircleOuter}>
            <View style={styles.checkCircleInner}>
              <Icon name="check" size={30} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.deliveredTitle}>Delivered</Text>
          <Text style={styles.deliveredMeta}>
            {p.trackingCode} handed to <Text style={{ fontWeight: FontWeight.bold }}>{p.receiver.name}</Text>
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.pillLight}>
              <Text style={styles.pillLightText}>Sender notified</Text>
            </View>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Proof saved with the parcel</Text>
            <ProofLine text="Receiver code correct on the first try" />
            {photoUrl && <ProofLine text="Handover photo" />}
            <ProofLine text="At the address" sub="GPS confirmed" />
            <ProofLine text={p.codAmount ? 'Cash collected' : 'Nothing to collect'} sub={p.codAmount ? undefined : 'Paid in Douala'} />
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(staff)/(tabs)/')} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Next delivery</Text>
            <Icon name="arrowRight" size={16} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(staff)/(tabs)/')} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={styles.linkText}>Back to today</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (view === 'refuse') {
    return (
      <View style={styles.flex}>
        <SafeAreaView style={styles.plainHeader} edges={['top']}>
          <TouchableOpacity style={styles.roundBtnDark} onPress={() => setView('detail')}>
            <Icon name="chevronLeft" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <View>
            <Text style={styles.plainHeaderTitle}>The receiver refuses</Text>
            <Text style={styles.plainHeaderMeta}>
              {p.trackingCode} · {p.receiver.name}
            </Text>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>What is wrong?</Text>
          <View style={styles.chipsWrap}>
            {REFUSE_REASONS.map((r) => (
              <TouchableOpacity key={r} style={[styles.reasonChip, reason === r && styles.reasonChipActive]} onPress={() => setReason(r)}>
                <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Details (for the branch manager)</Text>
          <TextInput
            style={styles.textarea}
            value={details}
            onChangeText={setDetails}
            placeholder="Describe what is different from the label…"
            placeholderTextColor={Colors.inkMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => startPhoto('seal')}>
            <View style={styles.photoRow}>
              <View style={styles.photoIconBox}>{sealPhotoUrl ? <Icon name="check" size={18} color={Colors.success} /> : <Icon name="camera" size={18} color={Colors.inkSecondary} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Photo of the seal</Text>
                <Text style={styles.cardSub}>Required: it protects you and the agency</Text>
              </View>
              <View style={styles.takeBtn}>
                <Text style={styles.takeBtnText}>{sealPhotoUrl ? 'Retake' : 'Take'}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>What happens next</Text>
            <Text style={styles.infoBoxText}>
              A claim is opened for the branch manager. You keep the parcel and bring it back to the {p.to.branch} branch. Any cash on delivery goes back to the receiver.
            </Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.dangerBtn, (!reason || !sealPhotoUrl || refuse.isPending) && styles.btnDisabled]}
            disabled={!reason || !sealPhotoUrl || refuse.isPending}
            onPress={confirmRefusal}
          >
            <Text style={styles.dangerBtnText}>{refuse.isPending ? 'Recording…' : 'Confirm the refusal'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('detail')} style={{ alignItems: 'center', paddingVertical: 10 }}>
            <Text style={styles.linkText}>Go back, the receiver accepts</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // detail
  return (
    <View style={styles.flex}>
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.pillBtn} onPress={() => router.back()}>
            <Icon name="chevronLeft" size={16} color={Colors.white} />
            <Text style={styles.pillBtnText}>Today</Text>
          </TouchableOpacity>
          {stop && (
            <View style={styles.pillBtn}>
              <Text style={styles.pillBtnText}>{stop.stopIndex} of {stop.stopsTotal} today</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerTitle}>Deliver {p.trackingCode}</Text>
        <Text style={styles.headerMeta}>
          Scanned and matched · seal {p.security.sealNumber}
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.receiverRow}>
            <PersonAvatar name={p.receiver.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.receiverName}>{p.receiver.name}</Text>
              <Text style={styles.receiverAddr} numberOfLines={1}>
                {p.deliveryAddress ?? `${p.to.branch}, ${p.to.city}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${p.receiver.phone}`)}>
              <Icon name="phone" size={18} color={Colors.success} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Proof of delivery</Text>

          <TouchableOpacity style={styles.proofRow} onPress={confirmGps} disabled={!!gpsDone || gpsBusy} activeOpacity={0.7}>
            <ProofIcon done={!!gpsDone} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proofTitle}>At the delivery address</Text>
              <Text style={styles.proofSub}>{gpsDone ? 'GPS confirmed' : gpsBusy ? 'Checking…' : 'Tap to confirm with GPS'}</Text>
            </View>
            {!gpsDone && (gpsBusy ? <ActivityIndicator size="small" color={Colors.primary} /> : <Icon name="pin" size={16} color={Colors.inkMuted} />)}
          </TouchableOpacity>

          <TouchableOpacity style={styles.proofRow} onPress={() => startPhoto('handover')} activeOpacity={0.7}>
            <ProofIcon done={!!photoUrl} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proofTitle}>Handover photo taken</Text>
              <Text style={styles.proofSub}>{photoUrl ? 'Stored with the parcel' : 'Tap to take a photo'}</Text>
            </View>
            {!photoUrl && <Icon name="camera" size={16} color={Colors.inkMuted} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.proofRow} onPress={collectCod} disabled={!p.codAmount || codPayment.isSuccess} activeOpacity={0.7}>
            <ProofIcon done={!p.codAmount || codPayment.isSuccess} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proofTitle}>{p.codAmount ? `Collect ${fcfa(p.codAmount)}` : 'Nothing to collect'}</Text>
              <Text style={styles.proofSub}>{p.codAmount ? (codPayment.isSuccess ? 'Collected' : 'Tap once you have the cash') : 'Already paid'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receiver's code</Text>
          <Text style={styles.cardSub}>Ask {p.receiver.name.split(' ')[0]} for the 4-digit code from their SMS once they have checked the parcel.</Text>
          <View style={{ marginTop: 10 }}>
            <CodeInput value={code} onChange={setCode} />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, (code.length !== 4 || !gpsDone || deliver.isPending) && styles.btnDisabled]}
          disabled={code.length !== 4 || !gpsDone || deliver.isPending}
          onPress={confirmDelivery}
        >
          {deliver.isPending ? <ActivityIndicator color={Colors.white} /> : <Icon name="check" size={16} color={Colors.white} />}
          <Text style={styles.primaryBtnText}>{deliver.isPending ? 'Confirming…' : `Confirm delivery`}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setView('refuse')} style={{ alignItems: 'center', paddingVertical: 10 }}>
          <Text style={[styles.linkText, { color: Colors.error }]}>Receiver refused the parcel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ProofIcon({ done }: { done: boolean }) {
  return (
    <View style={[styles.proofIcon, done && styles.proofIconDone]}>
      <Icon name="check" size={14} color={done ? Colors.white : Colors.border} />
    </View>
  );
}

function ProofLine({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={styles.proofLineRow}>
      <Icon name="check" size={15} color={Colors.success} />
      <Text style={styles.proofLineText}>
        <Text style={{ fontWeight: FontWeight.bold }}>{text}</Text>
        {sub ? ` ${sub}` : ''}
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
        <Text style={styles.permText}>Camera access is needed for the handover photo.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={{ paddingVertical: 10 }}>
          <Text style={styles.linkText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView ref={ref} style={StyleSheet.absoluteFill} facing="back" />
      <SafeAreaView style={styles.cameraTop} edges={['top']}>
        <TouchableOpacity style={styles.roundBtn} onPress={onCancel}>
          <Icon name="x" size={18} color={Colors.white} />
        </TouchableOpacity>
      </SafeAreaView>
      <View style={styles.cameraBottom}>
        {uploading ? (
          <ActivityIndicator color={Colors.white} />
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
  flex: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  body: { padding: 20, gap: 14, paddingBottom: 60 },

  header: { backgroundColor: Colors.primary, padding: 20, paddingBottom: 24, gap: 6 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.white, marginTop: 6 },
  headerMeta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },

  plainHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 12 },
  roundBtnDark: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  plainHeaderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.ink },
  plainHeaderMeta: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, gap: 10 },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  cardSub: { fontSize: FontSize.sm, color: Colors.inkSecondary },

  receiverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiverName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  receiverAddr: { fontSize: FontSize.sm, color: Colors.inkSecondary, marginTop: 1 },
  callBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center' },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  proofIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  proofIconDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  proofTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.ink },
  proofSub: { fontSize: FontSize.xs, color: Colors.inkSecondary, marginTop: 1 },

  proofLineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  proofLineText: { flex: 1, fontSize: FontSize.sm, color: Colors.ink, lineHeight: 19 },

  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, backgroundColor: Colors.primary },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  dangerBtn: { alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: Colors.error },
  dangerBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.white },
  btnDisabled: { opacity: 0.45 },
  linkText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.inkSecondary },

  label: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.ink },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  reasonChipActive: { borderColor: Colors.error, backgroundColor: Colors.dangerBg },
  reasonChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.ink },
  reasonChipTextActive: { color: Colors.error },
  textarea: { minHeight: 80, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 12, fontSize: FontSize.sm, color: Colors.ink, textAlignVertical: 'top' },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoIconBox: { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  takeBtn: { backgroundColor: Colors.primaryLight, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  takeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },

  infoBox: { backgroundColor: Colors.primaryLight, borderRadius: 16, padding: 14, gap: 4 },
  infoBoxTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary },
  infoBoxText: { fontSize: FontSize.sm, color: Colors.primary, lineHeight: 19, opacity: 0.9 },

  deliveredHero: { backgroundColor: Colors.primary, alignItems: 'center', padding: 28, paddingBottom: 32, gap: 6, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  checkCircleOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  checkCircleInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  deliveredTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.white, marginTop: 8 },
  deliveredMeta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pillLight: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  pillLightText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.white },

  permWrap: { flex: 1, backgroundColor: Colors.navy, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permText: { color: Colors.white, fontSize: FontSize.base, textAlign: 'center' },
  cameraTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 16 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cameraBottom: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: 'rgba(255,255,255,0.5)', backgroundColor: Colors.white },
});
