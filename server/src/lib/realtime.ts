import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';

// Instant updates for the dashboards (Server-Sent Events): GET /api/events keeps one connection open per tab;
// the server pushes a small message when something changes, the page refreshes the right numbers and may pop
// a notification. Messages carry ids and names only, never personal data: the page re-reads the details
// through the normal API, which checks the rights again.
//
// Who receives an event (audience):
//   team ........ the TransitPro team (PLATFORM_ADMIN)
//   agencyId .... the staff of that agency (optionally only some roles)
//   userId ...... one person (a customer waiting for their payment)
// One server process holds the connections in memory. With several servers, this would go through Redis pub/sub.

export type RealtimeEvent =
  | { type: 'agency.registered'; agencyId: string; name: string }
  | { type: 'agency.documents'; agencyId: string; name: string }
  | { type: 'agency.status'; agencyId: string; name: string; status: string }
  | { type: 'parcel.changed'; trackingCode: string | null }
  | { type: 'payment.settled'; paymentId: string; status: string; purpose: string; amount: number; agencyId: string | null }
  | { type: 'payout.changed'; payoutId: string; status: string; amount: number; kind: string; agencyId: string };

export interface Audience {
  team?: boolean;
  agencyId?: string | null;
  roles?: Role[]; // with agencyId: only these roles (the owner always receives)
  userId?: string | null;
}

interface Client {
  res: Response;
  userId: string;
  role: Role;
  agencyId: string | null;
  tokenVersion: number;
}

const clients = new Set<Client>();
const MAX_PER_USER = 5;
const HEARTBEAT_MS = 30_000;

function matches(c: Client, a: Audience): boolean {
  if (a.team && c.role === 'PLATFORM_ADMIN') return true;
  if (a.userId && c.userId === a.userId) return true;
  if (a.agencyId && c.agencyId === a.agencyId) return !a.roles || c.role === 'AGENCY_OWNER' || a.roles.includes(c.role);
  return false;
}

// Called by the modules after a change is saved. Never throws: a dead connection is dropped.
export function publish(audience: Audience, event: RealtimeEvent) {
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const c of clients) {
    if (!matches(c, audience)) continue;
    try {
      c.res.write(data);
    } catch {
      clients.delete(c);
    }
  }
}

// GET /api/events (after requireAuth)
export async function stream(req: Request, res: Response) {
  const user = req.user!;
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } });
  if (!account) return void res.status(401).end();
  const mine = [...clients].filter((c) => c.userId === user.id);
  if (mine.length >= MAX_PER_USER) mine[0].res.end(); // oldest tab gives way

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: do not buffer
  res.flushHeaders();
  res.write(`retry: 3000\nevent: ready\ndata: {}\n\n`);

  const client: Client = { res, userId: user.id, role: user.role, agencyId: user.agencyId, tokenVersion: account.tokenVersion };
  clients.add(client);

  // Heartbeat keeps proxies from closing the connection, and re-checks the account:
  // logged out everywhere, password changed or account disabled → the stream ends.
  const beat = setInterval(async () => {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { isActive: true, tokenVersion: true } }).catch(() => undefined);
    if (u === null || (u && (!u.isActive || u.tokenVersion !== client.tokenVersion))) return void res.end();
    try {
      res.write(`: ping\n\n`);
    } catch {
      res.end();
    }
  }, HEARTBEAT_MS);

  const close = () => {
    clearInterval(beat);
    clients.delete(client);
  };
  req.on('close', close);
  res.on('close', close);
}

export const connectedClients = () => clients.size;
