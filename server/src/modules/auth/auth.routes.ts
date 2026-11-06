import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import { notImplemented } from '../../lib/http-error';
import { googleSchema, loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';

// Owner: Lead (Fanyi Charllson)
export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const user = await authService.register(req.body);
  setSessionCookie(res, user);
  res.status(201).json({ data: { user: authService.publicUser(user) } });
});

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const user = await authService.login(req.body);
  setSessionCookie(res, user);
  res.json({ data: { user: authService.publicUser(user) } });
});

// Google sign-in: the app sends the Google ID token, the server verifies it with
// google-auth-library, finds or creates the CUSTOMER, then sets the same cookie.
authRouter.post('/google', authLimiter, validate({ body: googleSchema }), async () => {
  throw notImplemented('Google sign-in');
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  await authService.revokeAllSessions(req.user!.id);
  clearSessionCookie(res);
  res.json({ data: { ok: true } });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ data: await authService.me(req.user!.id) });
});
