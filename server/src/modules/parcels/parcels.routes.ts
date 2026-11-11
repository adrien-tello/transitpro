import { Router, type Request } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { agencyIdOf, employeeIdOf, requireAuth, requireRole } from '../../middleware/auth';
import {
  codPaymentSchema,
  codeParam,
  feePaymentSchema,
  deliverSchema,
  idParam,
  listQuery,
  refuseSchema,
  registerParcelSchema,
  scanSchema,
} from './parcels.schemas';
import * as parcels from './parcels.service';

// Owner: Lead (Fanyi Charllson). Parcels & Courier.
// Route style every module copies: validate -> role check -> call service -> { data }.
// The service checks the finer rules (right branch, right holder, right status).
export const parcelsRouter = Router();

const staff = (req: Request) => ({ agencyId: agencyIdOf(req), employeeId: employeeIdOf(req) });
const id = (req: Request) => String(req.params.id);

// Public: anyone with the tracking code (customer app, tracking link). No personal data.
parcelsRouter.get('/track/:code', validate({ params: codeParam }), async (req, res) => {
  res.json({ data: await parcels.track(String(req.params.code)) });
});

parcelsRouter.use(requireAuth);

// Counter agent registers, weighs, photographs and seals the parcel; the answer holds the delivery code ONCE
parcelsRouter.post('/', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), validate({ body: registerParcelSchema }), async (req, res) => {
  res.status(201).json({ data: await parcels.registerParcel(req.body, staff(req)) });
});

// Web list (my branch's parcels; the owner sees all)
parcelsRouter.get('/', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), validate({ query: listQuery }), async (req, res) => {
  res.json({ data: await parcels.list(req.query as unknown as z.infer<typeof listQuery>, staff(req)) });
});

// Staff app: parcels I am responsible for (driver, courier)
parcelsRouter.get('/mine', requireRole('DRIVER', 'COURIER', 'COUNTER_AGENT', 'BRANCH_MANAGER'), async (req, res) => {
  res.json({ data: await parcels.mine(staff(req)) });
});

// :id = database id or tracking code (what the QR label contains)
parcelsRouter.get('/:id', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), validate({ params: idParam }), async (req, res) => {
  res.json({ data: await parcels.getForAgency(id(req), agencyIdOf(req)) });
});

// One handover = one scan: LOADED (tripId) · DEPARTED · ARRIVED (weightKg) · HANDED_TO_COURIER (courierId)
parcelsRouter.post(
  '/:id/scan',
  requireRole('COUNTER_AGENT', 'DRIVER', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: scanSchema }),
  async (req, res) => {
    res.json({ data: await parcels.scan(id(req), req.body, staff(req)) });
  },
);

// Receiver pays the cash on delivery before taking the parcel: the money is held in escrow
parcelsRouter.post(
  '/:id/cod-payment',
  requireRole('COURIER', 'COUNTER_AGENT', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: codPaymentSchema }),
  async (req, res) => {
    res.json({ data: await parcels.payCashOnDelivery(id(req), req.body, staff(req)) });
  },
);

// The fee payment failed (Mobile Money refused, no answer...): take it again, cash or another number
parcelsRouter.post(
  '/:id/fee-payment',
  requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: feePaymentSchema }),
  async (req, res) => {
    res.json({ data: await parcels.payFee(id(req), req.body, staff(req)) });
  },
);

// Courier (home delivery: code + photo + GPS) or counter agent (pickup: code) enters the receiver's code
parcelsRouter.post(
  '/:id/deliver',
  requireRole('COURIER', 'COUNTER_AGENT', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: deliverSchema }),
  async (req, res) => {
    res.json({ data: await parcels.deliver(id(req), req.body, staff(req)) });
  },
);

// Receiver refuses (seal broken, contents differ): claim opened, COD money refunded
parcelsRouter.post(
  '/:id/refuse',
  requireRole('COURIER', 'COUNTER_AGENT', 'BRANCH_MANAGER'),
  validate({ params: idParam, body: refuseSchema }),
  async (req, res) => {
    res.json({ data: await parcels.refuse(id(req), req.body.reason, staff(req)) });
  },
);

// Branch manager checked a parcel ON HOLD (weight difference, 5 wrong codes): back at the branch, new code
parcelsRouter.post(
  '/:id/release-hold',
  requireRole('BRANCH_MANAGER'),
  validate({ params: idParam, body: z.object({ note: z.string().trim().min(5).max(500) }) }),
  async (req, res) => {
    res.json({ data: await parcels.releaseHold(id(req), req.body.note, staff(req)) });
  },
);
