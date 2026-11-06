import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';

// Owner: Lead (Fanyi Charllson). SaaS layer: agency sign-up, verification, public profiles.
// Screens: web "Register your agency"; customer app Verified agencies + Agency profile.
export const agenciesRouter = Router();

// Public (customer app): only APPROVED agencies are ever returned
agenciesRouter.get('/', async () => {
  throw notImplemented('List verified agencies (search, sort by rating)');
});
agenciesRouter.get('/:slug', async () => {
  throw notImplemented('Agency profile with rating breakdown and today\'s departures');
});
agenciesRouter.post('/register', async () => {
  throw notImplemented('Agency owner signs up (agency is PENDING until verified)');
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

// TransitPro team only
agenciesRouter.get('/admin/pending', requireRole('PLATFORM_ADMIN'), async () => {
  throw notImplemented('Agencies waiting for verification');
});
agenciesRouter.post('/admin/:id/approve', requireRole('PLATFORM_ADMIN'), async () => {
  throw notImplemented('Approve an agency');
});
agenciesRouter.post('/admin/:id/reject', requireRole('PLATFORM_ADMIN'), async () => {
  throw notImplemented('Reject an agency with a reason');
});
