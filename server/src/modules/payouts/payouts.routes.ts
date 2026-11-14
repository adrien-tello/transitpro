import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { agencyIdOf, requireAuth, requireMasterAdmin, requirePlatformAdmin, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import * as payouts from './payouts.service';

// Owner: Lead (Fanyi Charllson). Money TransitPro sends out (payouts to agencies, cash on delivery to senders).
export const payoutsRouter = Router();
payoutsRouter.use(requireAuth);

// Agency: what TransitPro owes us, our payout account, our payouts
payoutsRouter.get('/mine', requireRole('ACCOUNTANT'), async (req, res) => {
  res.json({ data: await payouts.forAgency(agencyIdOf(req)) });
});

// The owner withdraws what TransitPro owes the agency (whole balance or a smaller amount)
payoutsRouter.post(
  '/mine/withdraw',
  requireRole('AGENCY_OWNER'),
  validate({ body: z.object({ amount: z.number().int().positive().max(100_000_000).optional() }) }),
  async (req, res) => {
    res.status(201).json({ data: await payouts.withdraw(agencyIdOf(req), req.body.amount, req.user!.id) });
  },
);

// TransitPro team
payoutsRouter.get('/admin/agencies', requirePlatformAdmin, async (_req, res) => {
  res.json({ data: await payouts.agenciesToPay() });
});

const historyQuery = z.object({
  kind: z.enum(['AGENCY_PAYOUT', 'COD_TO_SENDER']).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
payoutsRouter.get('/admin/history', requirePlatformAdmin, validate({ query: historyQuery }), async (req, res) => {
  res.json({ data: await payouts.history(req.query as unknown as z.infer<typeof historyQuery>) });
});

// "Pay agency": the whole available balance, or a smaller amount
payoutsRouter.post(
  '/admin/agencies/:id',
  requirePlatformAdmin,
  validate({ params: z.object({ id: z.string().min(1).max(40) }), body: z.object({ amount: z.number().int().positive().max(100_000_000).optional() }) }),
  async (req, res) => {
    res.status(201).json({ data: await payouts.payAgency(String(req.params.id), req.body.amount, req.user!.id) });
  },
);

// TransitPro's own money: everybody in the team sees it, only the master admin withdraws
payoutsRouter.get('/admin/revenue', requirePlatformAdmin, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { isMasterAdmin: true } });
  res.json({ data: await payouts.revenue(!!u?.isMasterAdmin) });
});
payoutsRouter.post(
  '/admin/withdraw',
  requireMasterAdmin,
  validate({ body: z.object({ amount: z.number().int().positive().max(1_000_000_000).optional() }) }),
  async (req, res) => {
    res.status(201).json({ data: await payouts.withdrawPlatform(req.body.amount, req.user!.id) });
  },
);
