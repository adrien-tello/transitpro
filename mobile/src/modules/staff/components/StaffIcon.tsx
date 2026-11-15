// Stroke icons for the staff app (2 px, rounded), drawn with react-native-svg,
// which is already installed, so no icon library is added.
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type StaffIconName =
  | 'alert'
  | 'bell'
  | 'box'
  | 'check'
  | 'chevron'
  | 'navigate'
  | 'pin'
  | 'qr'
  | 'ticket'
  | 'users'
  | 'stop'
  | 'x'
  | 'home'
  | 'user'
  | 'wallet'
  | 'route'
  | 'bulb'
  | 'phone'
  | 'calendar'
  | 'scan'
  | 'bus'
  | 'idcard'
  | 'arrow'
  | 'search'
  | 'clock'
  | 'mail'
  | 'lock'
  | 'globe'
  | 'help'
  | 'logout'
  | 'camera'
  | 'device';

interface Props {
  name: StaffIconName;
  size?: number;
  color: string;
}

export function StaffIcon({ name, size = 20, color }: Props) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'alert' && (
        <>
          <Path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" {...p} />
          <Path d="M12 9v4M12 17h.01" {...p} />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" {...p} />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" {...p} />
        </>
      )}
      {name === 'box' && (
        <>
          <Path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" {...p} />
          <Path d="m3 8 9 5 9-5M12 13v8" {...p} />
        </>
      )}
      {name === 'check' && <Path d="M20 6 9 17l-5-5" {...p} />}
      {name === 'chevron' && <Path d="m9 18 6-6-6-6" {...p} />}
      {name === 'navigate' && <Path d="m3 11 19-9-9 19-2-8-8-2Z" {...p} />}
      {name === 'pin' && (
        <>
          <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" {...p} />
          <Circle cx={12} cy={10} r={3} {...p} />
        </>
      )}
      {name === 'qr' && (
        <>
          <Rect x={3} y={3} width={7} height={7} rx={1} {...p} />
          <Rect x={14} y={3} width={7} height={7} rx={1} {...p} />
          <Rect x={3} y={14} width={7} height={7} rx={1} {...p} />
          <Path d="M14 14h3v3M21 14v.01M14 21h7v-4" {...p} />
        </>
      )}
      {name === 'ticket' && (
        <>
          <Path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" {...p} />
          <Path d="M13 5v2M13 11v2M13 17v2" {...p} />
        </>
      )}
      {name === 'users' && (
        <>
          <Circle cx={9} cy={7} r={4} {...p} />
          <Path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9" {...p} />
        </>
      )}
      {name === 'stop' && <Rect x={6} y={6} width={12} height={12} rx={2} {...p} />}
      {name === 'bulb' && (
        <>
          <Path d="M9 18h6M10 22h4" {...p} />
          <Path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" {...p} />
        </>
      )}
      {name === 'phone' && (
        <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" {...p} />
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...p} />
          <Path d="M16 3v4M8 3v4M3 10h18" {...p} />
        </>
      )}
      {name === 'scan' && <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" {...p} />}
      {name === 'bus' && (
        <>
          <Rect x={4} y={3} width={16} height={15} rx={3} {...p} />
          <Path d="M4 11h16M8 21v-3M16 21v-3M8 15h.01M16 15h.01" {...p} />
        </>
      )}
      {name === 'idcard' && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} {...p} />
          <Path d="M7 10h4M7 14h6M15 10h2" {...p} />
        </>
      )}
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Path d="m20 20-3.5-3.5" {...p} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7v5l3 2" {...p} />
        </>
      )}
      {name === 'mail' && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2} {...p} />
          <Path d="m3 7 9 6 9-6" {...p} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x={4} y={11} width={16} height={10} rx={2} {...p} />
          <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
        </>
      )}
      {name === 'globe' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" {...p} />
        </>
      )}
      {name === 'help' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2.2-2.4 3.7M12 17h.01" {...p} />
        </>
      )}
      {name === 'logout' && <Path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" {...p} />}
      {name === 'camera' && (
        <>
          <Path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" {...p} />
          <Circle cx={12} cy={13} r={3.5} {...p} />
        </>
      )}
      {name === 'device' && (
        <>
          <Rect x={7} y={2} width={10} height={20} rx={2} {...p} />
          <Path d="M11 18h2" {...p} />
        </>
      )}
      {name === 'x' && <Path d="M18 6 6 18M6 6l12 12" {...p} />}
      {name === 'home' && (
        <>
          <Path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" {...p} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...p} />
        </>
      )}
      {name === 'wallet' && (
        <>
          <Path d="M20 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6" {...p} />
          <Path d="M16 14h.01" {...p} />
        </>
      )}
      {name === 'route' && (
        <>
          <Circle cx={6} cy={19} r={3} {...p} />
          <Circle cx={18} cy={5} r={3} {...p} />
          <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" {...p} />
        </>
      )}
    </Svg>
  );
}
