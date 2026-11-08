import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, FontSize, FontWeight, Typography } from '@/theme';

type SortOption = 'earliest' | 'cheapest' | 'rating';

const CITIES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Kribi',
  'Bertoua', 'Ngaoundéré', 'Buea', 'Limbe', 'Kumba',
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'earliest', label: 'Earliest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'rating', label: 'Best rated' },
];

/** Format a Date to YYYY-MM-DD */
function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Format a date string nicely */
function formatDateLabel(s: string) {
  if (!s) return 'Select date';
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function SearchScreen() {
  const router = useRouter();
  const today = toDateString(new Date());

  const [from, setFrom] = useState('Douala');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(today);
  const [sort, setSort] = useState<SortOption>('earliest');
  const [errors, setErrors] = useState<{ from?: string; to?: string; date?: string }>({});

  function swapCities() {
    setFrom(to);
    setTo(from);
  }

  function validate() {
    const e: typeof errors = {};
    if (!from.trim()) e.from = 'Departure city is required';
    if (!to.trim()) e.to = 'Destination city is required';
    if (from.trim().toLowerCase() === to.trim().toLowerCase())
      e.to = 'Departure and destination cannot be the same';
    if (!date) e.date = 'Please choose a travel date';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSearch() {
    if (!validate()) return;
    router.push(
      `/(customer)/search/results?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&sort=${sort}`,
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[Typography.h3, styles.headerTitle]}>Where to?</Text>
        </View>

        {/* From / To with swap */}
        <View style={styles.routeCard}>
          {/* FROM */}
          <View style={styles.routeRow}>
            <View style={styles.dotWrapper}>
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
              <View style={styles.dottedLine} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeFieldLabel}>FROM</Text>
              <Input
                placeholder="Departure city"
                value={from}
                onChangeText={setFrom}
                containerStyle={styles.routeInput}
                error={errors.from}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Swap button */}
          <TouchableOpacity style={styles.swapBtn} onPress={swapCities}>
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>

          {/* TO */}
          <View style={styles.routeRow}>
            <View style={styles.dotWrapper}>
              <View style={[styles.dot, { backgroundColor: Colors.error }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeFieldLabel}>TO</Text>
              <Input
                placeholder="Destination city"
                value={to}
                onChangeText={setTo}
                containerStyle={styles.routeInput}
                error={errors.to}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        {/* Quick city chips */}
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>Popular destinations</Text>
          <View style={styles.chips}>
            {CITIES.filter(c => c !== from).slice(0, 6).map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.chip, to === city && styles.chipActive]}
                onPress={() => setTo(city)}
              >
                <Text style={[styles.chipText, to === city && styles.chipTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Travel date</Text>
          <View style={styles.dateRow}>
            {[0, 1, 2, 3, 4].map(offset => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const val = toDateString(d);
              const label = offset === 0
                ? 'Today'
                : offset === 1
                ? 'Tomorrow'
                : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
              return (
                <TouchableOpacity
                  key={val}
                  style={[styles.dateChip, date === val && styles.dateChipActive]}
                  onPress={() => setDate(val)}
                >
                  <Text style={[styles.dateChipText, date === val && styles.dateChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.date ? <Text style={styles.fieldError}>{errors.date}</Text> : null}
        </View>

        {/* Sort */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sort by</Text>
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, sort === opt.value && styles.sortChipActive]}
                onPress={() => setSort(opt.value)}
              >
                <Text style={[styles.sortChipText, sort === opt.value && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Search trips"
          onPress={handleSearch}
          style={styles.searchBtn}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: FontSize.lg, color: Colors.ink },
  headerTitle: { flex: 1 },

  routeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
    position: 'relative',
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dotWrapper: { alignItems: 'center', width: 20, paddingTop: 28, marginRight: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dottedLine: {
    width: 1.5,
    height: 52,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  routeFieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 4,
  },
  routeInput: { marginBottom: 0 },

  swapBtn: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  swapIcon: { fontSize: 18, color: Colors.primary, fontWeight: FontWeight.bold },

  chipsSection: { marginBottom: 20 },
  chipsLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.inkSecondary,
    marginBottom: 10,
  },
  fieldError: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },

  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  dateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.inkSecondary },
  dateChipTextActive: { color: Colors.white },

  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sortChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  sortChipText: { fontSize: FontSize.sm, color: Colors.inkSecondary },
  sortChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },

  searchBtn: { marginTop: 8 },
});
