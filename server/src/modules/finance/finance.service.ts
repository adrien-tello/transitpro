import type { PaymentMethod, PaymentPurpose, Prisma } from '@prisma/client';
import { badRequest, notImplemented } from '../../lib/http-error';

// Owner: Sweet (Finance & Reporting).
//
// Other modules NEVER write Payment / Escrow / Expense rows themselves. They call
// these functions. That is how a sale in Booking or Parcels "posts to Finance".
// Each function takes the caller's transaction client (tx) so the payment is saved
// in the same database transaction as the ticket or parcel.
//
// recordPayment, holdInEscrow, releaseEscrowForParcel and refundEscrowForParcel were
// built by the Lead for the Parcels module (Nov 2026). Sweet: keep their signatures,
// extend them freely (provider calls, webhooks, remittances).

export type Tx = Prisma.TransactionClient;

export interface RecordPaymentInput {
  agencyId: string;
  payerId?: string;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  amount: number;
  // Percent of the amount kept by TransitPro (Agency.commissionRate). How the platform earns money.
  commissionRate: number;
  parcelId?: string; // parcel fee or cash on delivery
}

// Cash = SUCCEEDED at once. MoMo / OM = PENDING until the provider webhook confirms
// (the webhook is Sweet's: POST /finance/webhooks/payments).
export async function recordPayment(tx: Tx, input: RecordPaymentInput) {
  return tx.payment.create({
    data: {
      agencyId: input.agencyId,
      payerId: input.payerId,
      parcelId: input.parcelId,
      purpose: input.purpose,
      method: input.method,
      amount: input.amount,
      platformFee: Math.round((input.amount * input.commissionRate) / 100),
      status: input.method === 'CASH' ? 'SUCCEEDED' : 'PENDING',
    },
  });
}

// Cash on delivery: the receiver's money is held by the platform until the receiver
// confirms with the delivery code (release) or refuses the parcel (refund).
export async function holdInEscrow(
  tx: Tx,
  input: { paymentId: string; parcelId: string; amount: number; beneficiaryPhone: string },
) {
  return tx.escrow.create({ data: { ...input, status: 'HELD' } });
}

// Called by Parcels when the receiver's code is correct: the money goes to the sender
export async function releaseEscrowForParcel(tx: Tx, parcelId: string) {
  const escrow = await tx.escrow.findUnique({ where: { parcelId } });
  if (!escrow) return null; // no cash on delivery for this parcel
  if (escrow.status !== 'HELD') throw badRequest('The cash-on-delivery money is not held any more');
  return tx.escrow.update({ where: { id: escrow.id }, data: { status: 'RELEASED', releasedAt: new Date() } });
}

// Called by Parcels when the receiver refuses: the money goes back to the receiver
export async function refundEscrowForParcel(tx: Tx, parcelId: string) {
  const escrow = await tx.escrow.findUnique({ where: { parcelId } });
  if (!escrow || escrow.status !== 'HELD') return null;
  await tx.payment.update({ where: { id: escrow.paymentId }, data: { status: 'REFUNDED' } });
  return tx.escrow.update({ where: { id: escrow.id }, data: { status: 'REFUNDED' } });
}

// Called by Fleet (fuel, repairs) and HR (salaries)
export async function recordExpense(
  _tx: Tx,
  _input: { agencyId: string; category: 'FUEL' | 'MAINTENANCE' | 'SALARY' | 'OTHER'; amount: number; description: string; recordedById: string; busId?: string; branchId?: string },
): Promise<unknown> {
  throw notImplemented('Record an expense');
}
