import type { Prisma, ParcelStatus, Role } from '@prisma/client';
import type {
  ParcelDetail,
  ParcelHoldReleased,
  ParcelAlert,
  ParcelDay,
  ParcelListItem,
  ParcelRegistered,
  ParcelStats,
  ParcelTracking,
  Paginated,
  StaffRef,
} from '@contracts/api-types';
import { prisma } from '../../lib/prisma';
import { deliveryOtp, matchesHash, sha256, trackingCode } from '../../lib/codes';
import { queueEmail } from '../../lib/email';
import { HttpError, badRequest, conflict, forbidden, notFound } from '../../lib/http-error';
import * as finance from '../finance/finance.service';
import * as payments from '../payments/payments.service';
import { deliveredEmail, deliveryCodeEmail } from './parcels.emails';
import { priceParcel } from './parcels.pricing';
import type { DeliverInput, ListQuery, RegisterParcelInput, ScanInput } from './parcels.schemas';

// Owner: Lead (Fanyi Charllson). Parcels & Courier: the module that answers the lecturer's questions.
//
//   Tracking ............ every handover is a new ParcelEvent row (who, when, where). Never edited or deleted.
//   Delivery guy ........ Parcel.currentHolderId always names ONE employee. Only the holder delivers.
//   Not tampered ........ photos + seal number + weight at registration; weighed again on ARRIVED:
//                         more than 0.1 kg of difference puts the parcel ON_HOLD for the branch manager.
//   Delivery code ....... 4 digits made at registration, printed on the SENDER's receipt (never on the label),
//                         emailed if an address was given. Only its SHA-256 hash is stored. 5 wrong tries = ON_HOLD.
//   Payment received .... cash on delivery: the receiver pays first, the money is HELD in escrow, RELEASED to the
//                         sender only with the right code, REFUNDED to the receiver if the parcel is refused.

const MAX_ATTEMPTS = 5;
const WEIGHT_TOLERANCE_KG = 0.1;
const CODE_VALID_DAYS = 30;
const FINAL: ParcelStatus[] = ['DELIVERED', 'REFUSED', 'RETURNED'];

export interface StaffContext {
  agencyId: string;
  employeeId: string;
}

interface Staff {
  id: string;
  userId: string;
  role: Role;
  branchId: string | null;
  name: string;
}

// ─────────────── helpers ───────────────

async function loadStaff(ctx: StaffContext): Promise<Staff> {
  const e = await prisma.employee.findUnique({
    where: { id: ctx.employeeId },
    select: { id: true, agencyId: true, branchId: true, active: true, user: { select: { id: true, role: true, fullName: true } } },
  });
  if (!e || e.agencyId !== ctx.agencyId || !e.active) throw forbidden('This staff account cannot handle parcels');
  return { id: e.id, userId: e.user.id, role: e.user.role, branchId: e.branchId, name: e.user.fullName };
}

const isOwner = (s: Staff) => s.role === 'AGENCY_OWNER';
// An owner works everywhere in the agency; everyone else only at their own branch
const worksAt = (s: Staff, branchId: string) => isOwner(s) || s.branchId === branchId;

function needRole(s: Staff, roles: Role[], action: string) {
  if (!isOwner(s) && !roles.includes(s.role)) throw forbidden(`Your role cannot ${action}`);
}

const staffSelect = { select: { id: true, jobTitle: true, user: { select: { fullName: true } } } } as const;
const branchSelect = { select: { id: true, name: true, city: true } } as const;

const detailInclude = {
  originBranch: branchSelect,
  destinationBranch: branchSelect,
  currentHolder: staffSelect,
  courier: staffSelect,
  registeredBy: staffSelect,
  trip: { select: { id: true, departureAt: true, status: true } },
  events: { orderBy: { createdAt: 'asc' }, include: { actor: staffSelect, branch: branchSelect } },
  claims: { orderBy: { createdAt: 'desc' } },
  escrow: true,
  payments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ParcelInclude;

type ParcelFull = Prisma.ParcelGetPayload<{ include: typeof detailInclude }>;
type StaffRow = { id: string; jobTitle: string; user: { fullName: string } };

const staffRef = (e: StaffRow): StaffRef => ({ id: e.id, name: e.user.fullName, jobTitle: e.jobTitle });
const place = (b: { name: string; city: string }) => ({ city: b.city, branch: b.name });
const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toListItem(p: Omit<ParcelFull, 'events' | 'claims' | 'escrow' | 'payments' | 'courier' | 'registeredBy' | 'trip'>): ParcelListItem {
  return {
    id: p.id,
    trackingCode: p.trackingCode,
    status: p.status,
    from: place(p.originBranch),
    to: place(p.destinationBranch),
    senderName: p.senderName,
    receiverName: p.receiverName,
    weightKg: p.weightAtRegistrationKg,
    homeDelivery: p.homeDelivery,
    codAmount: p.codAmount,
    currentHolder: p.currentHolder ? staffRef(p.currentHolder) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toDetail(p: ParcelFull): ParcelDetail {
  const diff = p.weightAtArrivalKg == null ? null : Math.round(Math.abs(p.weightAtArrivalKg - p.weightAtRegistrationKg) * 1000) / 1000;
  return {
    ...toListItem(p),
    sender: { name: p.senderName, phone: p.senderPhone, email: p.senderEmail },
    receiver: { name: p.receiverName, phone: p.receiverPhone, email: p.receiverEmail },
    declaredContents: p.declaredContents,
    declaredValue: p.declaredValue,
    deliveryAddress: p.deliveryAddress,
    insured: p.insured,
    price: { fee: p.fee, insuranceFee: p.insuranceFee, total: p.fee + p.insuranceFee },
    security: {
      sealNumber: p.sealNumber,
      photoUrls: p.photoUrls,
      weightAtRegistrationKg: p.weightAtRegistrationKg,
      weightAtArrivalKg: p.weightAtArrivalKg,
      weightDifferenceKg: diff,
      weightOk: diff == null ? null : diff <= WEIGHT_TOLERANCE_KG,
      deliveryAttempts: p.deliveryAttempts,
      maxAttempts: MAX_ATTEMPTS,
      codeExpiresAt: iso(p.deliveryOtpExpiresAt),
    },
    trip: p.trip ? { id: p.trip.id, departureAt: p.trip.departureAt.toISOString(), status: p.trip.status } : null,
    courier: p.courier ? staffRef(p.courier) : null,
    registeredBy: staffRef(p.registeredBy),
    delivery: { deliveredAt: iso(p.deliveredAt), photoUrl: p.deliveryPhotoUrl, lat: p.deliveryLat, lng: p.deliveryLng },
    events: p.events.map((ev) => ({
      type: ev.type,
      at: ev.createdAt.toISOString(),
      by: staffRef(ev.actor),
      branch: ev.branch ? place(ev.branch) : null,
      weightKg: ev.weightKg,
      lat: ev.lat,
      lng: ev.lng,
      note: ev.note,
    })),
    payments: p.payments.map(payments.toView),
    escrow: p.escrow
      ? { amount: p.escrow.amount, status: p.escrow.status, beneficiaryPhone: p.escrow.beneficiaryPhone, releasedAt: iso(p.escrow.releasedAt) }
      : null,
    claims: p.claims.map((c) => ({ id: c.id, reason: c.reason, status: c.status, amountPaid: c.amountPaid, createdAt: c.createdAt.toISOString() })),
  };
}

// :id is the database id or the tracking code read from the QR label.
// A parcel of another agency answers 404, never 403 (its existence is not revealed).
async function findParcel(idOrCode: string, agencyId: string): Promise<ParcelFull> {
  const parcel = await prisma.parcel.findFirst({
    where: { agencyId, OR: [{ id: idOrCode }, { trackingCode: idOrCode.toUpperCase() }] },
    include: detailInclude,
  });
  if (!parcel) throw notFound('Parcel');
  return parcel;
}

const reload = async (id: string) => toDetail(await prisma.parcel.findUniqueOrThrow({ where: { id }, include: detailInclude }));

// Moves the parcel only if nobody changed it in the meantime (two scans at the same second)
async function moveFrom(tx: finance.Tx, id: string, from: ParcelStatus, data: Prisma.ParcelUncheckedUpdateManyInput) {
  const { count } = await tx.parcel.updateMany({ where: { id, status: from }, data });
  if (count !== 1) throw conflict('This parcel was just updated by someone else, refresh and try again');
}

function onHoldError() {
  return badRequest('This parcel is ON HOLD: the branch manager must check it before anything else');
}

function newDeliveryCode() {
  const code = deliveryOtp();
  return { code, hash: sha256(code), expiresAt: new Date(Date.now() + CODE_VALID_DAYS * 24 * 3600 * 1000) };
}

function parcelInfo(p: ParcelFull) {
  return {
    trackingCode: p.trackingCode,
    receiverName: p.receiverName,
    senderName: p.senderName,
    sealNumber: p.sealNumber,
    from: p.originBranch.city,
    to: p.destinationBranch.city,
  };
}

function emailDeliveryCode(p: ParcelFull, code: string) {
  const info = parcelInfo(p);
  if (p.receiverEmail) queueEmail(deliveryCodeEmail(p.receiverEmail, p.receiverName, info, code, CODE_VALID_DAYS));
  if (p.senderEmail) queueEmail(deliveryCodeEmail(p.senderEmail, p.senderName, info, code, CODE_VALID_DAYS));
}

// ─────────────── Register ───────────────

export async function registerParcel(input: RegisterParcelInput, ctx: StaffContext): Promise<ParcelRegistered> {
  const staff = await loadStaff(ctx);
  // A counter agent always registers at their own branch; an owner without a branch says which one
  const originBranchId = staff.branchId ?? input.originBranchId;
  if (!originBranchId) throw badRequest('Choose the branch where the parcel is registered (originBranchId)');
  if (originBranchId === input.destinationBranchId) throw badRequest('The destination must be another branch');

  const branches = await prisma.branch.findMany({
    where: { agencyId: ctx.agencyId, id: { in: [originBranchId, input.destinationBranchId] } },
    select: { id: true, city: true },
  });
  const origin = branches.find((b) => b.id === originBranchId);
  if (!origin || !branches.some((b) => b.id === input.destinationBranchId)) throw badRequest('Unknown branch for this agency');

  const sealUsed = await prisma.parcel.findFirst({ where: { agencyId: ctx.agencyId, sealNumber: input.sealNumber }, select: { id: true } });
  if (sealUsed) throw conflict(`Seal ${input.sealNumber} was already used on another parcel. Use a new seal.`);

  payments.assertMethodAvailable(input.paymentMethod);
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId }, select: { commissionRate: true } });
  const price = priceParcel(input);
  const delivery = newDeliveryCode();

  // Tracking codes are random: try again on the (rare) collision
  let created: { parcelId: string; paymentId: string; code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    const code = trackingCode(origin.city);
    if (await prisma.parcel.findUnique({ where: { trackingCode: code }, select: { id: true } })) continue;

    created = await prisma.$transaction(async (tx) => {
      const parcel = await tx.parcel.create({
        data: {
          trackingCode: code,
          agencyId: ctx.agencyId,
          originBranchId,
          destinationBranchId: input.destinationBranchId,
          senderName: input.senderName,
          senderPhone: input.senderPhone,
          senderEmail: input.senderEmail,
          receiverName: input.receiverName,
          receiverPhone: input.receiverPhone,
          receiverEmail: input.receiverEmail,
          declaredContents: input.declaredContents,
          declaredValue: input.declaredValue,
          weightAtRegistrationKg: input.weightKg,
          sealNumber: input.sealNumber,
          photoUrls: input.photoUrls,
          homeDelivery: input.homeDelivery,
          deliveryAddress: input.homeDelivery ? input.deliveryAddress : null,
          insured: input.insured,
          fee: price.fee,
          insuranceFee: price.insuranceFee,
          codAmount: input.codAmount,
          status: 'REGISTERED',
          currentHolderId: staff.id,
          registeredById: staff.id,
          deliveryOtpHash: delivery.hash,
          deliveryOtpExpiresAt: delivery.expiresAt,
        },
      });
      await tx.parcelEvent.create({
        data: {
          parcelId: parcel.id,
          type: 'REGISTERED',
          actorId: staff.id,
          branchId: originBranchId,
          weightKg: input.weightKg,
          note: `Seal ${input.sealNumber}, ${input.photoUrls.length} photo(s)`,
        },
      });
      // The sender pays the fee (+ insurance) now; TransitPro keeps its commission.
      // Cash: paid at once. Mobile Money: PENDING until the sender approves on their phone.
      const payment = await payments.create(tx, {
        agencyId: ctx.agencyId,
        purpose: 'PARCEL_FEE',
        method: input.paymentMethod,
        amount: price.total,
        commissionRate: agency.commissionRate,
        payerPhone: input.paymentMethod === 'CASH' ? undefined : (input.payerPhone ?? input.senderPhone),
        parcelId: parcel.id,
      });
      return { parcelId: parcel.id, paymentId: payment.id, code };
    });
  }
  if (!created) throw new HttpError(503, 'TRY_AGAIN', 'Could not create a tracking code, please try again');

  // After the commit: send the Mobile Money prompt (no-op for cash)
  await payments.start(created.paymentId, `TransitPro parcel ${created.code}`, input.senderName);

  const full = await prisma.parcel.findUniqueOrThrow({ where: { id: created.parcelId }, include: detailInclude });
  emailDeliveryCode(full, delivery.code);
  return { parcel: toDetail(full), deliveryCode: delivery.code };
}

// The fee payment failed (refused, no answer, not enough money): try again, maybe cash or another number
export async function payFee(
  idOrCode: string,
  input: { method: 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH'; payerPhone?: string },
  ctx: StaffContext,
): Promise<ParcelDetail> {
  const staff = await loadStaff(ctx);
  needRole(staff, ['COUNTER_AGENT', 'BRANCH_MANAGER'], 'take parcel payments');
  const p = await findParcel(idOrCode, ctx.agencyId);
  if (!worksAt(staff, p.originBranchId)) throw forbidden('Take the fee at the branch where the parcel was registered');
  const fees = p.payments.filter((pay) => pay.purpose === 'PARCEL_FEE');
  if (fees.some((pay) => pay.status === 'SUCCEEDED')) throw conflict('The fee is already paid');
  if (fees.some((pay) => pay.status === 'PENDING')) throw conflict('A payment is waiting for approval on the phone, wait for its result');
  payments.assertMethodAvailable(input.method);
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: ctx.agencyId }, select: { commissionRate: true } });
  const payment = await prisma.$transaction((tx) =>
    payments.create(tx, {
      agencyId: ctx.agencyId,
      purpose: 'PARCEL_FEE',
      method: input.method,
      amount: p.fee + p.insuranceFee,
      commissionRate: agency.commissionRate,
      payerPhone: input.method === 'CASH' ? undefined : (input.payerPhone ?? p.senderPhone),
      parcelId: p.id,
    }),
  );
  await payments.start(payment.id, `TransitPro parcel ${p.trackingCode}`, p.senderName);
  return reload(p.id);
}

const feePaid = (p: ParcelFull) => p.payments.some((pay) => pay.purpose === 'PARCEL_FEE' && pay.status === 'SUCCEEDED');

// ─────────────── Read ───────────────

// Public: no names, phones, contents or photos
export async function track(code: string): Promise<ParcelTracking> {
  const p = await prisma.parcel.findUnique({
    where: { trackingCode: code.toUpperCase() },
    include: {
      originBranch: branchSelect,
      destinationBranch: branchSelect,
      events: { orderBy: { createdAt: 'asc' }, include: { branch: { select: { city: true } } } },
    },
  });
  if (!p) throw notFound('Parcel');
  return {
    trackingCode: p.trackingCode,
    status: p.status,
    from: place(p.originBranch),
    to: place(p.destinationBranch),
    homeDelivery: p.homeDelivery,
    sealNumber: p.sealNumber,
    photoCount: p.photoUrls.length,
    events: p.events
      .filter((e) => e.type !== 'DELIVERY_ATTEMPT') // wrong codes are not public
      .map((e) => ({ type: e.type, city: e.branch?.city ?? null, at: e.createdAt.toISOString() })),
  };
}

export async function getForAgency(idOrCode: string, agencyId: string): Promise<ParcelDetail> {
  return toDetail(await findParcel(idOrCode, agencyId));
}

// Staff app: a driver or courier reads a parcel only while they hold it (delivery screen: address, phone, payments)
export async function getForHolder(idOrCode: string, ctx: StaffContext): Promise<ParcelDetail> {
  const p = await findParcel(idOrCode, ctx.agencyId);
  if (p.currentHolderId !== ctx.employeeId) throw forbidden('You can only open the parcels you are carrying');
  return toDetail(p);
}

const listInclude = { originBranch: branchSelect, destinationBranch: branchSelect, currentHolder: staffSelect } satisfies Prisma.ParcelInclude;

// A counter agent / manager sees the parcels leaving from or arriving at their branch, the owner all
function branchScope(staff: Staff): Prisma.ParcelWhereInput {
  return staff.branchId && !isOwner(staff) ? { OR: [{ originBranchId: staff.branchId }, { destinationBranchId: staff.branchId }] } : {};
}

// Douala is UTC+1 all year (no summer time): a day starts at 23:00 UTC
const DOUALA_MS = 3600_000;
const dayKey = (d: Date) => new Date(d.getTime() + DOUALA_MS).toISOString().slice(0, 10);
const LATE_DELIVERY_HOURS = 8;

// Web dashboard: counters by status, the last 7 days (registered, fees paid) and what needs attention.
// Five queries in parallel: one round trip to the database.
export async function stats(ctx: StaffContext): Promise<ParcelStats> {
  const staff = await loadStaff(ctx);
  const scope: Prisma.ParcelWhereInput = { agencyId: ctx.agencyId, ...branchScope(staff) };
  const today = dayKey(new Date());
  const start = new Date(Date.parse(`${today}T00:00:00+01:00`) - 6 * 86_400_000);
  const lateBefore = new Date(Date.now() - LATE_DELIVERY_HOURS * 3600_000);

  const [grouped, created, paid, held, late, claims] = await Promise.all([
    prisma.parcel.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    prisma.parcel.findMany({ where: { ...scope, createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.payment.findMany({
      where: { purpose: 'PARCEL_FEE', status: 'SUCCEEDED', settledAt: { gte: start }, parcel: scope },
      select: { amount: true, settledAt: true },
    }),
    prisma.parcel.findMany({
      where: { ...scope, status: 'ON_HOLD' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { trackingCode: true, updatedAt: true, weightAtRegistrationKg: true, weightAtArrivalKg: true, deliveryAttempts: true },
    }),
    prisma.parcel.findMany({
      where: { ...scope, status: 'OUT_FOR_DELIVERY', updatedAt: { lt: lateBefore } },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: { trackingCode: true, updatedAt: true, courier: { select: { user: { select: { fullName: true } } } } },
    }),
    prisma.parcelClaim.findMany({
      where: { status: { in: ['OPEN', 'INVESTIGATING'] }, parcel: scope },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { reason: true, createdAt: true, parcel: { select: { trackingCode: true } } },
    }),
  ]);

  const byStatus = Object.fromEntries(
    (['REGISTERED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'ON_HOLD', 'REFUSED', 'RETURNED'] as ParcelStatus[]).map((st) => [st, 0]),
  ) as Record<ParcelStatus, number>;
  for (const g of grouped) byStatus[g.status] = g._count._all;

  const days: ParcelDay[] = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(new Date(start.getTime() + i * 86_400_000 + 12 * 3600_000)), registered: 0, revenue: 0 }));
  const byDay = new Map(days.map((d) => [d.date, d]));
  for (const c of created) {
    const d = byDay.get(dayKey(c.createdAt));
    if (d) d.registered++;
  }
  for (const p of paid) {
    const d = p.settledAt && byDay.get(dayKey(p.settledAt));
    if (d) d.revenue += p.amount;
  }

  const hours = (d: Date) => Math.max(1, Math.round((Date.now() - d.getTime()) / 3600_000));
  const alerts: ParcelAlert[] = [
    ...held.map((p) => ({
      trackingCode: p.trackingCode,
      kind: 'ON_HOLD' as const,
      text:
        p.weightAtArrivalKg != null && Math.abs(p.weightAtArrivalKg - p.weightAtRegistrationKg) > WEIGHT_TOLERANCE_KG
          ? `Weight ${p.weightAtRegistrationKg} kg at registration, ${p.weightAtArrivalKg} kg on arrival`
          : p.deliveryAttempts >= MAX_ATTEMPTS
            ? `${p.deliveryAttempts} wrong delivery codes`
            : 'On hold, waiting for the branch manager',
      at: p.updatedAt.toISOString(),
    })),
    ...claims.map((c) => ({ trackingCode: c.parcel.trackingCode, kind: 'CLAIM' as const, text: c.reason, at: c.createdAt.toISOString() })),
    ...late.map((p) => ({
      trackingCode: p.trackingCode,
      kind: 'LATE_DELIVERY' as const,
      text: `With courier ${p.courier?.user.fullName ?? '—'} for ${hours(p.updatedAt)} h`,
      at: p.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return { byStatus, days, alerts };
}

// Web list (same branch rule as above)
export async function list(query: ListQuery, ctx: StaffContext): Promise<Paginated<ParcelListItem>> {
  const staff = await loadStaff(ctx);
  const where: Prisma.ParcelWhereInput = {
    agencyId: ctx.agencyId,
    ...(query.status ? { status: query.status } : {}),
    ...branchScope(staff),
    ...(query.q
      ? {
          AND: [
            {
              OR: [
                { trackingCode: { contains: query.q.toUpperCase() } },
                { senderPhone: { contains: query.q.replace(/\s/g, '') } },
                { receiverPhone: { contains: query.q.replace(/\s/g, '') } },
              ],
            },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.parcel.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.parcel.count({ where }),
  ]);
  return { items: items.map(toListItem), page: query.page, limit: query.limit, total };
}

// Staff app: the parcels this driver / courier is responsible for right now
export async function mine(ctx: StaffContext): Promise<ParcelListItem[]> {
  const items = await prisma.parcel.findMany({
    where: { agencyId: ctx.agencyId, currentHolderId: ctx.employeeId, status: { notIn: FINAL } },
    include: listInclude,
    orderBy: { updatedAt: 'desc' },
  });
  return items.map(toListItem);
}

// ─────────────── Scans: one handover = one event ───────────────

export async function scan(idOrCode: string, input: ScanInput, ctx: StaffContext): Promise<ParcelDetail> {
  const staff = await loadStaff(ctx);
  const p = await findParcel(idOrCode, ctx.agencyId);
  if (p.status === 'ON_HOLD') throw onHoldError();
  if (FINAL.includes(p.status)) throw badRequest(`This parcel is already ${p.status.toLowerCase()}`);

  switch (input.type) {
    case 'LOADED': {
      needRole(staff, ['COUNTER_AGENT', 'BRANCH_MANAGER', 'DRIVER'], 'load parcels');
      if (p.status !== 'REGISTERED') throw badRequest(`Only a registered parcel can be loaded (it is ${p.status})`);
      // A parcel travels only once its fee is paid (Mobile Money still waiting, or failed: no bus)
      if (!feePaid(p)) throw badRequest('The parcel fee is not paid yet: wait for the Mobile Money approval or take the payment again');
      const trip = await prisma.trip.findFirst({
        where: { id: input.tripId, agencyId: ctx.agencyId },
        select: { id: true, status: true, driverId: true, originBranchId: true, destinationBranchId: true },
      });
      if (!trip) throw notFound('Trip');
      if (!['SCHEDULED', 'BOARDING'].includes(trip.status)) throw badRequest('This trip has already left or was cancelled');
      if (trip.originBranchId !== p.originBranchId || trip.destinationBranchId !== p.destinationBranchId) {
        throw badRequest(`Wrong bus: this trip does not go from ${p.originBranch.city} to ${p.destinationBranch.city}`);
      }
      if (staff.role === 'DRIVER' && trip.driverId !== staff.id) throw forbidden('You are not the driver of this trip');
      if (staff.role !== 'DRIVER' && !worksAt(staff, p.originBranchId)) throw forbidden('Load parcels at your own branch only');
      // From now on the driver is responsible (or the agent, if no driver is assigned yet)
      const holder = trip.driverId ?? staff.id;
      await prisma.$transaction(async (tx) => {
        await moveFrom(tx, p.id, 'REGISTERED', { status: 'LOADED', tripId: trip.id, currentHolderId: holder });
        await tx.parcelEvent.create({ data: { parcelId: p.id, type: 'LOADED', actorId: staff.id, branchId: p.originBranchId } });
      });
      break;
    }

    case 'DEPARTED': {
      needRole(staff, ['DRIVER', 'BRANCH_MANAGER', 'COUNTER_AGENT'], 'mark departures');
      if (p.status !== 'LOADED') throw badRequest(`Only a loaded parcel can depart (it is ${p.status})`);
      if (staff.role === 'DRIVER' && p.currentHolderId !== staff.id) throw forbidden('This parcel is not on your bus');
      await prisma.$transaction(async (tx) => {
        await moveFrom(tx, p.id, 'LOADED', { status: 'IN_TRANSIT' });
        await tx.parcelEvent.create({ data: { parcelId: p.id, type: 'DEPARTED', actorId: staff.id, branchId: p.originBranchId } });
      });
      break;
    }

    case 'ARRIVED': {
      needRole(staff, ['COUNTER_AGENT', 'BRANCH_MANAGER'], 'receive parcels');
      if (p.status !== 'IN_TRANSIT') throw badRequest(`Only a parcel in transit can arrive (it is ${p.status})`);
      if (!worksAt(staff, p.destinationBranchId)) throw forbidden(`Only the ${p.destinationBranch.name} branch can receive this parcel`);
      // Anti-tampering: weigh again. Opened and refilled parcels rarely weigh the same.
      const diff = Math.abs(input.weightKg - p.weightAtRegistrationKg);
      const tampered = diff > WEIGHT_TOLERANCE_KG;
      await prisma.$transaction(async (tx) => {
        await moveFrom(tx, p.id, 'IN_TRANSIT', {
          status: tampered ? 'ON_HOLD' : 'ARRIVED',
          weightAtArrivalKg: input.weightKg,
          currentHolderId: staff.id,
        });
        await tx.parcelEvent.create({
          data: { parcelId: p.id, type: 'ARRIVED', actorId: staff.id, branchId: p.destinationBranchId, weightKg: input.weightKg },
        });
        if (tampered) {
          await tx.parcelEvent.create({
            data: {
              parcelId: p.id,
              type: 'HELD',
              actorId: staff.id,
              branchId: p.destinationBranchId,
              note: `Weight differs by ${diff.toFixed(2)} kg (${p.weightAtRegistrationKg} kg at registration, ${input.weightKg} kg now)`,
            },
          });
        }
      });
      break;
    }

    case 'HANDED_TO_COURIER': {
      needRole(staff, ['COUNTER_AGENT', 'BRANCH_MANAGER'], 'hand parcels to couriers');
      if (p.status !== 'ARRIVED') throw badRequest(`Only an arrived parcel can go out for delivery (it is ${p.status})`);
      if (!p.homeDelivery) throw badRequest('This parcel is collected at the branch, not delivered at home');
      if (!worksAt(staff, p.destinationBranchId)) throw forbidden(`Only the ${p.destinationBranch.name} branch can hand over this parcel`);
      const courier = await prisma.employee.findFirst({
        where: { id: input.courierId, agencyId: ctx.agencyId, active: true, user: { role: 'COURIER', isActive: true } },
        select: { id: true, user: { select: { fullName: true } } },
      });
      if (!courier) throw badRequest('Choose an active courier of your agency');
      await prisma.$transaction(async (tx) => {
        await moveFrom(tx, p.id, 'ARRIVED', { status: 'OUT_FOR_DELIVERY', courierId: courier.id, currentHolderId: courier.id });
        await tx.parcelEvent.create({
          data: { parcelId: p.id, type: 'HANDED_TO_COURIER', actorId: staff.id, branchId: p.destinationBranchId, note: `Courier: ${courier.user.fullName}` },
        });
      });
      break;
    }
  }
  return reload(p.id);
}

// ─────────────── Cash on delivery ───────────────

// The receiver pays the COD amount before taking the parcel. The money is HELD, not given to anyone yet.
// Cash: held at once. Mobile Money: held as soon as the receiver approves on their phone.
export async function payCashOnDelivery(
  idOrCode: string,
  input: { method: 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH'; payerPhone?: string },
  ctx: StaffContext,
): Promise<ParcelDetail> {
  const staff = await loadStaff(ctx);
  const p = await findParcel(idOrCode, ctx.agencyId);
  if (!p.codAmount) throw badRequest('This parcel has no cash on delivery');
  if (p.escrow) throw conflict('The cash on delivery was already paid');
  if (p.payments.some((pay) => pay.purpose === 'COD_COLLECTION' && pay.status === 'PENDING')) {
    throw conflict('The receiver has a payment waiting for approval on their phone, wait for its result');
  }
  assertCanHandOver(staff, p);
  payments.assertMethodAvailable(input.method);
  const payment = await prisma.$transaction((tx) =>
    payments.create(tx, {
      agencyId: ctx.agencyId,
      purpose: 'COD_COLLECTION',
      method: input.method,
      amount: p.codAmount!,
      commissionRate: 0, // this money belongs to the sender, TransitPro keeps nothing of it
      payerPhone: input.method === 'CASH' ? undefined : (input.payerPhone ?? p.receiverPhone),
      parcelId: p.id,
    }),
  );
  await payments.start(payment.id, `Cash on delivery, parcel ${p.trackingCode}`, p.receiverName);
  return reload(p.id);
}

// When a cash-on-delivery payment succeeds (cash at once, Mobile Money after approval): hold it in escrow
payments.onSettled('COD_COLLECTION', async (tx, payment, ok) => {
  if (!ok || !payment.parcelId) return;
  const parcel = await tx.parcel.findUniqueOrThrow({ where: { id: payment.parcelId }, select: { senderPhone: true } });
  await finance.holdInEscrow(tx, { paymentId: payment.id, parcelId: payment.parcelId, amount: payment.amount, beneficiaryPhone: parcel.senderPhone });
});

// Who may hand the parcel to the receiver: the courier holding it (home delivery),
// or an agent of the destination branch (pickup at the counter)
function assertCanHandOver(staff: Staff, p: ParcelFull) {
  if (p.status === 'ON_HOLD') throw onHoldError();
  if (staff.role === 'COURIER') {
    if (p.status !== 'OUT_FOR_DELIVERY') throw badRequest(`This parcel is not out for delivery (it is ${p.status})`);
    if (p.currentHolderId !== staff.id) throw forbidden('Only the courier holding this parcel can deliver it');
    return;
  }
  needRole(staff, ['COUNTER_AGENT', 'BRANCH_MANAGER'], 'hand over parcels');
  if (p.status !== 'ARRIVED') throw badRequest(`This parcel is not waiting at the branch (it is ${p.status})`);
  if (!worksAt(staff, p.destinationBranchId)) throw forbidden(`Only the ${p.destinationBranch.name} branch can hand over this parcel`);
}

// ─────────────── Deliver with the receiver's code ───────────────

export async function deliver(idOrCode: string, input: DeliverInput, ctx: StaffContext): Promise<ParcelDetail> {
  const staff = await loadStaff(ctx);
  const p = await findParcel(idOrCode, ctx.agencyId);
  assertCanHandOver(staff, p);

  // Proof of delivery at the door: photo of the handover + GPS position
  if (staff.role === 'COURIER' && (!input.photoUrl || input.lat === undefined || input.lng === undefined)) {
    throw badRequest('Take a photo of the handover and allow the GPS position before confirming');
  }
  if (!p.deliveryOtpHash || !p.deliveryOtpExpiresAt) throw badRequest('This parcel has no delivery code, ask the branch manager');
  if (p.deliveryOtpExpiresAt < new Date()) throw badRequest('The delivery code has expired, ask the branch manager for a new one');
  if (p.deliveryAttempts >= MAX_ATTEMPTS) throw onHoldError();
  // The escrow only exists once the COD payment succeeded (see the COD_COLLECTION handler)
  if (p.codAmount && p.escrow?.status !== 'HELD') {
    throw badRequest(`The receiver must first pay the cash on delivery (${p.codAmount} FCFA)`);
  }

  if (!matchesHash(input.otp, p.deliveryOtpHash)) {
    const attempts = p.deliveryAttempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await prisma.$transaction(async (tx) => {
      await tx.parcel.update({
        where: { id: p.id },
        data: { deliveryAttempts: attempts, ...(locked ? { status: 'ON_HOLD' as const } : {}) },
      });
      await tx.parcelEvent.create({
        data: { parcelId: p.id, type: 'DELIVERY_ATTEMPT', actorId: staff.id, lat: input.lat, lng: input.lng, note: `Wrong code (${attempts}/${MAX_ATTEMPTS})` },
      });
      if (locked) {
        await tx.parcelEvent.create({
          data: { parcelId: p.id, type: 'HELD', actorId: staff.id, note: `${MAX_ATTEMPTS} wrong codes: blocked until the branch manager checks it` },
        });
      }
    });
    if (locked) throw badRequest(`Wrong code. ${MAX_ATTEMPTS} wrong codes: the parcel is now ON HOLD for the branch manager`);
    throw badRequest(`Wrong code. ${MAX_ATTEMPTS - attempts} tries left`);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await moveFrom(tx, p.id, p.status, {
      status: 'DELIVERED',
      deliveredAt: now,
      deliveryPhotoUrl: input.photoUrl,
      deliveryLat: input.lat,
      deliveryLng: input.lng,
      currentHolderId: null,
      deliveryOtpHash: null, // a code works once
    });
    await tx.parcelEvent.create({
      data: {
        parcelId: p.id,
        type: 'DELIVERED',
        actorId: staff.id,
        branchId: staff.role === 'COURIER' ? null : p.destinationBranchId,
        lat: input.lat,
        lng: input.lng,
      },
    });
    // Parcels → Finance: the COD money goes to the sender only now
    await finance.releaseEscrowForParcel(tx, p.id);
  });

  const info = parcelInfo(p);
  if (p.senderEmail) queueEmail(deliveredEmail(p.senderEmail, p.senderName, info, now));
  if (p.receiverEmail) queueEmail(deliveredEmail(p.receiverEmail, p.receiverName, info, now));
  return reload(p.id);
}

// ─────────────── Refuse ───────────────

// Seal broken or contents differ: the receiver refuses, a claim is opened, the COD money goes back
export async function refuse(idOrCode: string, reason: string, ctx: StaffContext): Promise<ParcelDetail> {
  const staff = await loadStaff(ctx);
  const p = await findParcel(idOrCode, ctx.agencyId);
  assertCanHandOver(staff, p);
  await prisma.$transaction(async (tx) => {
    await moveFrom(tx, p.id, p.status, { status: 'REFUSED', currentHolderId: staff.id, deliveryOtpHash: null });
    await tx.parcelEvent.create({
      data: { parcelId: p.id, type: 'REFUSED', actorId: staff.id, branchId: staff.role === 'COURIER' ? null : p.destinationBranchId, note: reason },
    });
    await tx.parcelClaim.create({ data: { parcelId: p.id, openedById: staff.userId, reason, status: 'OPEN' } });
    await finance.refundEscrowForParcel(tx, p.id);
  });
  return reload(p.id);
}

// ─────────────── Branch manager checks a parcel ON HOLD ───────────────

// After checking (weighing again, opening with the receiver...), the manager puts the parcel back at the
// branch and a NEW delivery code is made: the old one may have been guessed or shared.
export async function releaseHold(idOrCode: string, note: string, ctx: StaffContext): Promise<ParcelHoldReleased> {
  const staff = await loadStaff(ctx);
  needRole(staff, ['BRANCH_MANAGER'], 'release a parcel on hold');
  const p = await findParcel(idOrCode, ctx.agencyId);
  if (p.status !== 'ON_HOLD') throw badRequest('This parcel is not on hold');
  if (!worksAt(staff, p.destinationBranchId)) throw forbidden(`Only the ${p.destinationBranch.name} branch manager can release it`);
  const delivery = newDeliveryCode();
  await prisma.$transaction(async (tx) => {
    await moveFrom(tx, p.id, 'ON_HOLD', {
      status: 'ARRIVED',
      currentHolderId: staff.id,
      deliveryAttempts: 0,
      deliveryOtpHash: delivery.hash,
      deliveryOtpExpiresAt: delivery.expiresAt,
    });
    await tx.parcelEvent.create({
      data: { parcelId: p.id, type: 'ARRIVED', actorId: staff.id, branchId: p.destinationBranchId, note: `Checked by the branch manager: ${note}` },
    });
  });
  emailDeliveryCode(p, delivery.code);
  return { parcel: await reload(p.id), deliveryCode: delivery.code };
}
