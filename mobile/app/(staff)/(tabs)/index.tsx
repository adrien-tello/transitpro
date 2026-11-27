import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '@/theme';
import { Icon } from '@/components/ui';
import { useMe } from '@/modules/auth/auth.queries';
import { DriverToday } from '@/modules/staff/DriverToday';
import { CourierToday } from '@/modules/staff/CourierToday';

export default function StaffTodayScreen() {
  const { data: me, isPending } = useMe();

  if (isPending || !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (me.role === 'DRIVER') return <DriverToday me={me} />;
  if (me.role === 'COURIER') return <CourierToday me={me} />;

  // Counter agents, branch managers... — the "Today" screen for these roles lives on the
  // web dashboard today; this redesign covers driver and courier only (see the design canvas).
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Icon name="bus" size={48} color={Colors.inkMuted} />
        <Text style={[Typography.h3, { marginTop: 16 }]}>Staff app</Text>
        <Text style={[Typography.bodySm, { marginTop: 8, textAlign: 'center' }]}>
          Today screens for your role are not in this redesign yet.{'\n'}Use the web dashboard for now.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
