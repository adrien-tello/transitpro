import type { Payment, PaymentMethod, PaymentPurpose, Prisma } from '@prisma/client';
import type { PaymentView } from '@contracts/api-types';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { HttpError, notFound } from '../../lib/http-error';
import { ProviderError, chargeMobileMoney, getTransaction, notchpayEnabled, type ProviderStatus } from '../../lib/notchpay';
import { publish } from '../../lib/realtime';

// Owner: Lead (Fanyi Charllson). Every payment of the platform goes through here.
//
//   CASH ........... SUCCEEDED at once (the staff member has the money in hand).
//   MTN / ORANGE ... PENDING → the payer gets a prompt on their phone (Notch Pay) → SUCCEEDED or FAILED.
//                    We learn the result three ways, whichever comes first:
//                      1. Notch Pay's webhook (signed, POST /api/payments/webhooks/notchpay)
//                      2. the app asking GET /api/payments/:id (we ask Notch Pay if it is still pending)
//                      3. a sweep every few seconds on the server (works on a laptop with no public URL)
//                    In all three cases the RESULT is read from Notch Pay's API, never from the message itself.
//
// A module creates its payment inside its own transaction, then starts it after the commit:
//     const payment = await payments.create(tx, {...});      // in the parcel / ticket transaction
//     await payments.start(payment.id);                        // after commit: sends the phone prompt
// and reacts to the result with a handler:
//     payments.onSettled('COD_COLLECTION', async (tx, payment, ok) => { ... });

export type Tx = Prisma.TransactionClient;
type Outcome = { ok: true } | { ok: false; reason: 'FAILED' | 'EXPIRED' | 'CANCELED' | 'PROVIDER_ERROR' };
type SettledHandler = (tx: Tx, payment: Payment, ok: boolean) => Promise<void>;

const handlers = new Map<PaymentPurpose, SettledHandler>();

// Booking registers TICKET, Parcels registers PARCEL_FEE and COD_COLLECTION
export function onSettled(purpose: PaymentPurpose, handler: SettledHandler) {
  handlers.set(purpose, handler);
}

export interface CreatePaymentInput {
  agencyId: string;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  amount: number;
  commissionRate: number; // % kept by TransitPro (Agency.commissionRate); 0 for money that belongs to someone else
  payerPhone?: string; // required for Mobile Money
  payerId?: string;
  parcelId?: string;
}

// Mobile Money needs the Notch Pay keys; cash always works
export function assertMethodAvailable(method: PaymentMethod) {
  if (method !== 'CASH' && !notchpayEnabled()) {
    throw new HttpError(503, 'MOBILE_MONEY_UNAVAILABLE', 'Mobile Money is not available right now, take cash or try later');
  }
}

export async function create(tx: Tx, input: CreatePaymentInput): Promise<Payment> {
  const cash = input.method === 'CASH';
  if (!cash && !input.payerPhone) throw new HttpError(400, 'BAD_REQUEST', 'Give the Mobile Money number that pays');
  const payment = await tx.payment.create({
    data: {
      agencyId: input.agencyId,
      payerId: input.payerId,
      parcelId: input.parcelId,
      purpose: input.purpose,
      method: input.method,
      amount: input.amount,
      platformFee: Math.round((input.amount * input.commissionRate) / 100),
      status: cash ? 'SUCCEEDED' : 'PENDING',
      settledAt: cash ? new Date() : null,
      provider: cash ? null : 'NOTCHPAY',
      payerPhone: input.payerPhone,
    },
  });
  // Cash is settled in the same transaction as the ticket / parcel
  if (cash) await handlers.get(input.purpose)?.(tx, payment, true);
  return payment;
}

// After the module's transaction: send the prompt to the payer's phone
export async function start(paymentId: string, description: string, payerName: string): Promise<Payment> {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== 'PENDING' || payment.provider !== 'NOTCHPAY' || payment.providerRef) return payment;
  try {
    const trx = await chargeMobileMoney({
      ourReference: payment.id,
      amount: payment.amount,
      phone: payment.payerPhone!,
      operator: payment.method as 'MTN_MOMO' | 'ORANGE_MONEY',
      payerName,
      description,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: trx.reference, lastCheckedAt: new Date() } });
    return applyProviderStatus(payment.id, trx.status);
  } catch (err) {
    const status = err instanceof ProviderError ? err.httpStatus : 0;
    console.error(`[payments] Notch Pay refused to start payment ${payment.id} (HTTP ${status})`);
    await settle(payment.id, { ok: false, reason: 'PROVIDER_ERROR' });
    return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  }
}

function outcomeOf(status: ProviderStatus): Outcome | null {
  if (status === 'complete') return { ok: true };
  if (status === 'failed') return { ok: false, reason: 'FAILED' };
  if (status === 'expired') return { ok: false, reason: 'EXPIRED' };
  if (status === 'canceled' || status === 'cancelled') return { ok: false, reason: 'CANCELED' };
  return null; // pending / processing: still waiting for the payer
}

async function applyProviderStatus(paymentId: string, status: ProviderStatus): Promise<Payment> {
  const outcome = outcomeOf(status);
  if (outcome) await settle(paymentId, outcome);
  return prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
}

// PENDING → SUCCEEDED / FAILED exactly once, even if the webhook, the app and the sweep arrive together
async function settle(paymentId: string, outcome: Outcome) {
  const settled = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: outcome.ok
        ? { status: 'SUCCEEDED', settledAt: new Date(), failureReason: null }
        : { status: 'FAILED', settledAt: new Date(), failureReason: outcome.reason },
    });
    if (count !== 1) return null; // already settled by someone else
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await handlers.get(payment.purpose)?.(tx, payment, outcome.ok);
    return payment;
  });
  // After the commit: dashboards waiting for this payment update at once
  if (settled) {
    publish(
      { team: true, agencyId: settled.agencyId, userId: settled.payerId },
      { type: 'payment.settled', paymentId: settled.id, status: settled.status, purpose: settled.purpose, amount: settled.amount, agencyId: settled.agencyId },
    );
  }
}

// Ask Notch Pay for the truth about a pending payment
export async function sync(paymentId: string): Promise<Payment> {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== 'PENDING' || payment.provider !== 'NOTCHPAY') return payment;

  const tooOld = Date.now() - payment.createdAt.getTime() > env.PAYMENT_TIMEOUT_MINUTES * 60_000;
  if (!payment.providerRef) {
    // The prompt was never sent (server stopped in between)
    if (tooOld) await settle(payment.id, { ok: false, reason: 'EXPIRED' });
    return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  }
  try {
    const trx = await getTransaction(payment.providerRef);
    await prisma.payment.update({ where: { id: payment.id }, data: { lastCheckedAt: new Date() } });
    const updated = await applyProviderStatus(payment.id, trx.status);
    if (updated.status === 'PENDING' && tooOld) await settle(payment.id, { ok: false, reason: 'EXPIRED' });
  } catch {
    // Notch Pay unreachable: keep PENDING, the next sweep tries again
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

// Webhook: we only take the reference from the message and ask Notch Pay ourselves
export async function syncByReference(reference: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { OR: [{ providerRef: reference }, { id: reference }] },
    select: { id: true },
  });
  if (!payment) return false;
  await sync(payment.id);
  return true;
}

// Every few seconds: pending Mobile Money payments not checked recently
export async function sweep(): Promise<number> {
  const pending = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      provider: 'NOTCHPAY',
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 4000) } }],
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  for (const p of pending) await sync(p.id);
  return pending.length;
}

export function toView(p: Payment): PaymentView {
  return {
    id: p.id,
    purpose: p.purpose,
    method: p.method,
    status: p.status,
    amount: p.amount,
    platformFee: p.platformFee,
    payerPhone: p.payerPhone,
    failureReason: p.failureReason as PaymentView['failureReason'],
    createdAt: p.createdAt.toISOString(),
    settledAt: p.settledAt ? p.settledAt.toISOString() : null,
  };
}

// GET /payments/:id: the payer, staff of the agency, or the TransitPro team. Anyone else: 404.
export async function getForUser(
  paymentId: string,
  user: { id: string; role: string; agencyId: string | null },
): Promise<PaymentView> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  const allowed =
    payment &&
    (user.role === 'PLATFORM_ADMIN' || payment.payerId === user.id || (payment.agencyId !== null && payment.agencyId === user.agencyId));
  if (!payment || !allowed) throw notFound('Payment');
  const fresh = payment.status === 'PENDING' ? await sync(payment.id) : payment;
  return toView(fresh);
}
