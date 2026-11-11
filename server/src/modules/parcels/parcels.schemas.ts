import { z } from 'zod';
import { emailSchema, phoneSchema } from '../auth/auth.schemas';

const optionalEmail = emailSchema.optional();
const money = z.number().int().nonnegative();

// Web · Register a parcel (counter agent)
export const registerParcelSchema = z
  .object({
    // Only for an owner / manager without a branch; a counter agent always registers at their own branch
    originBranchId: z.string().min(1).optional(),
    destinationBranchId: z.string().min(1),
    senderName: z.string().trim().min(2).max(100),
    senderPhone: phoneSchema,
    senderEmail: optionalEmail,
    receiverName: z.string().trim().min(2).max(100),
    receiverPhone: phoneSchema,
    receiverEmail: optionalEmail,
    declaredContents: z.string().trim().min(2).max(300),
    declaredValue: money,
    weightKg: z.number().positive().max(500),
    sealNumber: z.string().trim().min(1).max(40),
    photoUrls: z.array(z.string().url()).min(1, 'Take at least one photo of the contents before sealing').max(6),
    homeDelivery: z.boolean().default(false),
    deliveryAddress: z.string().trim().max(300).optional(),
    insured: z.boolean().default(false),
    codAmount: z.number().int().positive().optional(),
    paymentMethod: z.enum(['MTN_MOMO', 'ORANGE_MONEY', 'CASH']),
    // Mobile Money number that pays the fee (default: the sender's phone)
    payerPhone: phoneSchema.optional(),
  })
  .refine((v) => !v.homeDelivery || (v.deliveryAddress !== undefined && v.deliveryAddress.length >= 5), {
    message: 'Give the delivery address for a home delivery',
    path: ['deliveryAddress'],
  });

// One scan = one handover in the chain of custody
export const scanSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('LOADED'), tripId: z.string().min(1) }),
  z.object({ type: z.literal('DEPARTED') }),
  z.object({ type: z.literal('ARRIVED'), weightKg: z.number().positive().max(500) }),
  z.object({ type: z.literal('HANDED_TO_COURIER'), courierId: z.string().min(1) }),
]);

// Cash on delivery: the receiver pays before taking the parcel; the money is held in escrow
export const codPaymentSchema = z.object({
  method: z.enum(['MTN_MOMO', 'ORANGE_MONEY', 'CASH']),
  payerPhone: phoneSchema.optional(), // Mobile Money number of the receiver (default: receiver's phone)
});

// The fee payment failed (refused, no answer...): try again, maybe another number or cash
export const feePaymentSchema = codPaymentSchema;

// Courier: code + photo + GPS are required (checked in the service). Counter pickup: code only.
export const deliverSchema = z.object({
  otp: z.string().trim().regex(/^\d{4}$/, 'The code has 4 digits'),
  photoUrl: z.string().url().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const refuseSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const listQuery = z.object({
  status: z
    .enum(['REGISTERED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD', 'REFUSED', 'RETURNED'])
    .optional(),
  q: z.string().trim().max(60).optional(), // tracking code, sender or receiver phone
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// :id accepts the database id or the tracking code read from the QR label (TP-DLA-7K2Q9)
export const idParam = z.object({ id: z.string().trim().min(1).max(40) });
export const codeParam = z.object({ code: z.string().trim().toUpperCase().min(5).max(20) });

export type RegisterParcelInput = z.infer<typeof registerParcelSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
export type DeliverInput = z.infer<typeof deliverSchema>;
export type ListQuery = z.infer<typeof listQuery>;
