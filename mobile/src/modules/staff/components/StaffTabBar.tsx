// Floating tab bar (design 3 · "Tab bar"): a white pill, 64 high, 20 from the edges.
// Active tab = accent pill with icon + label. Inactive tabs = icon only, sharing the rest.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StaffColors } from '../staff.theme';
import { StaffIcon, type StaffIconName } from './StaffIcon';

export type StaffTab = 'index' | 'scan' | 'trips' | 'cash' | 'profile';

const TAB_INFO: Record<StaffTab, { label: string; icon: StaffIconName }> = {
  index: { label: 'Today', icon: 'calendar' },
  scan: { label: 'Scan', icon: 'scan' },
  trips: { label: 'Trips', icon: 'bus' },
  cash: { label: 'Cash', icon: 'wallet' },
  profile: { label: 'Profile', icon: 'user' },
};

export const DRIVER_TABS: StaffTab[] = ['index', 'scan', 'trips', 'profile'];
export const COURIER_TABS: StaffTab[] = ['index', 'scan', 'cash', 'profile'];

export function StaffTabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: StaffTab[] }) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const routes = tabs
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is (typeof state.routes)[number] => !!r);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(20, insets.bottom + 8) }]}>
      <View style={styles.bar}>
        {routes.map((route) => {
          const info = TAB_INFO[route.name as StaffTab];
          const focused = route.name === activeName;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={info.label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={[styles.item, focused && styles.itemActive]}
            >
              <StaffIcon name={info.icon} size={22} color={focused ? StaffColors.onDark : StaffColors.muted} />
              {focused && <Text style={styles.label}>{info.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20 },
  bar: {
    height: 64,
    borderRadius: 999,
    backgroundColor: StaffColors.surface,
    borderWidth: 1,
    borderColor: StaffColors.tabBorder,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // Design shadow: 0 12px 30px rgba(30,79,216,.16)
    shadowColor: StaffColors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 15,
    elevation: 10,
  },
  item: { flex: 1, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  // Sized by its icon + label (flex: 0 would shrink it to nothing on the web).
  itemActive: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    backgroundColor: StaffColors.primary,
  },
  label: { color: StaffColors.onDark, fontSize: 14, fontWeight: '700' },
});
