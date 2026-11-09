import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { clearSessionCookie, requireAuth, setSessionCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas';
import * as authService from './auth.service';

// Owner: Lead (Fanyi Charllson)
// Every route that logs someone in answers { data: { user } } and sets the httpOnly cookie tp_session.
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

// The app sends the Google ID token; the server checks it with Google, then sets the same cookie
authRouter.post('/google', authLimiter, validate({ body: googleSchema }), async (req, res) => {
  const user = await authService.loginWithGoogle(req.body.idToken);
  setSessionCookie(res, user);
  res.json({ data: { user: authService.publicUser(user) } });
});

// Step 1: a 6-digit code goes by SMS to the phone of the account (same answer if the email is unknown)
authRouter.post('/password/forgot', authLimiter, validate({ body: forgotPasswordSchema }), async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res.json({ data: { ok: true } });
});

// Step 2: code + new password. Every old session ends, this device is logged in.
authRouter.post('/password/reset', authLimiter, validate({ body: resetPasswordSchema }), async (req, res) => {
  const user = await authService.resetPassword(req.body);
  setSessionCookie(res, user);
  res.json({ data: { user: authService.publicUser(user) } });
});

// Logged in: other devices are logged out, this one gets a fresh cookie
authRouter.post('/password/change', authLimiter, requireAuth, validate({ body: changePasswordSchema }), async (req, res) => {
  const user = await authService.changePassword(req.user!.id, req.body);
  setSessionCookie(res, user);
  res.json({ data: { user: authService.publicUser(user) } });
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
