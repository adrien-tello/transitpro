import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';

// Owner: Joy (Human Resources)
// Screens: web Staff page (list, add staff = send invite), staff app "Invite · set password".
// Contract: docs/API.md, section "HR". Follow modules/parcels for the style.
// Rules that link modules: a driver with an expired licence cannot be assigned to a trip;
// only HR creates staff accounts (customers can never become staff by themselves).
export const hrRouter = Router();

// Public: the invite link opens the app on "set your password"
hrRouter.get('/invites/:token', async () => {
  throw notImplemented('Read an invite (agency, role, email) from its token');
});
hrRouter.post('/invites/:token/accept', async () => {
  throw notImplemented('Accept invite: set password, create User + Employee, return a session');
});

hrRouter.use(requireAuth);

hrRouter.get('/employees', requireRole('HR_OFFICER', 'BRANCH_MANAGER'), async () => {
  throw notImplemented('List staff (filter by branch, role, active)');
});
hrRouter.patch('/employees/:id', requireRole('HR_OFFICER'), async () => {
  throw notImplemented('Update staff (branch, licence, salary, deactivate)');
});
hrRouter.post('/invites', requireRole('HR_OFFICER'), async () => {
  throw notImplemented('Invite a staff member (SMS + email link)');
});
hrRouter.get('/alerts/licences', requireRole('HR_OFFICER', 'BRANCH_MANAGER'), async () => {
  throw notImplemented('Drivers whose licence expires in the next 30 days');
});
hrRouter.post('/payroll/run', requireRole('HR_OFFICER'), async () => {
  throw notImplemented('Monthly payroll (salaries go to Finance as expenses)');
});
