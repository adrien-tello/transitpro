// Live bus location, shared by Driver · Today and Driver · On the road.
// While a trip is DEPARTED the phone's real GPS position goes to
// POST /fleet/trips/:tripId/location every 30 s. It stops at arrival (or when the driver taps Stop).
import { create } from 'zustand';
import * as Location from 'expo-location';
import { sendTripLocation } from './staff.queries';

const EVERY_MS = 30_000;

interface LiveLocation {
  tripId: string | null;
  sharing: boolean;
  lastSentAt: string | null;
  failed: boolean; // last position not sent (no GPS or no network): retried in 30 s
  speedKmh: number | null; // from the GPS, null when the phone does not know
  start: (tripId: string) => void;
  stop: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const useLiveLocation = create<LiveLocation>((set, get) => ({
  tripId: null,
  sharing: false,
  lastSentAt: null,
  failed: false,
  speedKmh: null,

  start: (tripId) => {
    if (timer) clearInterval(timer);
    set({ tripId, sharing: true, failed: false });

    async function sendOnce() {
      if (get().tripId !== tripId) return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await sendTripLocation(tripId, pos.coords.latitude, pos.coords.longitude);
        const mps = pos.coords.speed;
        set({
          lastSentAt: new Date().toISOString(),
          failed: false,
          speedKmh: mps != null && mps >= 0 ? Math.round(mps * 3.6) : null,
        });
      } catch {
        set({ failed: true });
      }
    }
    void sendOnce();
    timer = setInterval(sendOnce, EVERY_MS);
  },

  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
    set({ tripId: null, sharing: false, failed: false, speedKmh: null });
  },
}));

// Asks for the location permission. false = the driver refused.
export async function askLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}
