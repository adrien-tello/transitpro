import { useEffect } from 'react';
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
  | { type: 'payment.settled'; paymentId: string; status: string; amount: number }
  | { type: 'payout.changed'; payoutId: string; status: string; amount: number; kind: string };

const money = (n: number) => `${new Intl.NumberFormat('en-US').format(n)} FCFA`;

export function useRealtime(me: Me | null | undefined) {
  const qc = useQueryClient();
  const toast = useToast();
  const userId = me?.id;
  const team = me?.role === 'PLATFORM_ADMIN';
  const myAgency = me?.agency?.id;

  useEffect(() => {
    if (!userId || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/events', { withCredentials: true });
    const on = <T extends Event>(type: T['type'], handle: (e: T) => void) =>
      es.addEventListener(type, (m) => {
        try {
          handle(JSON.parse((m as MessageEvent).data) as T);
        } catch {
          /* a malformed message is ignored */
        }
      });

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
    on('payment.settled', () => {
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
    return () => es.close();
  }, [userId, team, myAgency, qc, toast]);
}
