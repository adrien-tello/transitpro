import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Me } from '@contracts/api-types';
import { useToast } from '../components/ui/Toast';
import { keys } from './queryClient';

// Instant updates: one open connection to GET /api/events (Server-Sent Events, the session cookie goes with it).
// A message says WHAT changed; we refresh those cached queries (React Query re-reads them through the API,
// which checks the rights) and pop a notification for the events a person must not miss.
// EventSource reconnects by itself (3 s) after a network cut or a server restart.

type Event =
  | { type: 'agency.registered'; agencyId: string; name: string }
  | { type: 'agency.documents'; agencyId: string }
  | { type: 'agency.status'; agencyId: string; name: string; status: string }
  | { type: 'parcel.changed'; trackingCode: string | null }
  | { type: 'payment.settled'; paymentId: string; status: string; amount: number; purpose: string }
  | { type: 'payout.changed'; payoutId: string; status: string; amount: number; kind: string };

const money = (n: number) => `${new Intl.NumberFormat('en-US').format(n)} FCFA`;

// Connection state, shown as the "Live" dot in the top bar
export type LiveState = 'connecting' | 'live' | 'offline';
let state: LiveState = 'connecting';
const watchers = new Set<() => void>();
const setState = (s: LiveState) => {
  if (s !== state) {
    state = s;
    watchers.forEach((w) => w());
  }
};
export const useLiveState = () =>
  useSyncExternalStore(
    (w) => (watchers.add(w), () => watchers.delete(w)),
    () => state,
  );

export function useRealtime(me: Me | null | undefined) {
  const qc = useQueryClient();
  const toast = useToast();
  const userId = me?.id;
  const team = me?.role === 'PLATFORM_ADMIN';
  const myAgency = me?.agency?.id;

  useEffect(() => {
    if (!userId || typeof EventSource === 'undefined') return;
    let es: EventSource;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 5_000;
    let connectedOnce = false;
    const handlers: [string, (m: MessageEvent) => void][] = [];
    const on = <T extends Event>(type: T['type'], handle: (e: T) => void) =>
      handlers.push([type, (m) => {
        try {
          handle(JSON.parse(m.data) as T);
        } catch {
          /* a malformed message is ignored */
        }
      }]);

    on<Extract<Event, { type: 'agency.registered' }>>('agency.registered', (e) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      toast(`New agency signed up: ${e.name}`);
    });
    on('agency.documents', () => qc.invalidateQueries({ queryKey: ['admin'] }));
    on<Extract<Event, { type: 'agency.status' }>>('agency.status', (e) => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      if (e.agencyId === myAgency) {
        // The page guards read /auth/me: an approved agency moves to its dashboard by itself
        qc.invalidateQueries({ queryKey: keys.me });
        if (e.status === 'APPROVED') toast(`${e.name} is verified: your dashboard is open`);
        if (e.status === 'REJECTED') toast(`${e.name} could not be verified: see the reason`, 'error');
        if (e.status === 'SUSPENDED') toast(`${e.name} was suspended by TransitPro`, 'error');
      } else if (team && e.status === 'PENDING') {
        toast(`${e.name} fixed its documents and asks for a new check`);
      }
    });
    on('parcel.changed', () => {
      if (team) return void qc.invalidateQueries({ queryKey: ['admin'] }); // overview, payments (a cash sale is paid at once)
      qc.invalidateQueries({ queryKey: keys.parcels() }); // lists, counters, alerts
      qc.invalidateQueries({ queryKey: ['parcel'] });
    });
    on<Extract<Event, { type: 'payment.settled' }>>('payment.settled', (e) => {
      if (team && e.purpose === 'SUBSCRIPTION' && e.status === 'SUCCEEDED') toast(`An agency paid for the Verified badge: ${money(e.amount)}`);
      qc.invalidateQueries({ queryKey: keys.badge });
      qc.invalidateQueries({ queryKey: keys.me }); // a badge payment changes me.agency.badgeUntil
      qc.invalidateQueries({ queryKey: ['parcel'] });
      qc.invalidateQueries({ queryKey: keys.parcels() });
      qc.invalidateQueries({ queryKey: keys.myPayouts });
      qc.invalidateQueries({ queryKey: ['admin'] });
    });
    on<Extract<Event, { type: 'payout.changed' }>>('payout.changed', (e) => {
      qc.invalidateQueries({ queryKey: keys.myPayouts });
      qc.invalidateQueries({ queryKey: ['admin'] });
      if (e.status === 'SUCCEEDED' && e.kind === 'AGENCY_PAYOUT') toast(team ? `Payout of ${money(e.amount)} sent` : `${money(e.amount)} sent to your Mobile Money`);
      if (e.status === 'FAILED' && e.kind === 'AGENCY_PAYOUT') toast(`A payout of ${money(e.amount)} failed: the money is back in the balance`, 'error');
    });

    // The browser reconnects by itself after a short cut. If it gives up (server refused, offline for long),
    // we try again with a growing delay, up to 1 minute. After any reconnection, everything on screen is re-read:
    // messages sent while we were away are lost, the data is not.
    const connect = () => {
      setState('connecting');
      es = new EventSource('/api/events', { withCredentials: true });
      for (const [type, h] of handlers) es.addEventListener(type, h as EventListener);
      es.addEventListener('ready', () => {
        setState('live');
        delay = 5_000;
        if (connectedOnce) qc.invalidateQueries();
        connectedOnce = true;
      });
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED && !stopped) {
          setState('offline');
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 60_000);
        } else if (!stopped) setState('connecting');
      };
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      es.close();
    };
  }, [userId, team, myAgency, qc, toast]);
}
