import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AgencyStatus, Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { forbidden, unauthorized } from '../lib/http-error';

// Login session lives in an httpOnly cookie:
//   - JavaScript in the browser cannot read it (protects against XSS token theft)
//   - the browser and React Native send it automatically (fetch with credentials: 'include')
//   - the token is never stored in localStorage / AsyncStorage
// The cookie only holds the user id and a version number. Role, agency and
// active status are read from the database on every request, so a role change,
// a deactivated account or "log out everywhere" takes effect immediately.
export const SESSION_COOKIE = 'tp_session';

const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

interface SessionPayload {
  sub: string; // user id
  tv: number; // user.tokenVersion when the session was created
}

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

export function setSessionCookie(res: Response, user: { id: string; tokenVersion: number }) {
  const payload: SessionPayload = { sub: user.id, tv: user.tokenVersion };
  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(res: Response) {
  const { maxAge: _m, ...options } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
}

// Checks the session cookie, then loads the user from the database and puts it on req.user
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.[SESSION_COOKIE];
  if (!token) throw unauthorized();

  let payload: SessionPayload;
  try {
    // algorithms pinned: a token signed any other way is refused
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as unknown as SessionPayload;
  } catch {
    clearSessionCookie(res);
    throw unauthorized('Your session has expired, please log in again');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      role: true,
      agencyId: true,
      isActive: true,
      tokenVersion: true,
      employee: { select: { id: true, active: true } },
      agency: { select: { status: true } },
    },
  });

  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    clearSessionCookie(res);
    throw unauthorized('Your session has ended, please log in again');
  }
  if (user.employee && !user.employee.active) {
    clearSessionCookie(res);
    throw forbidden('This staff account has been deactivated by your agency');
  }

  req.user = {
    id: user.id,
    role: user.role,
    agencyId: user.agencyId,
    agencyStatus: user.agency?.status ?? null,
    employeeId: user.employee?.id ?? null,
  };
  next();
}

// Role-based access control. Use after requireAuth:
//   router.post('/', requireRole('COUNTER_AGENT', 'BRANCH_MANAGER'), handler)
// AGENCY_OWNER can do everything inside their own agency; PLATFORM_ADMIN everywhere.
// Services must STILL filter by agencyId so one agency never sees another agency's data.
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) return next(unauthorized());
    if (role === 'PLATFORM_ADMIN' || roles.includes(role)) return next();
    // The owner passes staff checks, but never TransitPro-team checks
    // (an owner must not be able to approve their own agency)
    if (role === 'AGENCY_OWNER' && !roles.includes('PLATFORM_ADMIN')) return next();
    next(forbidden());
  };
}

// TransitPro team only: agency verification, commission rates
export const requirePlatformAdmin = requireRole('PLATFORM_ADMIN');

// The master admin only (withdrawing TransitPro's money). Read from the database on every call.
export async function requireMasterAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'PLATFORM_ADMIN') throw forbidden('Only the TransitPro team can do this');
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isMasterAdmin: true } });
  if (!u?.isMasterAdmin) throw forbidden('Only the master admin can withdraw the platform money');
  next();
}

const AGENCY_BLOCKED: Record<Exclude<AgencyStatus, 'APPROVED'>, string> = {
  PENDING: 'Your agency is waiting for verification by TransitPro',
  REJECTED: 'Your agency was not approved by TransitPro',
  SUSPENDED: 'Your agency is suspended, contact TransitPro',
};

// Staff routes: the agency of the logged-in user (never trust an agencyId sent by the client).
// Only a verified (APPROVED) agency can work: sell tickets, register parcels, pay staff...
// The owner's sign-up screens (documents, first branches) pass { allowPending: true }.
export function agencyIdOf(req: Request, options: { allowPending?: boolean } = {}): string {
  const agencyId = req.user?.agencyId;
  const status = req.user?.agencyStatus;
  if (!agencyId || !status) throw forbidden('This account does not belong to an agency');
  if (status === 'APPROVED' || (options.allowPending && status === 'PENDING')) return agencyId;
  throw forbidden(AGENCY_BLOCKED[status]);
}

export function employeeIdOf(req: Request): string {
  const employeeId = req.user?.employeeId;
  if (!employeeId) throw forbidden('This account is not an agency employee');
  return employeeId;
}
