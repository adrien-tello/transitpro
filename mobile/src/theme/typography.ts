// Typography scale for TransitPro mobile app.
import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

export const Typography = StyleSheet.create({
  h1: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.ink, lineHeight: FontSize.xxl * 1.2 },
  h2: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.ink, lineHeight: FontSize.xl * 1.2 },
  h3: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.ink, lineHeight: FontSize.lg * 1.3 },
  h4: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.ink, lineHeight: FontSize.md * 1.3 },
  body: { fontSize: FontSize.base, fontWeight: FontWeight.regular, color: Colors.ink, lineHeight: FontSize.base * 1.5 },
  bodyMedium: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.ink, lineHeight: FontSize.base * 1.5 },
  bodySm: { fontSize: FontSize.sm, fontWeight: FontWeight.regular, color: Colors.inkSecondary, lineHeight: FontSize.sm * 1.5 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.inkSecondary },
  caption: { fontSize: FontSize.xs, fontWeight: FontWeight.regular, color: Colors.inkDisabled },
  code: { fontSize: FontSize.md, fontWeight: FontWeight.bold, letterSpacing: 1, color: Colors.ink },
});
