import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { agencyIdOf, employeeIdOf, requireAuth, requireRole } from '../../middleware/auth';
import { codeParam, deliverSchema, idParam, refuseSchema, registerParcelSchema, scanSchema } from './parcels.schemas';
import * as parcels from './parcels.service';

// Owner: Lead (Fanyi Charllson). Routes are wired; parcels.service.ts is not built yet.
// This file shows the route style every module copies: validate -> role check -> call service -> { data }.
export const parcelsRouter = Router();

const staff = (req: Parameters<typeof agencyIdOf>[0]) => ({ agencyId: agencyIdOf(req), employeeId: employeeIdOf(req) });

// Public: anyone with the tracking code (customer app, SMS link)
parcelsRouter.get('/track/:code', validate({ params: codeParam }), async (req, res) => {
  res.json({ data: await parcels.track(String(req.params.code)) });
});

parcelsRouter.use(requireAuth);

// Counter agent registers, weighs, photographs and seals the parcel
parcelsRouter.post(
  '/',
  requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'),
  validate({ body: registerParcelSchema }),
  async (req, res) => {
    res.status(201).json({ data: await parcels.registerParcel(req.body, staff(req)) });
  },
);

parcelsRouter.get('/:id', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), validate({ params: idParam }), async (req, res) => {
  res.json({ data: await parcels.getForAgency(String(req.params.id), agencyIdOf(req)) });
});

// Driver, agent or manager scans the QR label at each handover
parcelsRouter.post(
  '/:id/scan',
  requireRole('COUNTER_AGENT', 'DRIVER', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: scanSchema }),
  async (req, res) => {
    res.json({ data: await parcels.scan(String(req.params.id), req.body, staff(req)) });
  },
);

// Courier (home delivery) or counter agent (pickup at branch) enters the receiver's code
parcelsRouter.post(
  '/:id/deliver',
  requireRole('COURIER', 'COUNTER_AGENT'),
  validate({ params: idParam, body: deliverSchema }),
  async (req, res) => {
    res.json({ data: await parcels.deliver(String(req.params.id), req.body, staff(req)) });
  },
);

parcelsRouter.post(
  '/:id/refuse',
  requireRole('COURIER', 'COUNTER_AGENT'),
  validate({ params: idParam, body: refuseSchema }),
  async (req, res) => {
    res.json({ data: await parcels.refuse(String(req.params.id), req.body.reason, staff(req)) });
  },
);
