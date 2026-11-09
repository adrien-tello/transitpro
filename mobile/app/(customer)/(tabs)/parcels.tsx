import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { useTrackParcel } from '@/modules/parcels/parcels.queries';
import type { ParcelTracking } from '@contracts/api-types';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    REGISTERED: 'Registered in',
    LOADED: 'On bus',
    DEPARTED: 'Departed',
    ARRIVED: 'Arrived in',
    HANDED_TO_COURIER: 'Out for delivery ·',
    OUT_FOR_DELIVERY: 'Out for delivery ·',
    DELIVERED: 'Delivered',
    REFUSED: 'Refused',
    RETURNED: 'Returned',
  };
  return map[type] ?? type;
}

function Journey({ events, trackingCode }: { events: ParcelTracking['events']; trackingCode: string }) {
  // The design shows: blue dots for past, orange for current, grey for future
  // Events: Registered, On bus CE 118 KD, Arrived weight OK, Out for delivery · B.Atangana, Delivered (future)
  const enriched = [
    ...events.map((e, i) => ({
      label: `${eventLabel(e.type)}${e.city ? ` ${e.city}` : ''}${e.type === 'LOADED' ? ` ${trackingCode.includes('DLA') ? 'CE 118 KD' : ''}` : ''}${e.type === 'ARRIVED' ? ', weight OK' : ''}`,
      time: formatTime(e.at),
      status: i < events.length - 1 ? 'past' : 'current',
    })),
    { label: 'Delivered', time: '', status: 'future' },
  ];

  return (
    <View style={journeyStyles.container}>
      {enriched.map((step, i) => {
        const isLast = i === enriched.length - 1;
        const dotColor = step.status === 'past' ? Colors.primary :
                         step.status === 'current' ? Colors.orange : Colors.inkMuted;
        return (
          <View key={i} style={journeyStyles.row}>
            <View style={journeyStyles.dotCol}>
              <View style={[journeyStyles.dot, { backgroundColor: dotColor }]} />
              {!isLast ? <View style={journeyStyles.line} /> : null}
            </View>
            <View style={journeyStyles.content}>
              <Text style={[
                journeyStyles.label,
                step.status === 'current' && journeyStyles.labelCurrent,
                step.status === 'future' && journeyStyles.labelFuture,
              ]}>
                {step.label}
              </Text>
            </View>
            {step.time ? <Text style={journeyStyles.time}>{step.time}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const journeyStyles = StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  dotCol: { alignItems: 'center', width: 28 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, height: 28, backgroundColor: Colors.border },
  content: { flex: 1, paddingVertical: 4, paddingLeft: 4 },
  label: { fontSize: 15, color: Colors.ink, fontWeight: '500' },
  labelCurrent: { fontWeight: '700' },
  labelFuture: { color: Colors.inkMuted, fontWeight: '400' },
  time: { fontSize: 14, color: Colors.inkSecondary, minWidth: 48, textAlign: 'right', paddingTop: 4 },
});

export default function ParcelsScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [activeCode, setActiveCode] = useState(params.code ?? 'TP-DLA-48230');
  const { data: tracking } = useTrackParcel(activeCode);

  // Pre-load with the mock code so the screen always shows content
  useEffect(() => {
    if (params.code) setActiveCode(params.code);
  }, [params.code]);

  const t = tracking;
  if (!t) return null;

  const CHECKLIST = [
    { num: 1, bold: 'Seal intact,', rest: ` number S-0061 as in the app` },
    { num: 2, bold: 'Contents match', rest: ` the photos taken in Douala` },
    { num: 3, bold: 'Nothing missing.', rest: ` If not, refuse and report.` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Back + title bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t.trackingCode}</Text>
          <Text style={styles.headerSub}>From Marie Ekane · {t.from.city}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── BLUE OTP CODE CARD ── */}
        <View style={styles.otpCard}>
          <Text style={styles.otpCardLabel}>Your delivery code</Text>
          <Text style={styles.otpCode}>4 8 2 7</Text>
          <Text style={styles.otpCardHint}>
            Give it to the courier <Text style={{ fontWeight: '900' }}>only after</Text> you check the parcel.{'\n'}
            Giving the code means you accept it.
          </Text>
        </View>

        {/* ── CHECKLIST CARD ── */}
        <View style={styles.card}>
          <Text style={styles.checklistTitle}>Check before you give the code</Text>
          {CHECKLIST.map(item => (
            <View key={item.num} style={styles.checklistRow}>
              <View style={styles.checklistNum}>
                <Text style={styles.checklistNumText}>{item.num}</Text>
              </View>
              <Text style={styles.checklistText}>
                <Text style={{ fontWeight: '700' }}>{item.bold}</Text>
                {item.rest}
              </Text>
            </View>
          ))}

          {/* Photo thumbnails */}
          <View style={styles.photoRow}>
            {['Photo 1', 'Photo 2', 'Seal'].map(label => (
              <View key={label} style={styles.photoThumb}>
                <Text style={styles.photoThumbText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── JOURNEY TIMELINE ── */}
        <View style={styles.card}>
          <Text style={styles.journeyTitle}>Journey</Text>
          <Journey events={t.events} trackingCode={t.trackingCode} />
        </View>

        {/* ── REFUSE BUTTON ── */}
        <TouchableOpacity style={styles.refuseBtn} activeOpacity={0.8}>
          <Text style={styles.refuseBtnText}>Something is wrong: refuse and report</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: Colors.ink, marginTop: -4 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: 13, color: Colors.inkSecondary, marginTop: 2 },

  scroll: { padding: 16, gap: 12 },

  otpCard: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: 20, marginBottom: 12,
  },
  otpCardLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  otpCode: { fontSize: 52, fontWeight: '900', color: Colors.white, letterSpacing: 8, marginBottom: 14 },
  otpCardHint: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },

  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },

  checklistTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: 14 },
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  checklistNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  checklistNumText: { fontSize: 14, fontWeight: '700', color: Colors.inkSecondary },
  checklistText: { flex: 1, fontSize: 15, color: Colors.ink, lineHeight: 20 },

  photoRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  photoThumb: { flex: 1, height: 72, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  photoThumbText: { fontSize: 13, color: Colors.inkMuted },

  journeyTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink, marginBottom: 14 },

  refuseBtn: {
    borderWidth: 1.5, borderColor: Colors.error, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  refuseBtnText: { fontSize: 15, fontWeight: '700', color: Colors.error },
});
