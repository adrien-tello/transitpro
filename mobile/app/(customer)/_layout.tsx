import { Stack } from 'expo-router';

// The customer group wraps tabs, search, booking, and agency screens.
// Individual sub-groups have their own Stack layouts.
export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
