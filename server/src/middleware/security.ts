import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { HttpError } from '../lib/http-error';

const allowedOrigins = new Set(env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean));
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function tooMany(_req: Request, res: Response) {
  res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down and try again later' } });
}

// Whole API: 300 requests per 15 minutes per IP (stops scraping and floods)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany,
});

// Login / sign-up: 10 tries per 15 minutes per IP (stops password guessing)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooMany,
});

// CSRF protection for cookie sessions.
// A browser always sends Origin on cross-site writes. If it is not one of our apps, refuse.
// (The mobile app and server-to-server calls send no Origin: they are not browsers, CSRF does not apply.)
export function originCheck(req: Request, _res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return next(new HttpError(403, 'BAD_ORIGIN', 'Requests from this website are not allowed'));
  }
  next();
}

// Writes must be JSON. HTML forms cannot send application/json without a CORS preflight,
// so this also blocks form-based CSRF and keeps parsing predictable.
export function requireJson(req: Request, _res: Response, next: NextFunction) {
  if (!WRITE_METHODS.has(req.method)) return next();
  // Photo uploads send the image itself; the uploads route checks the type and the bytes
  if (req.method === 'POST' && req.path === '/api/uploads') return next();
  // Agency documents: same, the documents route checks the type (image or PDF) and the bytes
  if (req.method === 'PUT' && /^\/api\/agencies\/me\/documents\/[A-Z_]+$/.test(req.path)) return next();
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (hasBody && !req.is('application/json')) {
    return next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the body as JSON (Content-Type: application/json)'));
  }
  next();
}

// API responses contain personal data: never let a browser or proxy cache them
export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
