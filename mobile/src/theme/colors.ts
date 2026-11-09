// TransitPro design tokens — matched pixel-perfect to design screenshots.
export const Colors = {
  // ── Core brand ──────────────────────────────────────────────────────────────
  primary: '#2563EB',       // blue – logo bg, search results header, seat selected
  primaryLight: '#EBF0FF',  // light blue tint

  orange: '#F5A623',        // orange – "Find trips" button, "where?" text, tab active bg, VIP badge, "Pay" button, quote marks, "Best rated" tag bg
  orangeDark: '#D4891A',    // darker orange for text on light bg

  // ── Dark navy (home header, search results header, e-ticket card, tab bar) ──
  navy: '#0D1117',          // darkest navy
  navyMid: '#1A2235',       // slightly lighter navy
  navyCard: '#1E2A3A',      // info chips on e-ticket

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background: '#F0F2F5',    // app background (light grey – seats, pay, verify screens)
  surface: '#FFFFFF',       // cards, inputs
  surfaceAlt: '#F0F2F5',    // light grey surface (seat taken)

  // ── Text ────────────────────────────────────────────────────────────────────
  ink: '#0D1117',           // primary text (same as navy in design)
  inkSecondary: '#6B7280',  // secondary text
  inkMuted: '#9CA3AF',      // muted / placeholder
  inkOnDark: '#FFFFFF',     // white text on dark backgrounds
  inkOnDarkMuted: 'rgba(255,255,255,0.6)',

  // ── Border ──────────────────────────────────────────────────────────────────
  border: '#E5E7EB',
  borderFocus: '#2563EB',

  // ── Semantic ────────────────────────────────────────────────────────────────
  success: '#16A34A',
  successLight: '#F0FDF4',
  successBg: '#DCFCE7',
  error: '#DC2626',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',

  // ── Tag chips ───────────────────────────────────────────────────────────────
  tagCheapest: '#F5A623',    // orange bg, dark text
  tagBestRated: '#F5A623',   // orange bg, dark text
  tagFastest: '#F5A623',     // orange bg, dark text

  // ── Tab bar (dark pill bar at bottom) ───────────────────────────────────────
  tabBar: '#0D1117',
  tabActive: '#F5A623',      // orange background pill for active
  tabInactive: '#FFFFFF',    // white icon for inactive

  // ── Agency avatar colors (from mocks) ───────────────────────────────────────
  agencyEV: '#F5C46B',   // Étoile Voyages – golden yellow
  agencyML: '#A7E3C1',   // Mungo Lines – mint green
  agencySE: '#B9CBFA',   // Sanaga Express – periwinkle blue
  agencyGC: '#F4A7A7',   // Grassfield Coaches – salmon pink
  agencyLE: '#C4B5FD',   // Littoral Express – lavender
  agencyST: '#93C5FD',   // Savane Transport – light blue

  // ── Rating bar orange ────────────────────────────────────────────────────────
  ratingBar: '#F5A623',
  ratingBarBg: '#F0F2F5',

  // ── Aliases kept for backward compat with shared UI components ───────────────
  inkDisabled: '#9CA3AF',   // same as inkMuted
  warningLight: '#FEF9C3',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',

  // ── Misc ────────────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(13,17,23,0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
