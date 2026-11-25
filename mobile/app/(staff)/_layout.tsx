import { Stack } from 'expo-router';

// The staff group wraps the (tabs) bar and the full-screen flows pushed on top of it
// (scan result sheets live inside the Scan tab; delivery, passengers and the live map
// are separate stack screens so they get their own back button).
export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
