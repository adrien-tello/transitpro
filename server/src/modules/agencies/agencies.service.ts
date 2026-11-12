import type { AgencyRegistered, BranchRow, PendingAgency, PlatformOverview } from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { queueEmail } from '../../lib/email';
import { applicationReceivedEmail, rejectedEmail, verifiedEmail } from './agencies.emails';
import { badRequest, conflict, notFound } from '../../lib/http-error';
import { hashPassword, publicUser } from '../auth/auth.service';
import type { RegisterAgencyInput } from './agencies.schemas';
import { agenciesToPay } from '../payouts/payouts.service';
import { env } from '../../config/env';

// Owner: Lead (Fanyi Charllson). SaaS layer: agency sign-up and verification.

// "Étoile Voyages" → "etoile-voyages" (used in the public profile URL)
function slugify(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'agency'
  );
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.agency.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

// Agency (PENDING) + owner account + owner's Employee row, all or nothing
export async function registerAgency(input: RegisterAgencyInput): Promise<AgencyRegistered & { tokenVersion: number }> {
  const { agency, owner } = input;
  const taken = await prisma.user.findFirst({ where: { OR: [{ email: owner.email }, { phone: owner.phone }] } });
  if (taken) throw conflict('An account with this email or phone already exists. Log in, or use another email.');

  const passwordHash = await hashPassword(owner.password);
  const slug = await uniqueSlug(agency.name);

  const created = await prisma.$transaction(async (tx) => {
    const a = await tx.agency.create({
      data: { ...agency, slug, status: 'PENDING' },
      select: { id: true, name: true, slug: true, status: true },
    });
    const user = await tx.user.create({
      data: {
        fullName: owner.fullName,
        email: owner.email,
        phone: owner.phone,
        passwordHash,
        role: 'AGENCY_OWNER',
        agencyId: a.id,
        employee: { create: { agencyId: a.id, jobTitle: 'Owner' } },
      },
    });
    return { agency: a, user };
  });

  queueEmail(applicationReceivedEmail(created.agency.name, created.user));
  return { user: publicUser(created.user), agency: created.agency, tokenVersion: created.user.tokenVersion };
}

// ─────────────── Branches ───────────────

export async function listBranches(agencyId: string): Promise<BranchRow[]> {
  return prisma.branch.findMany({
    where: { agencyId },
    select: { id: true, name: true, city: true, address: true },
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
  });
}

export async function addBranch(agencyId: string, input: { name: string; city: string; address: string }): Promise<BranchRow> {
  const exists = await prisma.branch.findFirst({ where: { agencyId, name: input.name }, select: { id: true } });
  if (exists) throw conflict(`A branch called ${input.name} already exists`);
  return prisma.branch.create({ data: { agencyId, ...input }, select: { id: true, name: true, city: true, address: true } });
}

// ─────────────── TransitPro team (PLATFORM_ADMIN) ───────────────

export async function listPending(): Promise<PendingAgency[]> {
  const rows = await prisma.agency.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' }, // oldest request first
    include: {
      documents: { select: { id: true, type: true, mime: true, uploadedAt: true } },
      users: { where: { role: 'AGENCY_OWNER' }, select: { fullName: true, email: true, phone: true }, take: 1 },
    },
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    headOffice: a.headOffice,
    phone: a.phone,
    email: a.email,
    rccmNumber: a.rccmNumber,
    niuNumber: a.niuNumber,
    documentTypes: a.documents.map((d) => d.type),
    documents: a.documents.map((d) => ({ id: d.id, type: d.type, mime: d.mime, uploadedAt: d.uploadedAt.toISOString() })),
    owner: a.users[0] ?? null,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function approve(id: string) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw notFound('Agency');
  if (agency.status === 'APPROVED') throw badRequest('This agency is already approved');

  const [updated] = await prisma.$transaction([
    prisma.agency.update({
      where: { id },
      data: { status: 'APPROVED', verifiedAt: new Date(), rejectionReason: null },
      select: { id: true, name: true, slug: true, status: true },
    }),
    // The documents the team looked at are the verified ones (a later upload resets its flag)
    prisma.agencyDocument.updateMany({ where: { agencyId: id }, data: { verified: true } }),
  ]);
  queueEmail(verifiedEmail(agency));
  return updated;
}

// A rejected agency fixes its documents, then asks to be checked again: back to PENDING (the team sees it in the list)
export async function resubmit(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw notFound('Agency');
  if (agency.status !== 'REJECTED') throw badRequest('Only a rejected agency can ask for a new check');
  return prisma.agency.update({ where: { id: agencyId }, data: { status: 'PENDING' }, select: { id: true, name: true, slug: true, status: true } });
}

export async function reject(id: string, reason: string) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw notFound('Agency');
  if (agency.status !== 'PENDING') throw badRequest('Only an agency waiting for verification can be rejected');

  const updated = await prisma.agency.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason },
    select: { id: true, name: true, slug: true, status: true },
  });
  queueEmail(rejectedEmail(agency, reason));
  return updated;
}

// TransitPro team overview: agencies, parcels and money across the whole platform, last 7 days.
// "volume" = every successful payment (tickets, parcel fees, cash on delivery); "commission" = our platformFee share.
const DOUALA_MS = 3600_000; // UTC+1 all year
const dayKey = (d: Date) => new Date(d.getTime() + DOUALA_MS).toISOString().slice(0, 10);

// Our commission on every successful sale (tickets + parcel fees), what we owe agencies, what we sent them
async function platformMoney(): Promise<PlatformOverview['money']> {
  const [commission, paidOut, owed] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED', purpose: { in: ['TICKET', 'PARCEL_FEE'] } }, _sum: { platformFee: true } }),
    prisma.payout.aggregate({ where: { kind: 'AGENCY_PAYOUT', status: 'SUCCEEDED' }, _sum: { amount: true } }),
    agenciesToPay(),
  ]);
  return {
    commissionAllTime: commission._sum.platformFee ?? 0,
    owedToAgencies: owed.reduce((n, a) => n + a.balance.available, 0),
    paidOutAllTime: paidOut._sum.amount ?? 0,
    minimumPayout: env.PAYOUT_MINIMUM,
  };
}

export async function overview(): Promise<PlatformOverview> {
  const today = dayKey(new Date());
  const start = new Date(Date.parse(`${today}T00:00:00+01:00`) - 6 * 86_400_000);
  const [byStatus, parcelsTotal, inTransit, onHold, delivered, paid, failed, signups, latest] = await Promise.all([
    prisma.agency.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.parcel.count(),
    prisma.parcel.count({ where: { status: { in: ['LOADED', 'IN_TRANSIT'] } } }),
    prisma.parcel.count({ where: { status: 'ON_HOLD' } }),
    prisma.parcel.count({ where: { status: 'DELIVERED', deliveredAt: { gte: start } } }),
    prisma.payment.findMany({ where: { status: 'SUCCEEDED', settledAt: { gte: start } }, select: { amount: true, platformFee: true, settledAt: true } }),
    prisma.payment.count({ where: { status: 'FAILED', createdAt: { gte: start } } }),
    prisma.agency.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.agency.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: { id: true, name: true, headOffice: true, status: true, createdAt: true } }),
  ]);
  const count = (st: string) => byStatus.find((g) => g.status === st)?._count._all ?? 0;
  const days = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(start.getTime() + i * 86_400_000 + 12 * 3600_000)), volume: 0, commission: 0, signups: 0 }));
  const byDay = new Map(days.map((d) => [d.date, d]));
  for (const p of paid) {
    const d = p.settledAt && byDay.get(dayKey(p.settledAt));
    if (d) {
      d.volume += p.amount;
      d.commission += p.platformFee;
    }
  }
  for (const a of signups) {
    const d = byDay.get(dayKey(a.createdAt));
    if (d) d.signups++;
  }
  return {
    agencies: { pending: count('PENDING'), approved: count('APPROVED'), rejected: count('REJECTED'), suspended: count('SUSPENDED') },
    parcels: { total: parcelsTotal, inTransit, onHold, deliveredThisWeek: delivered },
    days,
    week: {
      volume: days.reduce((n, d) => n + d.volume, 0),
      commission: days.reduce((n, d) => n + d.commission, 0),
      payments: paid.length,
      failed,
    },
    latestAgencies: latest.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    money: await platformMoney(),
  };
}
