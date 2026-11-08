// TransitPro design token colours.
// Use these everywhere — never write raw hex values in components.
export const Colors = {
  // Brand
  primary: '#2563EB',       // blue CTA, active tab, selected seat
  primaryLight: '#EFF6FF',  // blue tinted backgrounds
  primaryDark: '#1D4ED8',

  // Backgrounds
  background: '#F8F9FB',    // page background
  surface: '#FFFFFF',       // cards, inputs
  surfaceAlt: '#F1F5F9',    // secondary surfaces

  // Text
  ink: '#0F172A',           // primary text
  inkSecondary: '#64748B',  // secondary / muted text
  inkDisabled: '#94A3B8',   // disabled text

  // Border
  border: '#E2E8F0',
  borderFocus: '#2563EB',

  // Status / semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF9C3',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',

  // Trip tags
  tagCheapest: '#16A34A',
  tagBestRated: '#2563EB',
  tagFastest: '#F59E0B',

  // Parcel status colours
  statusRegistered: '#64748B',
  statusLoaded: '#0EA5E9',
  statusInTransit: '#2563EB',
  statusArrived: '#16A34A',
  statusOutForDelivery: '#F59E0B',
  statusDelivered: '#16A34A',
  statusOnHold: '#F59E0B',
  statusRefused: '#DC2626',

  // Tab bar
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',
  tabBar: '#FFFFFF',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15,23,42,0.4)',
} as const;

export type ColorKey = keyof typeof Colors;
