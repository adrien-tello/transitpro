import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { forbidden, unauthorized } from '../lib/http-error';
import type { AuthUser } from '../types/express';

// Login session lives in an httpOnly cookie:
//   - JavaScript in the browser cannot read it (protects against XSS token theft)
//   - the browser and React Native send it automatically (fetch with credentials: 'include')
//   - the token is never stored in localStorage / AsyncStorage
export const SESSION_COOKIE = 'tp_session';

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

function cookieOptions(): CookieOptions {
  const production = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production, // HTTPS only in production
    sameSite: production ? 'none' : 'lax', // 'none' lets the web dashboard on another domain send it (needs secure)
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  };
}

export function setSessionCookie(res: Response, user: AuthUser) {
  const token = jwt.sign(user, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res: Response) {
  const { maxAge: _m, ...options } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

// Reads the session cookie and puts the user on req.user
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(unauthorized());
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, role: payload.role, agencyId: payload.agencyId, employeeId: payload.employeeId };
    next();
  } catch {
    next(unauthorized('Your session has expired, please log in again'));
  }
}

// Role-based access control. Use after requireAuth:
//   router.post('/', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), handler)
// AGENCY_OWNER can do everything inside their own agency; PLATFORM_ADMIN everywhere.
// Services must STILL filter by agencyId so one agency never sees another agency's data.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return next(unauthorized());
    if (role === 'PLATFORM_ADMIN' || role === 'AGENCY_OWNER' || roles.includes(role)) return next();
    next(forbidden());
  };
}

// Staff routes: the agency of the logged-in user (never trust an agencyId sent by the client)
export function agencyIdOf(req: Request): string {
  const agencyId = req.user?.agencyId;
  if (!agencyId) throw forbidden('This account does not belong to an agency');
  return agencyId;
}

export function employeeIdOf(req: Request): string {
  const employeeId = req.user?.employeeId;
  if (!employeeId) throw forbidden('This account is not an agency employee');
  return employeeId;
}
