// Staff app design tokens (docs/tasks/fidel-staff-app.md, section 3).
// They live here, inside the staff module, so the shared src/theme/colors.ts is untouched.
// Plan: move them into src/theme/colors.ts under a "// Staff app" comment once Adrien agrees.
import { Platform } from 'react-native';

export const StaffColors = {
  background: '#F3F5F9',
  surface: '#FFFFFF',
  navy: '#0E1726', // text, dark hero cards, dark headers
  body: '#3E4757',
  muted: '#5B6576',
  hint: '#9AA3B2',
  divider: '#ECEFF4', // between rows of a list
  tabBorder: '#E6EBF5',
  onDark: '#FFFFFF',
  onDarkMuted: '#AEB8C8',
  navyTile: '#1A2537', // tiles inside the navy hero card
  primary: '#1E4FD8',
  primaryTint: '#E8EEFD',
  primaryInk: '#163BA6',
  line: '#E4E8EF',
  field: '#D5DBE4',
  chip: '#F1F4FA',
  success: '#146C43',
  successTint: '#E3F5EC',
  warning: '#8A5200',
  warningTint: '#FFF3DC',
  danger: '#B42318',
  dangerTint: '#FDECEA',
  accent: '#F59E0B',
  // Blue hero cards and headers (design pictures): accent fill, white text, translucent tiles
  onPrimaryMuted: 'rgba(255,255,255,0.78)',
  heroTile: 'rgba(255,255,255,0.14)',
  heroTrack: 'rgba(255,255,255,0.25)',
  amberInk: '#3B2600', // dark text on the amber "Boarding" pill and "Start delivery" button
  progressPassengers: '#FFFFFF',
  progressParcels: '#4ADE80',
  progressTrack: '#2A3446',
  skeleton: '#E4E8EF',
  // "On the road" drawn map
  mapBg: '#E9EDF3',
  mapRoad: '#DCE2EB',
  routeLeft: '#9AA3B2',
  // Scanner (design: dark background #0B1220, translucent white buttons)
  scannerBg: '#0B1220',
  scannerVeil: 'rgba(11,18,32,0.35)',
  glass: 'rgba(255,255,255,0.14)',
  glassSoft: 'rgba(255,255,255,0.08)',
} as const;

// JetBrains Mono is not loaded yet (it needs a new library), so times and codes use the
// platform's monospace font until the fonts are added.
export const monoFont = Platform.select({ ios: 'Menlo', default: 'monospace' });

export const StaffSpace = {
  side: 18, // screen side padding
  heroRadius: 24,
  cardRadius: 18,
  buttonHeight: 52,
  buttonRadius: 15,
} as const;
