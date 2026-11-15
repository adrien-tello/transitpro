// Staff stack: the tabs, plus full screens opened on top of them (delivery).
import React from 'react';
import { Stack } from 'expo-router';

export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
