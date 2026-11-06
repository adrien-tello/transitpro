import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';

// Owner: Sweet (Finance & Reporting)
// Screens: web Finance page, dashboard KPIs and revenue chart, courier "Cash to remit".
// Contract: docs/API.md, section "Finance". Follow modules/parcels for the style.
// Other modules call finance.service.ts (recordPayment, holdInEscrow, releaseEscrowForParcel).
export const financeRouter = Router();

// Payment provider callback (Notch Pay / CinetPay), no login
financeRouter.post('/webhooks/payments', async () => {
  throw notImplemented('Payment provider confirms or fails a MoMo / OM payment');
});

financeRouter.use(requireAuth);

financeRouter.get('/summary', requireRole('ACCOUNTANT', 'BRANCH_MANAGER'), async () => {
  throw notImplemented('Dashboard numbers: revenue today, tickets vs parcels, cash to remit');
});
financeRouter.get('/revenue', requireRole('ACCOUNTANT', 'BRANCH_MANAGER'), async () => {
  throw notImplemented('Revenue per day / route / bus for a period');
});
financeRouter.get('/payments', requireRole('ACCOUNTANT'), async () => {
  throw notImplemented('List payments');
});
financeRouter.get('/expenses', requireRole('ACCOUNTANT'), async () => {
  throw notImplemented('List expenses');
});
financeRouter.post('/expenses', requireRole('ACCOUNTANT'), async () => {
  throw notImplemented('Record an expense');
});
financeRouter.get('/remittances', requireRole('ACCOUNTANT', 'BRANCH_MANAGER', 'COURIER'), async () => {
  throw notImplemented('Cash each staff member must hand in today');
});
financeRouter.post('/remittances/:id/close', requireRole('BRANCH_MANAGER'), async () => {
  throw notImplemented('Branch manager confirms the cash received (SETTLED or SHORT)');
});
