import { z } from 'zod';

export const registerParcelSchema = z.object({
  destinationBranchId: z.string().min(1),
  senderName: z.string().trim().min(2),
  senderPhone: z.string().trim().min(9),
  receiverName: z.string().trim().min(2),
  receiverPhone: z.string().trim().min(9),
  declaredContents: z.string().trim().min(2),
  declaredValue: z.number().int().nonnegative(),
  weightKg: z.number().positive(),
  sealNumber: z.string().trim().min(1),
  photoUrls: z.array(z.string().url()).min(1, 'Take at least one photo of the contents before sealing'),
  homeDelivery: z.boolean().default(false),
  deliveryAddress: z.string().trim().optional(),
  insured: z.boolean().default(false),
  codAmount: z.number().int().positive().optional(),
  paymentMethod: z.enum(['MTN_MOMO', 'ORANGE_MONEY', 'CASH']),
});

// One scan = one handover in the chain of custody
export const scanSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('LOADED'), tripId: z.string().min(1) }),
  z.object({ type: z.literal('DEPARTED') }),
  z.object({ type: z.literal('ARRIVED'), weightKg: z.number().positive() }),
  z.object({ type: z.literal('HANDED_TO_COURIER'), courierId: z.string().min(1) }),
]);

export const deliverSchema = z.object({
  otp: z.string().regex(/^\d{4}$/, 'The code has 4 digits'),
  photoUrl: z.string().url(),
  lat: z.number(),
  lng: z.number(),
});

export const refuseSchema = z.object({
  reason: z.string().trim().min(3),
});

export const idParam = z.object({ id: z.string().min(1) });
export const codeParam = z.object({ code: z.string().min(1) });

export type RegisterParcelInput = z.infer<typeof registerParcelSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
export type DeliverInput = z.infer<typeof deliverSchema>;
