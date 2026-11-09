import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/theme';
import { useMe } from '@/modules/auth/auth.queries';

// One QueryClient for the entire app.
// staleTime: 30 s — data is fresh for 30 s before a background refetch.
// retry: 1 — don't hammer a server that's down.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// ── Auth gate ─────────────────────────────────────────────────────────────────
// Wraps every screen. Decides which route group to open based on the user's role.
// Logic:
//   - me = null  → not logged in → (auth)/login
//   - me.role === 'CUSTOMER' → (customer)/(tabs)/
//   - any staff role → (staff)/(tabs)/
// Runs on every mount and whenever `me` changes (login / logout).
function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { data: me, isLoading } = useMe();

  useEffect(() => {
    if (isLoading) return; // Wait for the query before deciding

    const inAuth = segments[0] === '(auth)';
    const inCustomer = segments[0] === '(customer)';
    const inStaff = segments[0] === '(staff)';

    if (me === null) {
      // Not logged in (null = 401 returned) → go to login
      if (!inAuth) router.replace('/(auth)/login');
    } else if (me !== null && me !== undefined) {
      // me === undefined means query still loading, handled by isLoading above
      if (me.role === 'CUSTOMER') {
        if (!inCustomer) router.replace('/(customer)/(tabs)/');
      } else {
        // Driver, Courier, Counter Agent, Manager, etc. → staff app
        if (!inStaff) router.replace('/(staff)/(tabs)/');
      }
    }
  }, [me, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashEmoji}>🚌</Text>
        </View>
        <Text style={styles.splashName}>TransitPro</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return <>{children}</>;
}

// ── Root layout ────────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate>
            <Slot />
          </AuthGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  splashLogo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  splashEmoji: { fontSize: 44 },
  splashName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.5,
  },
});
