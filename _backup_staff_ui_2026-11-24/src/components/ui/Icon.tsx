import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/theme';

// Stroke icons (24×24, 1.8 stroke), the same shapes as web/src/components/ui/Icon.tsx so the
// staff and agency apps read as one design system. Add new ones here, never inline elsewhere.
const PATHS = {
  ticket: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4zM14 5v2M14 11v2M14 17v2',
  cal: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  bus: 'M5 4h14a2 2 0 0 1 2 2v10H3V6a2 2 0 0 1 2-2zM3 11h18M7 19v-3M17 19v-3',
  wallet: 'M3 7h18v13H3zM3 7l3-4h12l3 4M16 14h2',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  camera: 'M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  file: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M9 14h6M9 18h4',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  scale: 'M12 3v18M5 21h14M6 8l-3 7h6zM18 8l-3 7h6zM5 8h14',
  help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 4h16v16H4zM22 6l-10 7L2 6',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  zap: 'M13 2 3 14h8l-1 8 10-12h-8z',
  navigate: 'M3 11l18-8-8 18-2-8z',
  refresh: 'M21 12a9 9 0 0 1-15.5 6.2M3 12A9 9 0 0 1 18.5 5.8M21 4v5h-5M3 20v-5h5',
  scan: 'M7 4H4v3M17 4h3v3M7 20H4v-3M17 20h3v-3M4 12h16',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = Colors.ink, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PATHS[name]} />
    </Svg>
  );
}
