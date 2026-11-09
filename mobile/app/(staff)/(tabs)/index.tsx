import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography } from '@/theme';

// Stub screen — Fidel builds the staff app.
export default function StaffHomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>🚌</Text>
        <Text style={[Typography.h3, { marginTop: 16 }]}>Staff App</Text>
        <Text style={[Typography.bodySm, { marginTop: 8, textAlign: 'center' }]}>
          Driver and courier screens — coming soon.{'\n'}
          (Owned by Fidel)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
