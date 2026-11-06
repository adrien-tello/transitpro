import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';

// Server owner: Joy (Booking & Ticketing). UML owner: Adrien Tello.
// Screens: customer app Search, Search results, Choose a seat, Pay, E-ticket;
//          staff app "Scan tickets"; web "Trips & booking".
// Contract: docs/API.md, section "Booking". Follow modules/parcels for the style:
//   booking.schemas.ts (Zod) -> booking.service.ts (Prisma + rules) -> this file (HTTP only).
// Payments: call finance.recordPayment(tx, ...) inside the same transaction as the ticket.
export const bookingRouter = Router();

// Public (customer app, no login needed to search)
bookingRouter.get('/trips/search', async () => {
  throw notImplemented('Search trips (from, to, date)');
});
bookingRouter.get('/trips/:id/seats', async () => {
  throw notImplemented('Seat map of a trip');
});

bookingRouter.use(requireAuth);

// Customer
bookingRouter.post('/tickets', async () => {
  throw notImplemented('Book a seat and pay');
});
bookingRouter.get('/tickets/mine', async () => {
  throw notImplemented('My tickets');
});
bookingRouter.post('/tickets/:id/cancel', async () => {
  throw notImplemented('Cancel a ticket');
});
bookingRouter.post('/reviews', async () => {
  throw notImplemented('Rate a completed trip');
});

// Staff (driver / conductor app)
bookingRouter.post('/tickets/:code/board', requireRole('DRIVER', 'COUNTER_AGENT'), async () => {
  throw notImplemented('Scan a ticket at boarding');
});

// Agency web dashboard
bookingRouter.get('/routes', requireRole('BRANCH_MANAGER'), async () => {
  throw notImplemented('List routes');
});
bookingRouter.post('/routes', requireRole('BRANCH_MANAGER'), async () => {
  throw notImplemented('Create a route');
});
bookingRouter.get('/trips', requireRole('BRANCH_MANAGER', 'COUNTER_AGENT'), async () => {
  throw notImplemented('List trips (today, by status)');
});
bookingRouter.post('/trips', requireRole('BRANCH_MANAGER'), async () => {
  throw notImplemented('Schedule a trip (checks bus is ACTIVE and driver licence is valid)');
});
bookingRouter.patch('/trips/:id/status', requireRole('BRANCH_MANAGER', 'DRIVER'), async () => {
  throw notImplemented('Change trip status (BOARDING, DEPARTED, ARRIVED)');
});
