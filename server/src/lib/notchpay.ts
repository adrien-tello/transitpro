import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

// Notch Pay (notchpay.co): MTN Mobile Money and Orange Money in Cameroon.
// Only the server talks to Notch Pay: the keys never reach the apps.
//
// Measured on the sandbox (Nov 2026), not guessed:
//   POST /payments            → transaction.reference "trx.test_..." (Notch Pay's reference), status "pending"
//   PUT  /payments/{ref}      → status "processing": the payer gets the prompt on their phone
//   GET  /payments/{ref}      → status "complete" | "failed" | "expired" (no answer) | "canceled" (refused)
//   Test numbers: 6x0000000 success · 6x0000002 failed · 6x0000003 expired · 6x0000004 canceled (x = 7 MTN, 9 Orange)

const BASE = 'https://api.notchpay.co';
const TIMEOUT_MS = 15_000;

export type ProviderStatus = 'pending' | 'processing' | 'complete' | 'failed' | 'expired' | 'canceled' | string;

export interface ProviderTransaction {
  reference: string; // Notch Pay's reference
  merchantReference: string | null; // ours (the Payment id)
  status: ProviderStatus;
  amount: number;
  currency: string;
  sandbox: boolean;
}

export class ProviderError extends Error {
  constructor(public httpStatus: number, message: string) {
    super(message);
  }
}

export const notchpayEnabled = () => env.NOTCHPAY_PUBLIC_KEY.length > 0;

// grant = true adds the private key (X-Grant): Notch Pay requires it for money going OUT (beneficiaries, transfers)
async function call(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, grant = false): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: env.NOTCHPAY_PUBLIC_KEY,
        ...(grant ? { 'X-Grant': env.NOTCHPAY_PRIVATE_KEY } : {}),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ProviderError(0, 'Notch Pay could not be reached');
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // Status and Notch Pay's short message only: never the keys, never the whole request
    throw new ProviderError(res.status, typeof json.message === 'string' ? json.message : `HTTP ${res.status}`);
  }
  return json;
}

function toTransaction(json: Record<string, unknown>): ProviderTransaction {
  const t = (json.transaction ?? {}) as Record<string, unknown>;
  if (typeof t.reference !== 'string') throw new ProviderError(502, 'Unexpected answer from Notch Pay');
  return {
    reference: t.reference,
    merchantReference: typeof t.merchant_reference === 'string' ? t.merchant_reference : null,
    status: String(t.status ?? 'pending'),
    amount: Number(t.amount ?? 0),
    currency: String(t.currency ?? 'XAF'),
    sandbox: Boolean(t.sandbox),
  };
}

// "677112233", "+237 677 11 22 33", "237677112233" → "+237677112233"
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+237${digits}`;
  if (digits.startsWith('237') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

// Step 1 + 2: create the payment at Notch Pay, then send the prompt to the payer's phone
export async function chargeMobileMoney(input: {
  ourReference: string; // the Payment id: Notch Pay sends it back as merchant_reference
  amount: number;
  phone: string;
  operator: 'MTN_MOMO' | 'ORANGE_MONEY';
  payerName: string;
  description: string;
}): Promise<ProviderTransaction> {
  const phone = toInternationalPhone(input.phone);
  const created = toTransaction(
    await call('POST', '/payments', {
      amount: input.amount,
      currency: 'XAF',
      reference: input.ourReference,
      description: input.description,
      customer: { name: input.payerName, phone },
    }),
  );
  return toTransaction(
    await call('PUT', `/payments/${encodeURIComponent(created.reference)}`, {
      channel: input.operator === 'MTN_MOMO' ? 'cm.mtn' : 'cm.orange',
      data: { phone },
    }),
  );
}

export async function getTransaction(providerRef: string): Promise<ProviderTransaction> {
  return toTransaction(await call('GET', `/payments/${encodeURIComponent(providerRef)}`));
}

// Webhook check: HMAC-SHA256 of the RAW request body with the hash key, hex, in x-notch-signature.
// Compared in constant time. Without this, anyone could post "payment complete" to our server.
export function isValidWebhookSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  if (!env.NOTCHPAY_HASH_KEY || !rawBody || !signature) return false;
  const expected = Buffer.from(createHmac('sha256', env.NOTCHPAY_HASH_KEY).update(rawBody).digest('hex'), 'utf8');
  const given = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ─────────────── Money going out: transfers (payouts to agencies, cash on delivery to senders) ───────────────
// Measured on the sandbox (Nov 2026). The public docs are wrong on two points, these calls are the ones that work:
//   POST /beneficiaries { name, phone, account_number, channel, country: "CM", currency: "XAF", type: "mobile_money" }
//        → beneficiary.id "bn.test_..."
//   POST /transfers { amount, currency, description, reference, recipient: <beneficiary id>, channel }
//        (the field is "recipient", not "beneficiary"; inline beneficiary_data is refused)
//        → transfer.reference "trf.test_...", status "processing"
//   GET  /transfers/{ref} → status "complete" | "failed" | "canceled" | "pending" | "processing"
//   Test numbers: 670000000 → complete · 670000002 → failed. Both calls need the private key (X-Grant).

export type PayoutChannel = 'cm.mtn' | 'cm.orange';

// Cameroon prefixes: MTN 67x, 650-654, 680-684 · Orange 69x, 655-659, 685-689
export function operatorOf(phone: string): PayoutChannel | null {
  const d = phone.replace(/\D/g, '').replace(/^237/, '');
  if (d.length !== 9 || d[0] !== '6') return null;
  const two = Number(d.slice(1, 2));
  const three = Number(d.slice(1, 3));
  if (two === 7) return 'cm.mtn';
  if (two === 9) return 'cm.orange';
  if (three >= 50 && three <= 54) return 'cm.mtn';
  if (three >= 55 && three <= 59) return 'cm.orange';
  if (three >= 80 && three <= 84) return 'cm.mtn';
  if (three >= 85 && three <= 89) return 'cm.orange';
  return null;
}

export interface ProviderTransfer {
  reference: string;
  status: ProviderStatus;
}

function toTransfer(json: Record<string, unknown>): ProviderTransfer {
  const t = (json.transfer ?? {}) as Record<string, unknown>;
  if (typeof t.reference !== 'string') throw new ProviderError(502, 'Unexpected answer from Notch Pay');
  return { reference: t.reference, status: String(t.status ?? 'pending') };
}

// Send Mobile Money to someone: create the beneficiary, then the transfer
export async function sendTransfer(input: {
  ourReference: string; // the Payout id
  amount: number;
  name: string;
  phone: string;
  channel: PayoutChannel;
  description: string;
}): Promise<ProviderTransfer> {
  const phone = toInternationalPhone(input.phone);
  const ben = await call(
    'POST',
    '/beneficiaries',
    { name: input.name.slice(0, 80), phone, account_number: phone, channel: input.channel, country: 'CM', currency: 'XAF', type: 'mobile_money' },
    true,
  );
  const beneficiaryId = (ben.beneficiary as Record<string, unknown> | undefined)?.id;
  if (typeof beneficiaryId !== 'string') throw new ProviderError(502, 'Unexpected answer from Notch Pay');
  return toTransfer(
    await call(
      'POST',
      '/transfers',
      { amount: input.amount, currency: 'XAF', description: input.description.slice(0, 120), reference: input.ourReference, recipient: beneficiaryId, channel: input.channel },
      true,
    ),
  );
}

export async function getTransfer(providerRef: string): Promise<ProviderTransfer> {
  return toTransfer(await call('GET', `/transfers/${encodeURIComponent(providerRef)}`, undefined, true));
}
