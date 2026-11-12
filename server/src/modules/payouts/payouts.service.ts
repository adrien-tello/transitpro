import type { Payout, PaymentMethod, Prisma } from '@prisma/client';
import type { AdminPayoutAgencyRow, AgencyBalance, AgencyPayouts, Paginated, PayoutAccount, PayoutView } from '@contracts/api-types';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { queueEmail } from '../../lib/email';
import { HttpError, badRequest, notFound } from '../../lib/http-error';
import { ProviderError, getTransfer, notchpayEnabled, operatorOf, sendTransfer, type PayoutChannel } from '../../lib/notchpay';
import { codSentEmail, payoutSentEmail } from './payouts.emails';

// Owner: Lead (Fanyi Charllson). Money going OUT of TransitPro, with Notch Pay transfers.
//
//   AGENCY_PAYOUT ... TransitPro holds the Mobile Money paid by customers. What it owes an agency:
//                       Mobile Money sales (tickets + parcel fees) − our commission on them
//                     − our commission on CASH sales (the agency kept that cash, so it owes us that part)
//                     − payouts already sent or on their way
//                     The TransitPro team presses "Pay agency" (from PAYOUT_MINIMUM up) → transfer to the owner's number.
//   COD_TO_SENDER ... cash on delivery paid by Mobile Money: held in escrow, then sent to the parcel's SENDER when the
//                     receiver confirms with the code. (Cash paid in cash stays at the branch; the sender collects it there.)
//
// Life of a payout: PENDING (created in the database) → PROCESSING (claimed, transfer sent) → SUCCEEDED | FAILED.
// A FAILED agency payout simply frees the money again (the balance counts only PENDING, PROCESSING and SUCCEEDED).
// The result is always read from Notch Pay's API: the sweep below, or the webhook.

type Tx = Prisma.TransactionClient;
const SALES: ('TICKET' | 'PARCEL_FEE')[] = ['TICKET', 'PARCEL_FEE'];
const OPEN: Payout['status'][] = ['PENDING', 'PROCESSING', 'SUCCEEDED'];

// ─────────────── balance ───────────────

type Sums = { mobileMoneyNet: number; cashCommission: number; paidOut: number };

async function sumsFor(agencyIds: string[] | null, db: Tx | typeof prisma = prisma): Promise<Map<string, Sums>> {
  const scope = agencyIds ? { agencyId: { in: agencyIds } } : { agencyId: { not: null } };
  const [sales, payouts] = await Promise.all([
    db.payment.groupBy({
      by: ['agencyId', 'method'],
      where: { ...scope, status: 'SUCCEEDED', purpose: { in: SALES } },
      _sum: { amount: true, platformFee: true },
    }),
    db.payout.groupBy({
      by: ['agencyId'],
      where: { ...(agencyIds ? { agencyId: { in: agencyIds } } : {}), kind: 'AGENCY_PAYOUT', status: { in: OPEN } },
      _sum: { amount: true },
    }),
  ]);
  const out = new Map<string, Sums>();
  const get = (id: string) => out.get(id) ?? (out.set(id, { mobileMoneyNet: 0, cashCommission: 0, paidOut: 0 }), out.get(id)!);
  for (const s of sales) {
    if (!s.agencyId) continue;
    const row = get(s.agencyId);
    const amount = s._sum.amount ?? 0;
    const fee = s._sum.platformFee ?? 0;
    if ((s.method as PaymentMethod) === 'CASH') row.cashCommission += fee;
    else row.mobileMoneyNet += amount - fee;
  }
  for (const p of payouts) get(p.agencyId).paidOut += p._sum.amount ?? 0;
  return out;
}

const toBalance = (s: Sums | undefined): AgencyBalance => {
  const b = s ?? { mobileMoneyNet: 0, cashCommission: 0, paidOut: 0 };
  return { ...b, available: Math.max(0, b.mobileMoneyNet - b.cashCommission - b.paidOut), minimumPayout: env.PAYOUT_MINIMUM };
};

export async function balanceOf(agencyId: string, db: Tx | typeof prisma = prisma): Promise<AgencyBalance> {
  return toBalance((await sumsFor([agencyId], db)).get(agencyId));
}

const accountOf = (a: { payoutName: string | null; payoutPhone: string | null; payoutChannel: string | null }): PayoutAccount | null =>
  a.payoutName && a.payoutPhone && a.payoutChannel ? { name: a.payoutName, phone: a.payoutPhone, channel: a.payoutChannel as PayoutChannel } : null;

export function toView(p: Payout & { agency?: { name: string } | null; escrow?: { parcel: { trackingCode: string } } | null }): PayoutView {
  return {
    id: p.id,
    kind: p.kind,
    amount: p.amount,
    recipientName: p.recipientName,
    phone: p.phone,
    channel: p.channel as PayoutChannel,
    status: p.status,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
    settledAt: p.settledAt ? p.settledAt.toISOString() : null,
    ...(p.agency ? { agencyName: p.agency.name } : {}),
    ...(p.escrow !== undefined ? { parcelCode: p.escrow?.parcel.trackingCode ?? null } : {}),
  };
}

// ─────────────── agency side ───────────────

// PUT /agencies/me/payout-account (owner). The operator must match the number (an MTN number on Orange fails).
export async function setAccount(agencyId: string, input: PayoutAccount): Promise<PayoutAccount> {
  const detected = operatorOf(input.phone);
  if (!detected) throw badRequest('Enter a Cameroon mobile number (9 digits starting with 6)', { phone: ['Not a Cameroon mobile number'] });
  if (detected !== input.channel)
    throw badRequest(`This is an ${detected === 'cm.mtn' ? 'MTN' : 'Orange'} number`, {
      channel: [`Choose ${detected === 'cm.mtn' ? 'MTN Mobile Money' : 'Orange Money'} for this number`],
    });
  const before = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { payoutPhone: true, payoutChannel: true } });
  const numberChanged = before.payoutPhone !== input.phone || before.payoutChannel !== input.channel;
  const a = await prisma.agency.update({
    where: { id: agencyId },
    // A new number starts the 24 h hold on withdrawals (the first account too: a brand-new login cannot cash out at once)
    data: { payoutName: input.name, payoutPhone: input.phone, payoutChannel: input.channel, ...(numberChanged ? { payoutAccountUpdatedAt: new Date() } : {}) },
    select: { payoutName: true, payoutPhone: true, payoutChannel: true },
  });
  return accountOf(a)!;
}

// GET /payouts/mine (owner, accountant)
export async function forAgency(agencyId: string): Promise<AgencyPayouts> {
  const [agency, balance, payouts] = await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { payoutName: true, payoutPhone: true, payoutChannel: true, payoutAccountUpdatedAt: true } }),
    balanceOf(agencyId),
    prisma.payout.findMany({ where: { agencyId, kind: 'AGENCY_PAYOUT' }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);
  const holdEnds = holdEndOf(agency.payoutAccountUpdatedAt);
  return {
    balance,
    account: accountOf(agency),
    payouts: payouts.map((p) => toView(p)),
    withdrawableAt: holdEnds && holdEnds > new Date() ? holdEnds.toISOString() : null,
  };
}

const HOLD_MS = 24 * 3600_000;
const holdEndOf = (changedAt: Date | null) => (changedAt ? new Date(changedAt.getTime() + HOLD_MS) : null);

// ─────────────── TransitPro team ───────────────

// GET /payouts/admin/agencies: every verified (or suspended) agency with what we owe it, biggest first
export async function agenciesToPay(): Promise<AdminPayoutAgencyRow[]> {
  const agencies = await prisma.agency.findMany({
    where: { status: { in: ['APPROVED', 'SUSPENDED'] } },
    select: { id: true, name: true, status: true, payoutName: true, payoutPhone: true, payoutChannel: true },
  });
  const ids = agencies.map((a) => a.id);
  const [sums, last] = await Promise.all([
    sumsFor(ids),
    prisma.payout.groupBy({ by: ['agencyId'], where: { agencyId: { in: ids }, kind: 'AGENCY_PAYOUT', status: 'SUCCEEDED' }, _max: { settledAt: true } }),
  ]);
  const lastBy = new Map(last.map((l) => [l.agencyId, l._max.settledAt]));
  return agencies
    .map((a) => ({
      agencyId: a.id,
      agencyName: a.name,
      status: a.status,
      account: accountOf(a),
      balance: toBalance(sums.get(a.id)),
      lastPayoutAt: lastBy.get(a.id)?.toISOString() ?? null,
    }))
    .sort((x, y) => y.balance.available - x.balance.available);
}

// GET /payouts/admin/history
export async function history(q: { kind?: 'AGENCY_PAYOUT' | 'COD_TO_SENDER'; status?: Payout['status']; page: number; limit: number }): Promise<Paginated<PayoutView>> {
  const where: Prisma.PayoutWhereInput = { ...(q.kind ? { kind: q.kind } : {}), ...(q.status ? { status: q.status } : {}) };
  const [items, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { agency: { select: { name: true } }, escrow: { select: { parcel: { select: { trackingCode: true } } } } },
    }),
    prisma.payout.count({ where }),
  ]);
  return { items: items.map(toView), page: q.page, limit: q.limit, total };
}

// POST /payouts/admin/agencies/:id { amount? }: "Pay agency" (TransitPro team)
export const payAgency = (agencyId: string, amount: number | undefined, adminId: string) => createPayout(agencyId, amount, adminId, false);

// POST /payouts/mine/withdraw { amount? }: the owner withdraws (from the minimum up, not within 24 h of a number change)
export const withdraw = (agencyId: string, amount: number | undefined, ownerId: string) => createPayout(agencyId, amount, ownerId, true);

// One path for both. The agency row is locked while the balance is checked,
// so two clicks (or the owner and an admin at the same time) can never send the same money twice.
async function createPayout(agencyId: string, amount: number | undefined, actorId: string, byOwner: boolean): Promise<PayoutView> {
  if (!notchpayEnabled()) throw new HttpError(503, 'MOBILE_MONEY_UNAVAILABLE', 'Mobile Money is not configured on this server');
  const payout = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Agency" WHERE id = ${agencyId} FOR UPDATE`;
    const agency = await tx.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw notFound('Agency');
    if (agency.status !== 'APPROVED' && agency.status !== 'SUSPENDED') throw badRequest('This agency is not verified');
    if (byOwner && agency.status !== 'APPROVED') throw badRequest('Your agency is suspended: the TransitPro team sends your payouts');
    const account = accountOf(agency);
    if (!account) throw badRequest(byOwner ? 'Add your payout account first' : 'This agency has no payout account yet: the owner adds it in Settings');
    const holdEnds = holdEndOf(agency.payoutAccountUpdatedAt);
    if (byOwner && holdEnds && holdEnds > new Date()) {
      const when = holdEnds.toLocaleString('en-GB', { timeZone: 'Africa/Douala', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      throw badRequest(`For your safety, withdrawals open 24 hours after the payout number changes (from ${when})`);
    }
    const balance = await balanceOf(agencyId, tx);
    const send = amount ?? balance.available;
    if (send < env.PAYOUT_MINIMUM) throw badRequest(`The minimum payout is ${env.PAYOUT_MINIMUM.toLocaleString('en-US')} FCFA`);
    if (send > balance.available) throw badRequest(`Only ${balance.available.toLocaleString('en-US')} FCFA is available for this agency`);
    return tx.payout.create({
      data: { agencyId, kind: 'AGENCY_PAYOUT', amount: send, recipientName: account.name, phone: account.phone, channel: account.channel, createdById: actorId },
    });
  });
  return toView(await start(payout.id));
}

// ─────────────── cash on delivery → sender ───────────────

// Called by Finance inside the delivery transaction when a Mobile Money COD escrow is released.
// The transfer itself is sent by the sweep a moment later (never inside a database transaction).
export async function queueCodToSender(tx: Tx, input: { escrowId: string; agencyId: string; amount: number; phone: string; senderName: string }) {
  return tx.payout.create({
    data: {
      kind: 'COD_TO_SENDER',
      escrowId: input.escrowId,
      agencyId: input.agencyId,
      amount: input.amount,
      phone: input.phone,
      channel: operatorOf(input.phone) ?? 'cm.mtn',
      recipientName: input.senderName,
    },
  });
}

// ─────────────── sending and following a transfer ───────────────

// Claim (PENDING → PROCESSING, exactly once), then send. Our payout id is the transfer's reference at Notch Pay.
async function start(payoutId: string): Promise<Payout> {
  const claimed = await prisma.payout.updateMany({ where: { id: payoutId, status: 'PENDING' }, data: { status: 'PROCESSING', lastCheckedAt: new Date() } });
  const payout = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (claimed.count === 0) return payout; // someone else is sending it
  try {
    const t = await sendTransfer({
      ourReference: payout.id,
      amount: payout.amount,
      name: payout.recipientName,
      phone: payout.phone,
      channel: payout.channel as PayoutChannel,
      description: payout.kind === 'AGENCY_PAYOUT' ? 'TransitPro payout' : 'TransitPro cash on delivery',
    });
    await prisma.payout.update({ where: { id: payout.id }, data: { providerRef: t.reference } });
    return settleFrom(payout.id, t.status);
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : 'Notch Pay could not be reached';
    console.error(`[payouts] transfer ${payout.id} not sent: ${message}`);
    return finish(payout.id, false, 'PROVIDER_ERROR');
  }
}

async function settleFrom(payoutId: string, status: string): Promise<Payout> {
  if (status === 'complete') return finish(payoutId, true);
  if (status === 'failed' || status === 'canceled' || status === 'expired') return finish(payoutId, false, status.toUpperCase());
  return prisma.payout.update({ where: { id: payoutId }, data: { lastCheckedAt: new Date() } });
}

// Exactly once: only a PROCESSING payout can end. Then the emails.
async function finish(payoutId: string, ok: boolean, reason?: string): Promise<Payout> {
  const done = await prisma.payout.updateMany({
    where: { id: payoutId, status: { in: ['PENDING', 'PROCESSING'] } },
    data: { status: ok ? 'SUCCEEDED' : 'FAILED', failureReason: ok ? null : (reason ?? 'FAILED'), settledAt: new Date(), lastCheckedAt: new Date() },
  });
  const p = await prisma.payout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { agency: { select: { name: true, email: true } }, escrow: { select: { parcel: { select: { trackingCode: true, senderEmail: true } } } } },
  });
  if (done.count === 1 && ok) {
    if (p.kind === 'AGENCY_PAYOUT') queueEmail(payoutSentEmail(p.agency, p));
    else if (p.escrow?.parcel.senderEmail) queueEmail(codSentEmail(p.escrow.parcel.senderEmail, p, p.escrow.parcel.trackingCode));
  }
  if (done.count === 1 && !ok) console.error(`[payouts] ${p.kind} ${p.id} failed: ${p.failureReason}`);
  return p;
}

// Ask Notch Pay where a transfer is. A transfer sent but not recorded (server stopped in between) is found by our reference.
export async function sync(payoutId: string): Promise<Payout> {
  const p = await prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  if (p.status !== 'PROCESSING') return p;
  try {
    const t = await getTransfer(p.providerRef ?? p.id);
    if (!p.providerRef) await prisma.payout.update({ where: { id: p.id }, data: { providerRef: t.reference } });
    return settleFrom(p.id, t.status);
  } catch (err) {
    // Never recorded at Notch Pay and old enough: it was never sent, free the money
    if (!p.providerRef && err instanceof ProviderError && err.httpStatus === 404 && Date.now() - p.createdAt.getTime() > 10 * 60_000) {
      return finish(p.id, false, 'NOT_SENT');
    }
    await prisma.payout.update({ where: { id: p.id }, data: { lastCheckedAt: new Date() } });
    return p;
  }
}

// Webhook (transfer.complete / transfer.failed): only the reference is taken from the message
export async function syncByReference(reference: string): Promise<boolean> {
  const p = await prisma.payout.findFirst({ where: { OR: [{ providerRef: reference }, { id: reference }] }, select: { id: true } });
  if (!p) return false;
  await sync(p.id);
  return true;
}

// Every few seconds (server.ts): send the queued cash-on-delivery payouts, follow the transfers on their way
export async function sweep(): Promise<number> {
  const [queued, moving] = await Promise.all([
    prisma.payout.findMany({ where: { status: 'PENDING' }, select: { id: true }, orderBy: { createdAt: 'asc' }, take: 10 }),
    prisma.payout.findMany({
      where: { status: 'PROCESSING', OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 4000) } }] },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
  ]);
  for (const p of queued) await start(p.id);
  for (const p of moving) await sync(p.id);
  return queued.length + moving.length;
}
