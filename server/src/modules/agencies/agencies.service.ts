import type { AgencyRegistered, PendingAgency } from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { queueEmail } from '../../lib/email';
import { applicationReceivedEmail, rejectedEmail, verifiedEmail } from './agencies.emails';
import { badRequest, conflict, notFound } from '../../lib/http-error';
import { hashPassword, publicUser } from '../auth/auth.service';
import type { RegisterAgencyInput } from './agencies.schemas';

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

// ─────────────── TransitPro team (PLATFORM_ADMIN) ───────────────

export async function listPending(): Promise<PendingAgency[]> {
  const rows = await prisma.agency.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' }, // oldest request first
    include: {
      documents: { select: { type: true } },
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
    owner: a.users[0] ?? null,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function approve(id: string) {
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw notFound('Agency');
  if (agency.status === 'APPROVED') throw badRequest('This agency is already approved');

  const updated = await prisma.agency.update({
    where: { id },
    data: { status: 'APPROVED', verifiedAt: new Date(), rejectionReason: null },
    select: { id: true, name: true, slug: true, status: true },
  });
  queueEmail(verifiedEmail(agency));
  return updated;
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
