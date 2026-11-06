import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';

// Owner: Ngwese Fidel (Fleet & Maintenance)
// Screens: staff app Driver Today (Breakdown button, Start trip = live location);
//          web Fleet page, dashboard "Bus needing attention", Live tracking map.
// Contract: docs/API.md, section "Fleet". Follow modules/parcels for the style.
// Rule that links modules: a bus IN_MAINTENANCE cannot be put on a trip (Booking checks this).
export const fleetRouter = Router();

fleetRouter.use(requireAuth);

fleetRouter.get('/buses', requireRole('FLEET_MANAGER', 'BRANCH_MANAGER'), async () => {
  throw notImplemented('List buses with status');
});
fleetRouter.post('/buses', requireRole('FLEET_MANAGER'), async () => {
  throw notImplemented('Add a bus');
});
fleetRouter.patch('/buses/:id', requireRole('FLEET_MANAGER'), async () => {
  throw notImplemented('Update a bus (status, next service date)');
});
fleetRouter.get('/buses/:id/maintenance', requireRole('FLEET_MANAGER'), async () => {
  throw notImplemented('Maintenance history of a bus');
});
fleetRouter.post('/maintenance', requireRole('FLEET_MANAGER'), async () => {
  throw notImplemented('Open a maintenance record (puts the bus IN_MAINTENANCE, cost goes to Finance as an expense)');
});
fleetRouter.post('/maintenance/:id/complete', requireRole('FLEET_MANAGER'), async () => {
  throw notImplemented('Close maintenance (bus back to ACTIVE)');
});
fleetRouter.post('/fuel', requireRole('FLEET_MANAGER', 'DRIVER'), async () => {
  throw notImplemented('Record a fuel fill (cost goes to Finance as an expense)');
});

// Driver app
fleetRouter.post('/breakdowns', requireRole('DRIVER'), async () => {
  throw notImplemented('Driver reports a breakdown on the road');
});
fleetRouter.post('/trips/:tripId/location', requireRole('DRIVER'), async () => {
  throw notImplemented('Driver phone sends GPS position (every 30 s while on a trip)');
});

// Web live tracking
fleetRouter.get('/live', requireRole('BRANCH_MANAGER', 'FLEET_MANAGER'), async () => {
  throw notImplemented('Positions of buses on the road and couriers out for delivery');
});
