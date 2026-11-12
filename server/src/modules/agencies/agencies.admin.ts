import type { AgencyStatus, PaymentMethod, PaymentPurpose, PaymentStatus, Prisma } from '@prisma/client';
import type { AdminAgencyDetail, AdminAgencyRow, AdminPaymentRow, Paginated, PayoutChannel } from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { queueEmail } from '../../lib/email';
import { badRequest, notFound } from '../../lib/http-error';
import { balanceOf } from '../payouts/payouts.service';
import { toView as documentView } from './agencies.documents';
import { reactivatedEmail, suspendedEmail } from './agencies.emails';

// Owner: Lead (Fanyi Charllson). TransitPro team screens: All agencies, agency detail, Payments.

const rowInclude = {
  _count: { select: { branches: true, employees: true, parcels: true, documents: true } },
} satisfies Prisma.AgencyInclude;

type RowSource = Prisma.AgencyGetPayload<{ include: typeof rowInclude }>;

const toRow = (a: RowSource): AdminAgencyRow => ({
  id: a.id,
  name: a.name,
  slug: a.slug,
  status: a.status,
  headOffice: a.headOffice,
  phone: a.phone,
  email: a.email,
  createdAt: a.createdAt.toISOString(),
  verifiedAt: a.verifiedAt ? a.verifiedAt.toISOString() : null,
  branches: a._count.branches,
  staff: a._count.employees,
  parcels: a._count.parcels,
  documents: a._count.documents,
});

export async function list(q: { status?: AgencyStatus; q?: string; page: number; limit: number }): Promise<Paginated<AdminAgencyRow>> {
  const where: Prisma.AgencyWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { headOffice: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.agency.findMany({ where, include: rowInclude, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
    prisma.agency.count({ where }),
  ]);
  return { items: items.map(toRow), page: q.page, limit: q.limit, total };
}

export async function detail(id: string): Promise<AdminAgencyDetail> {
  const a = await prisma.agency.findUnique({
    where: { id },
    include: {
      ...rowInclude,
      documents: { orderBy: { uploadedAt: 'asc' } },
      users: { where: { role: 'AGENCY_OWNER' }, select: { fullName: true, email: true, phone: true }, take: 1 },
    },
  });
  if (!a) throw notFound('Agency');
  return {
    ...toRow(a),
    rccmNumber: a.rccmNumber,
    niuNumber: a.niuNumber,
    rejectionReason: a.rejectionReason,
    suspensionReason: a.suspensionReason,
    owner: a.users[0] ?? null,
    documents: a.documents.map(documentView),
    payoutAccount:
      a.payoutName && a.payoutPhone && a.payoutChannel ? { name: a.payoutName, phone: a.payoutPhone, channel: a.payoutChannel as PayoutChannel } : null,
    balance: await balanceOf(a.id),
  };
}

// Suspended: its staff are blocked at once (every request checks the agency status), customers stop seeing it.
// Money already owed to it can still be paid out.
export async function suspend(id: string, reason: string) {
  const a = await prisma.agency.findUnique({ where: { id } });
  if (!a) throw notFound('Agency');
  if (a.status !== 'APPROVED') throw badRequest('Only a verified agency can be suspended');
  const updated = await prisma.agency.update({ where: { id }, data: { status: 'SUSPENDED', suspensionReason: reason }, select: { id: true, name: true, slug: true, status: true } });
  queueEmail(suspendedEmail(a, reason));
  return updated;
}

export async function reactivate(id: string) {
  const a = await prisma.agency.findUnique({ where: { id } });
  if (!a) throw notFound('Agency');
  if (a.status !== 'SUSPENDED') throw badRequest('This agency is not suspended');
  const updated = await prisma.agency.update({ where: { id }, data: { status: 'APPROVED', suspensionReason: null }, select: { id: true, name: true, slug: true, status: true } });
  queueEmail(reactivatedEmail(a));
  return updated;
}

// ─── Payments of the whole platform ───

export async function payments(q: {
  status?: PaymentStatus;
  method?: PaymentMethod;
  purpose?: PaymentPurpose;
  q?: string;
  page: number;
  limit: number;
}): Promise<Paginated<AdminPaymentRow>> {
  const where: Prisma.PaymentWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.method ? { method: q.method } : {}),
    ...(q.purpose ? { purpose: q.purpose } : {}),
    ...(q.q
      ? {
          OR: [
            { providerRef: { contains: q.q } },
            { payerPhone: { contains: q.q.replace(/\s/g, '') } },
            { parcel: { trackingCode: { contains: q.q.toUpperCase() } } },
            { agency: { name: { contains: q.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { agency: { select: { name: true } }, parcel: { select: { trackingCode: true } } },
    }),
    prisma.payment.count({ where }),
  ]);
  return {
    items: items.map((p) => ({
      id: p.id,
      createdAt: p.createdAt.toISOString(),
      settledAt: p.settledAt ? p.settledAt.toISOString() : null,
      agencyName: p.agency?.name ?? null,
      purpose: p.purpose,
      method: p.method,
      amount: p.amount,
      platformFee: p.platformFee,
      status: p.status,
      failureReason: p.failureReason,
      providerRef: p.providerRef,
      payerPhone: p.payerPhone,
      parcelCode: p.parcel?.trackingCode ?? null,
    })),
    page: q.page,
    limit: q.limit,
    total,
  };
}
