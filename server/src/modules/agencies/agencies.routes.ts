import { Router } from 'express';
import { requireAuth, requirePlatformAdmin, requireRole, setSessionCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { notImplemented } from '../../lib/http-error';
import { agencyIdParams, registerAgencySchema, rejectAgencySchema } from './agencies.schemas';
import * as agencies from './agencies.service';

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
  res.status(201).json({ data: result });
});

agenciesRouter.use(requireAuth);

agenciesRouter.post('/me/documents', requireRole('AGENCY_OWNER'), async () => {
  throw notImplemented('Upload RCCM, NIU, CNI, transport licence');
});
agenciesRouter.get('/me/branches', requireRole('BRANCH_MANAGER', 'COUNTER_AGENT'), async () => {
  throw notImplemented('Branches of my agency');
});
agenciesRouter.post('/me/branches', requireRole('AGENCY_OWNER'), async () => {
  throw notImplemented('Add a branch');
});

// TransitPro team only. AGENCY_OWNER is refused here: an owner never approves their own agency.
agenciesRouter.get('/admin/pending', requirePlatformAdmin, async (_req, res) => {
  res.json({ data: await agencies.listPending() });
});
agenciesRouter.post('/admin/:id/approve', requirePlatformAdmin, validate({ params: agencyIdParams }), async (req, res) => {
  res.json({ data: await agencies.approve(String(req.params.id)) });
});
agenciesRouter.post(
  '/admin/:id/reject',
  requirePlatformAdmin,
  validate({ params: agencyIdParams, body: rejectAgencySchema }),
  async (req, res) => {
    res.json({ data: await agencies.reject(String(req.params.id), req.body.reason) });
  },
);
