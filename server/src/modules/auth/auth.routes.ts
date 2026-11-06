import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../../middleware/auth';
import { notImplemented } from '../../lib/http-error';
import { googleSchema, loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';

// Owner: Lead (Fanyi Charllson)
export const authRouter = Router();

// Slows down password guessing: 10 tries per 15 minutes per IP
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

authRouter.post('/register', loginLimiter, validate({ body: registerSchema }), async (req, res) => {
  const user = await authService.register(req.body);
  setSessionCookie(res, await authService.sessionFor(user));
  res.status(201).json({ data: { user: authService.publicUser(user) } });
});

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const user = await authService.login(req.body);
  setSessionCookie(res, await authService.sessionFor(user));
  res.json({ data: { user: authService.publicUser(user) } });
});

// Google sign-in: the app sends the Google ID token, the server verifies it with
// google-auth-library, finds or creates the CUSTOMER, then sets the same cookie.
authRouter.post('/google', loginLimiter, validate({ body: googleSchema }), async () => {
  throw notImplemented('Google sign-in');
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ data: await authService.me(req.user!.id) });
});
