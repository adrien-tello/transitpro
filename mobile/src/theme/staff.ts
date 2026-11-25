// Staff app (driver / courier) design tokens, taken from the "Staff app" mockups.
// Kept separate from colors.ts on purpose: the auth and customer screens keep their own palette.
import { Platform, StyleSheet } from 'react-native';

export const S = {
  // Brand
  blue: '#1F4FD8', // headers, primary buttons, active tab pill
  blueSoft: '#E8EEFC', // seat chip (boarded), avatar (receiver), "Take" pill, info box
  blueDisabled: '#C9D3E6', // disabled primary button
  orange: '#F59E0B', // role pill, "Board", "Start delivery", "Boarding", missing pill
  cream: '#FEF3DC', // box / wallet icon tile, seat chip (missing), avatar, "Collect" pill
  brown: '#9A5B00', // text on cream

  // Surfaces
  bg: '#F2F4F8',
  card: '#FFFFFF',
  tile: '#F2F4F8', // grey tiles inside cards (weight, seal, metrics, time chips)
  iconTile: '#EEF1F7', // profile row icon squares
  line: '#EDF0F5', // dividers
  border: '#DDE2EA',

  // Text
  ink: '#0F172A',
  ink2: '#64748B',
  ink3: '#94A3B8',
  onBlue: '#FFFFFF',
  onBlue2: 'rgba(255,255,255,0.78)',
  glass: 'rgba(255,255,255,0.16)', // translucent pills / buttons on blue

  // Semantic
  green: '#16A34A',
  greenText: '#15803D',
  greenSoft: '#E3F5EA',
  red: '#B91C1C',
  redSoft: '#FDE8E8',
  amber: '#D97706',
  amberSoft: '#FEF3DC',
} as const;

// Monospace for codes, times and amounts in lists (TK-58071, 12:05, TP-DLA-48230).
export const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// Space at the bottom of tab screens so content clears the floating tab bar.
export const TAB_BAR_SPACE = 120;

export const shadow = StyleSheet.create({
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
}).card;

// "8,500" — the mockups group thousands with a comma.
export function amount(n: number) {
  return n.toLocaleString('en-US');
}
