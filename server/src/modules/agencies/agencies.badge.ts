import type { BadgeStatus } from '@contracts/api-types';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { queueEmail } from '../../lib/email';
import { badRequest, conflict, forbidden } from '../../lib/http-error';
import * as payments from '../payments/payments.service';
import { badgeActiveEmail } from './agencies.emails';

// Owner: Lead (Fanyi Charllson). The OPTIONAL paid "Verified" badge.
//
// Every agency is checked by the TransitPro team before it can work (documents, approval): that stays free.
// The badge is extra: customers see "Verified" next to the agency's name, which builds trust and brings bookings.
// Bought while the agency waits for verification, it also puts the agency first in the team's queue.
// The owner pays BADGE_PRICE by Mobile Money; when Notch Pay confirms, the badge runs for BADGE_MONTHS months
// (a renewal extends it from the current end date). The money is 100 % TransitPro's (commissionRate 100) and
// never enters the agency's balance (only TICKET and PARCEL_FEE do).

const addMonths = (d: Date, n: number) => {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
};

// When the badge payment succeeds: extend the badge (inside the payment's transaction)
payments.onSettled('SUBSCRIPTION', async (tx, payment, ok) => {
  if (!ok || !payment.agencyId) return;
  const agency = await tx.agency.findUniqueOrThrow({ where: { id: payment.agencyId }, select: { badgeUntil: true, name: true, email: true } });
  const from = agency.badgeUntil && agency.badgeUntil > new Date() ? agency.badgeUntil : new Date();
  const until = addMonths(from, env.BADGE_MONTHS);
  await tx.agency.update({ where: { id: payment.agencyId }, data: { badgeUntil: until } });
  queueEmail(badgeActiveEmail(agency, until));
});

export async function status(agencyId: string): Promise<BadgeStatus> {
  const [agency, last] = await Promise.all([
    prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { badgeUntil: true } }),
    prisma.payment.findFirst({ where: { agencyId, purpose: 'SUBSCRIPTION' }, orderBy: { createdAt: 'desc' } }),
  ]);
  const active = !!agency.badgeUntil && agency.badgeUntil > new Date();
  return {
    price: env.BADGE_PRICE,
    months: env.BADGE_MONTHS,
    activeUntil: agency.badgeUntil ? agency.badgeUntil.toISOString() : null,
    active,
    payment: last ? payments.toView(last) : null,
  };
}

// POST /agencies/me/badge: a Mobile Money prompt on the owner's phone (cash is not accepted: nobody to hand it to)
export async function buy(agencyId: string, agencyStatus: string, input: { method: 'MTN_MOMO' | 'ORANGE_MONEY'; payerPhone: string }, owner: { id: string; fullName: string }) {
  // Before approval too: a paid agency is checked FIRST by the team (priority review). Never while suspended.
  if (agencyStatus === 'SUSPENDED') throw forbidden('Your agency is suspended, contact TransitPro');
  payments.assertMethodAvailable(input.method);
  const pending = await prisma.payment.findFirst({ where: { agencyId, purpose: 'SUBSCRIPTION', status: 'PENDING' } });
  if (pending) throw conflict('A badge payment is waiting for approval on the phone');
  const current = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId }, select: { badgeUntil: true } });
  // Renewing is allowed in the last 60 days; earlier would be a mistake (double payment)
  if (current.badgeUntil && current.badgeUntil.getTime() - Date.now() > 60 * 86_400_000) throw badRequest('Your badge is active for more than 2 months: you can renew it later');
  const payment = await prisma.$transaction((tx) =>
    payments.create(tx, {
      agencyId,
      purpose: 'SUBSCRIPTION',
      method: input.method,
      amount: env.BADGE_PRICE,
      commissionRate: 100, // all of it is TransitPro's revenue
      payerPhone: input.payerPhone,
      payerId: owner.id,
    }),
  );
  await payments.start(payment.id, `TransitPro Verified badge, ${env.BADGE_MONTHS} months`, owner.fullName);
  return status(agencyId);
}
