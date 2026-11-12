import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { agencyIdOf, requireAuth, requirePlatformAdmin, requireRole, setSessionCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { forbidden, notImplemented } from '../../lib/http-error';
import {
  adminListQuery,
  adminPaymentsQuery,
  agencyIdParams,
  branchSchema,
  documentTypeParams,
  payoutAccountSchema,
  registerAgencySchema,
  rejectAgencySchema,
} from './agencies.schemas';
import * as admin from './agencies.admin';
import * as documents from './agencies.documents';
import * as payouts from '../payouts/payouts.service';
import * as agencies from './agencies.service';
import type { z } from 'zod';
import { publish } from '../../lib/realtime';

// Owner: Lead (Fanyi Charllson). SaaS layer: agency sign-up, verification, public profiles.
// Screens: web "Register your agency" + platform admin; customer app Verified agencies + Agency profile.
export const agenciesRouter = Router();

// Public (customer app): only APPROVED agencies are ever returned
agenciesRouter.get('/', async () => {
  throw notImplemented('List verified agencies (search, sort by rating)');
});
agenciesRouter.get('/:slug', async () => {
  throw notImplemented('Agency profile with rating breakdown and today\'s departures');
});

// Owner signs up the agency. The owner is logged in at once; the dashboard shows
// "waiting for verification" until a PLATFORM_ADMIN approves the agency.
agenciesRouter.post('/register', authLimiter, validate({ body: registerAgencySchema }), async (req, res) => {
  const { tokenVersion, ...result } = await agencies.registerAgency(req.body);
  setSessionCookie(res, { id: result.user.id, tokenVersion });
  publish({ team: true }, { type: 'agency.registered', agencyId: result.agency.id, name: result.agency.name });
  res.status(201).json({ data: result });
});

agenciesRouter.use(requireAuth);

// ─── Documents (owner). Allowed while PENDING or REJECTED (to fix them) and once verified (renewed licence). ───
const ownerAgency = (req: express.Request) => {
  const id = req.user?.agencyId;
  if (!id || req.user?.role !== 'AGENCY_OWNER') throw forbidden('Only the agency owner can do this');
  return { id, status: req.user.agencyStatus ?? 'PENDING' };
};
const documentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Too many uploads, wait a few minutes' } });
  },
});

agenciesRouter.get('/me/documents', async (req, res) => {
  res.json({ data: await documents.list(ownerAgency(req).id) });
});
// Body = the file itself (Content-Type image/jpeg | image/png | image/webp | application/pdf, max 5 MB)
agenciesRouter.put(
  '/me/documents/:type',
  documentLimiter,
  validate({ params: documentTypeParams }),
  express.raw({ type: Object.keys(documents.DOCUMENT_MIME), limit: '5mb' }),
  async (req, res) => {
    const agency = ownerAgency(req);
    const type = String(req.params.type) as z.infer<typeof documentTypeParams>['type'];
    res.json({ data: await documents.upload(agency.id, agency.status, type, String(req.headers['content-type'] ?? ''), req.body) });
    publish({ team: true }, { type: 'agency.documents', agencyId: agency.id, name: '' });
  },
);
// Opens the file: the agency's owner or the TransitPro team only
agenciesRouter.get('/documents/:id/file', validate({ params: agencyIdParams }), async (req, res) => {
  const file = await documents.readFileFor(String(req.params.id), { role: req.user!.role, agencyId: req.user!.agencyId ?? null });
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(file.bytes);
});
// Rejected agency: documents fixed, ask the team to check again
agenciesRouter.post('/me/resubmit', async (req, res) => {
  const a = await agencies.resubmit(ownerAgency(req).id);
  res.json({ data: a });
  publish({ team: true, agencyId: a.id }, { type: 'agency.status', agencyId: a.id, name: a.name, status: a.status });
});

// Where TransitPro sends the agency's money (owner)
agenciesRouter.put('/me/payout-account', requireRole('AGENCY_OWNER'), validate({ body: payoutAccountSchema }), async (req, res) => {
  res.json({ data: await payouts.setAccount(agencyIdOf(req), req.body) });
});
// Every staff member of the agency (destination lists, filters). Works while the agency is PENDING
// so the owner can prepare branches before the approval.
agenciesRouter.get('/me/branches', async (req, res) => {
  res.json({ data: await agencies.listBranches(agencyIdOf(req, { allowPending: true })) });
});
agenciesRouter.post('/me/branches', requireRole('AGENCY_OWNER'), validate({ body: branchSchema }), async (req, res) => {
  res.status(201).json({ data: await agencies.addBranch(agencyIdOf(req, { allowPending: true }), req.body) });
});

// TransitPro team only. AGENCY_OWNER is refused here: an owner never approves their own agency.
agenciesRouter.get('/admin/overview', requirePlatformAdmin, async (_req, res) => {
  res.json({ data: await agencies.overview() });
});
agenciesRouter.get('/admin/pending', requirePlatformAdmin, async (_req, res) => {
  res.json({ data: await agencies.listPending() });
});
agenciesRouter.get('/admin/list', requirePlatformAdmin, validate({ query: adminListQuery }), async (req, res) => {
  res.json({ data: await admin.list(req.query as unknown as z.infer<typeof adminListQuery>) });
});
agenciesRouter.get('/admin/payments', requirePlatformAdmin, validate({ query: adminPaymentsQuery }), async (req, res) => {
  res.json({ data: await admin.payments(req.query as unknown as z.infer<typeof adminPaymentsQuery>) });
});
agenciesRouter.get('/admin/:id', requirePlatformAdmin, validate({ params: agencyIdParams }), async (req, res) => {
  res.json({ data: await admin.detail(String(req.params.id)) });
});
agenciesRouter.post('/admin/:id/suspend', requirePlatformAdmin, validate({ params: agencyIdParams, body: rejectAgencySchema }), async (req, res) => {
  const a = await admin.suspend(String(req.params.id), req.body.reason);
  res.json({ data: a });
  publish({ team: true, agencyId: a.id }, { type: 'agency.status', agencyId: a.id, name: a.name, status: a.status });
});
agenciesRouter.post('/admin/:id/reactivate', requirePlatformAdmin, validate({ params: agencyIdParams }), async (req, res) => {
  const a = await admin.reactivate(String(req.params.id));
  res.json({ data: a });
  publish({ team: true, agencyId: a.id }, { type: 'agency.status', agencyId: a.id, name: a.name, status: a.status });
});
agenciesRouter.post('/admin/:id/approve', requirePlatformAdmin, validate({ params: agencyIdParams }), async (req, res) => {
  const a = await agencies.approve(String(req.params.id));
  res.json({ data: a });
  publish({ team: true, agencyId: a.id }, { type: 'agency.status', agencyId: a.id, name: a.name, status: a.status });
});
agenciesRouter.post(
  '/admin/:id/reject',
  requirePlatformAdmin,
  validate({ params: agencyIdParams, body: rejectAgencySchema }),
  async (req, res) => {
    const a = await agencies.reject(String(req.params.id), req.body.reason);
    res.json({ data: a });
    publish({ team: true, agencyId: a.id }, { type: 'agency.status', agencyId: a.id, name: a.name, status: a.status });
  },
);
