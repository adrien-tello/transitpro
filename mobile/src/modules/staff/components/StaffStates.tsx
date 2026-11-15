// The three data states every staff screen shows: skeleton, empty, error with "Try again".
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { StaffColors, StaffSpace } from '../staff.theme';
import { StaffIcon, type StaffIconName } from './StaffIcon';

export function SkeletonBlock({ height, style }: { height: number; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.skeleton, { height, opacity }, style]} />;
}

export function EmptyState({ icon, title, text }: { icon: StaffIconName; title: string; text: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.iconCircle}>
        <StaffIcon name={icon} size={26} color={StaffColors.primaryInk} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <View style={styles.box}>
      <View style={[styles.iconCircle, { backgroundColor: StaffColors.dangerTint }]}>
        <StaffIcon name="alert" size={26} color={StaffColors.danger} />
      </View>
      <Text style={styles.title}>Could not load</Text>
      <Text style={styles.text}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        disabled={retrying}
        style={({ pressed }) => [styles.retry, (pressed || retrying) && { opacity: 0.7 }]}
      >
        <Text style={styles.retryText}>{retrying ? 'Trying…' : 'Try again'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: StaffColors.skeleton, borderRadius: StaffSpace.cardRadius },
  box: {
    backgroundColor: StaffColors.surface,
    borderRadius: StaffSpace.cardRadius,
    borderWidth: 1,
    borderColor: StaffColors.line,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: StaffColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: StaffColors.navy, textAlign: 'center' },
  text: { fontSize: 14, color: StaffColors.body, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  retry: {
    marginTop: 16,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: StaffSpace.buttonRadius,
    backgroundColor: StaffColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: StaffColors.onDark, fontSize: 15, fontWeight: '700' },
});
