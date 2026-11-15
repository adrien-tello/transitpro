// Staff roles other than DRIVER / COURIER (counter agents, managers, HR...) work on the web dashboard.
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogout } from '@/modules/auth/auth.queries';
import { StaffColors, StaffSpace } from '../staff.theme';

export function WebDashboardOnly() {
  const logout = useLogout();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <Text style={styles.title}>Use the web dashboard</Text>
        <Text style={styles.text}>
          This app is for drivers and couriers. Your role works on the TransitPro web dashboard.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
          style={({ pressed }) => [styles.btn, (pressed || logout.isPending) && { opacity: 0.75 }]}
        >
          {logout.isPending ? <ActivityIndicator color={StaffColors.onDark} /> : <Text style={styles.btnText}>Log out</Text>}
        </Pressable>
        {logout.isError && <Text style={styles.error}>{logout.error.message}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: StaffColors.background, justifyContent: 'center', padding: StaffSpace.side },
  box: { backgroundColor: StaffColors.surface, borderRadius: StaffSpace.cardRadius, padding: 24, borderWidth: 1, borderColor: StaffColors.line },
  title: { fontSize: 20, fontWeight: '800', color: StaffColors.navy },
  text: { fontSize: 14, color: StaffColors.body, marginTop: 8, lineHeight: 20 },
  btn: {
    marginTop: 20,
    height: StaffSpace.buttonHeight,
    borderRadius: StaffSpace.buttonRadius,
    backgroundColor: StaffColors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: StaffColors.onDark, fontSize: 15, fontWeight: '700' },
  error: { color: StaffColors.danger, fontSize: 13, marginTop: 10 },
});
