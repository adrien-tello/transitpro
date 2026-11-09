import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';

const DATE_TABS = ['Today', 'Tue 3', 'Wed 4', 'Thu 5', 'Pick date'];

const AUTOCOMPLETE = [
  { main: 'Yaoundé', sub: 'Centre · 9 verified agencies · from 4,000' },
  { main: 'Yaoundé, Mvan station', sub: 'Bus station · 6 agencies stop here' },
];

const RECENT = [
  { route: 'Douala → Bafoussam', when: 'Last week' },
  { route: 'Douala → Kribi', when: 'Aug' },
];

const OTHER_CITIES = ['Bamenda', 'Buea', 'Limbé', 'Bertoua', 'Garoua', 'Ebolowa'];

function toDateString(d: Date) { return d.toISOString().slice(0, 10); }

export default function SearchScreen() {
  const router = useRouter();
  const [from] = useState('Douala');
  const [to, setTo] = useState('Yao');
  const [dateTabIdx, setDateTabIdx] = useState(1); // 'Tue 3' selected
  const [showAutocomplete, setShowAutocomplete] = useState(true);

  const selectedDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + dateTabIdx);
    return toDateString(d);
  })();

  function handleSearch(dest?: string) {
    const destination = dest ?? to;
    if (!destination.trim()) return;
    setShowAutocomplete(false);
    router.push(
      `/(customer)/search/results?from=${encodeURIComponent(from)}&to=${encodeURIComponent(destination)}&date=${selectedDate}&sort=earliest`
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── TOP: From/To input area ── */}
      <View style={styles.topArea}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.passengerHint}>1 passenger</Text>

        {/* From / To with vertical line */}
        <View style={styles.routeBox}>
          {/* Vertical connector */}
          <View style={styles.connector}>
            <View style={styles.connectorDotBlue} />
            <View style={styles.connectorLine} />
            <View style={styles.connectorDotOrange} />
          </View>

          {/* Fields */}
          <View style={styles.routeFields}>
            {/* From (static) */}
            <View style={styles.routeFieldRow}>
              <Text style={styles.routeFieldLabel}>From</Text>
              <Text style={styles.routeFieldValue}>{from}</Text>
            </View>
            {/* Divider line */}
            <View style={styles.routeFieldDivider} />
            {/* To (editable) */}
            <View style={styles.routeFieldRow}>
              <Text style={styles.routeFieldLabel}>To</Text>
              <TextInput
                style={styles.routeFieldInput}
                value={to}
                onChangeText={v => { setTo(v); setShowAutocomplete(true); }}
                autoFocus
                autoCapitalize="words"
                placeholderTextColor={Colors.inkMuted}
                placeholder="City"
              />
            </View>
          </View>

          {/* Swap button */}
          <TouchableOpacity style={styles.swapBtn}>
            <Text style={styles.swapBtnText}>⇅</Text>
          </TouchableOpacity>
        </View>

        {/* Date tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateTabs}>
          {DATE_TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={styles.dateTab}
              onPress={() => setDateTabIdx(i)}
            >
              <Text style={[styles.dateTabText, dateTabIdx === i && styles.dateTabTextActive]}>
                {tab}
              </Text>
              {dateTabIdx === i ? <View style={styles.dateTabUnderline} /> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── BOTTOM: Autocomplete / recent / cities ── */}
      <ScrollView style={styles.suggestions} keyboardShouldPersistTaps="always">
        {/* Autocomplete suggestions */}
        {showAutocomplete && to.length > 0 && AUTOCOMPLETE.filter(a =>
          a.main.toLowerCase().startsWith(to.toLowerCase())
        ).map(item => (
          <TouchableOpacity
            key={item.main}
            style={styles.suggestionRow}
            onPress={() => { setTo(item.main); handleSearch(item.main); }}
            activeOpacity={0.8}
          >
            <View style={styles.suggestionIcon}>
              <Text style={styles.suggestionIconText}>📍</Text>
            </View>
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionMain}>
                <Text style={{ fontWeight: '800' }}>{to}</Text>
                {item.main.slice(to.length)}
              </Text>
              <Text style={styles.suggestionSub}>{item.sub}</Text>
            </View>
            <Text style={styles.suggestionArrow}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Recent */}
        <Text style={styles.groupLabel}>RECENT</Text>
        {RECENT.map(r => (
          <TouchableOpacity
            key={r.route}
            style={styles.recentRow}
            onPress={() => {
              const dest = r.route.split('→')[1].trim();
              setTo(dest);
              handleSearch(dest);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.recentIcon}>🕐</Text>
            <Text style={styles.recentRoute}>{r.route}</Text>
            <Text style={styles.recentWhen}>{r.when}</Text>
          </TouchableOpacity>
        ))}

        {/* Other cities */}
        <Text style={styles.groupLabel}>OTHER CITIES</Text>
        <View style={styles.cityChips}>
          {OTHER_CITIES.map(city => (
            <TouchableOpacity
              key={city}
              style={styles.cityChip}
              onPress={() => { setTo(city); handleSearch(city); }}
              activeOpacity={0.8}
            >
              <Text style={styles.cityChipText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── DARK CTA BUTTON ── */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => handleSearch()} activeOpacity={0.9}>
          <Text style={styles.ctaBtnText}>Show trips for {DATE_TABS[dateTabIdx]} Nov</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  // ── Top input area ──
  topArea: { backgroundColor: Colors.surface, paddingBottom: 4 },
  closeBtn: { marginLeft: 20, marginTop: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: Colors.ink },
  passengerHint: { position: 'absolute', right: 20, top: 16, fontSize: 14, color: Colors.inkSecondary, fontWeight: '500' },

  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 14,
  },
  connector: { alignItems: 'center', width: 20, paddingTop: 12 },
  connectorDotBlue: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  connectorLine: { width: 2, flex: 1, minHeight: 36, backgroundColor: Colors.primary, marginVertical: 2 },
  connectorDotOrange: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },

  routeFields: { flex: 1 },
  routeFieldRow: { paddingVertical: 10 },
  routeFieldLabel: { fontSize: 12, color: Colors.inkMuted, fontWeight: '500', marginBottom: 2 },
  routeFieldValue: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  routeFieldInput: { fontSize: 22, fontWeight: '800', color: Colors.ink, padding: 0 },
  routeFieldDivider: { height: 1, backgroundColor: Colors.border },

  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnText: { fontSize: 18, color: Colors.ink },

  dateTabs: { paddingLeft: 20, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dateTab: { paddingRight: 24, paddingVertical: 10, alignItems: 'center' },
  dateTabText: { fontSize: 15, color: Colors.inkSecondary, fontWeight: '500' },
  dateTabTextActive: { color: Colors.ink, fontWeight: '700' },
  dateTabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.primary, borderRadius: 1 },

  // ── Suggestions ──
  suggestions: { flex: 1, backgroundColor: Colors.surface },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionIconText: { fontSize: 18 },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 16, color: Colors.ink },
  suggestionSub: { fontSize: 13, color: Colors.inkSecondary, marginTop: 2 },
  suggestionArrow: { fontSize: 18, color: Colors.inkMuted },

  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.inkMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recentIcon: { fontSize: 18, color: Colors.inkMuted },
  recentRoute: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.ink },
  recentWhen: { fontSize: 14, color: Colors.inkSecondary },

  cityChips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, paddingBottom: 24 },
  cityChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cityChipText: { fontSize: 14, fontWeight: '500', color: Colors.ink },

  // ── CTA ──
  ctaWrap: { padding: 20, paddingBottom: 16, backgroundColor: Colors.surface },
  ctaBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
