import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { isValidWebhookSignature } from '../../lib/notchpay';
import * as payments from './payments.service';

// Owner: Lead (Fanyi Charllson)
export const paymentsRouter = Router();

// Notch Pay calls this when a payment changes. Public, but signed with our hash key.
// We never trust the message itself: we take its reference and ask Notch Pay for the real status.
paymentsRouter.post('/webhooks/notchpay', async (req, res) => {
  if (!isValidWebhookSignature(req.rawBody, req.header('x-notch-signature'))) {
    res.status(401).json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid signature' } });
    return;
  }
  const body = (req.body ?? {}) as Record<string, any>;
  const candidates = [
    body.data?.reference,
    body.data?.transaction?.reference,
    body.transaction?.reference,
    body.reference,
    body.data?.merchant_reference,
    body.data?.trxref,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0 && v.length < 100);
  let known = false;
  for (const ref of candidates) {
    if (await payments.syncByReference(ref)) {
      known = true;
      break;
    }
  }
  // Always 200 for a valid signature, so Notch Pay does not resend forever
  res.json({ data: { received: true, known } });
});

paymentsRouter.use(requireAuth);

// The app polls this while the payer approves on their phone (every 3 seconds is fine)
paymentsRouter.get('/:id', validate({ params: z.object({ id: z.string().min(1).max(40) }) }), async (req, res) => {
  res.json({ data: await payments.getForUser(String(req.params.id), req.user!) });
});
