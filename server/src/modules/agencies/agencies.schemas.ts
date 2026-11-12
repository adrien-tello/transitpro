import { z } from 'zod';
import { emailSchema, passwordSchema, phoneSchema } from '../auth/auth.schemas';

// Web · "Register your agency". The owner creates the agency and their own account in one step.
// The agency stays PENDING until the TransitPro team checks its documents.
export const registerAgencySchema = z.object({
  agency: z.object({
    name: z.string().trim().min(2).max(100),
    headOffice: z.string().trim().min(2).max(200), // "Douala, Akwa"
    phone: phoneSchema,
    email: emailSchema,
    rccmNumber: z.string().trim().max(50).optional(),
    niuNumber: z.string().trim().max(50).optional(),
  }),
  owner: z.object({
    fullName: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
  }),
});

export const agencyIdParams = z.object({ id: z.string().min(1).max(40) });

export const rejectAgencySchema = z.object({
  reason: z.string().trim().min(5, 'Tell the agency why (5 characters minimum)').max(500),
});

export const branchSchema = z.object({
  name: z.string().trim().min(2).max(60), // "Akwa"
  city: z.string().trim().min(2).max(60), // "Douala"
  address: z.string().trim().min(3).max(200),
});

export const payoutAccountSchema = z.object({
  name: z.string().trim().min(2, 'Name on the Mobile Money account').max(80),
  phone: phoneSchema,
  channel: z.enum(['cm.mtn', 'cm.orange']),
});

export const documentTypeParams = z.object({ type: z.enum(['RCCM', 'NIU', 'OWNER_CNI_FRONT', 'OWNER_CNI_BACK', 'TRANSPORT_LICENCE']) });

export const adminListQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminPaymentsQuery = z.object({
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED']).optional(),
  method: z.enum(['MTN_MOMO', 'ORANGE_MONEY', 'CASH']).optional(),
  purpose: z.enum(['TICKET', 'PARCEL_FEE', 'COD_COLLECTION', 'SUBSCRIPTION']).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type RegisterAgencyInput = z.infer<typeof registerAgencySchema>;
