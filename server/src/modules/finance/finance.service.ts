import type { PaymentMethod, PaymentPurpose, Prisma } from '@prisma/client';
import { notImplemented } from '../../lib/http-error';

// Owner: Sweet (Finance & Reporting). Structure only, not built yet.
//
// Other modules NEVER write Payment / Escrow / Expense rows themselves. They call
// these functions. That is how a sale in Booking or Parcels "posts to Finance".
// Each function takes the caller's transaction client (tx) so the payment is saved
// in the same database transaction as the ticket or parcel.

export type Tx = Prisma.TransactionClient;

export interface RecordPaymentInput {
  agencyId: string;
  payerId?: string;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  amount: number;
  platformFee: number;
}

// Cash = SUCCEEDED at once. MoMo / OM = PENDING until the provider webhook confirms.
export async function recordPayment(_tx: Tx, _input: RecordPaymentInput): Promise<unknown> {
  throw notImplemented('Record a payment');
}

// Cash on delivery: money held by the platform until the receiver confirms
export async function holdInEscrow(
  _tx: Tx,
  _input: { paymentId: string; parcelId: string; amount: number; beneficiaryPhone: string },
): Promise<unknown> {
  throw notImplemented('Hold money in escrow');
}

// Called by Parcels when the receiver's code is correct
export async function releaseEscrowForParcel(_tx: Tx, _parcelId: string): Promise<unknown> {
  throw notImplemented('Release escrow');
}

// Called by Fleet (fuel, repairs) and HR (salaries)
export async function recordExpense(
  _tx: Tx,
  _input: { agencyId: string; category: 'FUEL' | 'MAINTENANCE' | 'SALARY' | 'OTHER'; amount: number; description: string; recordedById: string; busId?: string; branchId?: string },
): Promise<unknown> {
  throw notImplemented('Record an expense');
}
