import type { Prisma } from '@prisma/client';
import { badRequest, notImplemented } from '../../lib/http-error';

// Owner: Sweet (Finance & Reporting).
//
// Other modules NEVER write Payment / Escrow / Expense rows themselves. They call
// these functions. That is how a sale in Booking or Parcels "posts to Finance".
// Each function takes the caller's transaction client (tx) so the payment is saved
// in the same database transaction as the ticket or parcel.
//
// holdInEscrow, releaseEscrowForParcel and refundEscrowForParcel were built by the Lead for
// the Parcels module (Nov 2026). Sweet: keep their signatures, extend them freely.

export type Tx = Prisma.TransactionClient;

// Taking money (cash or Mobile Money) is in modules/payments/payments.service.ts:
//   payments.create(tx, {...}) inside the module's transaction, then payments.start(id) after it.

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
