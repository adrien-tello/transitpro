import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { globalLimiter, noStore, originCheck, requireJson } from './middleware/security';
import { authRouter } from './modules/auth/auth.routes';
import { agenciesRouter } from './modules/agencies/agencies.routes';
import { bookingRouter } from './modules/booking/booking.routes';
import { fleetRouter } from './modules/fleet/fleet.routes';
import { parcelsRouter } from './modules/parcels/parcels.routes';
import { hrRouter } from './modules/hr/hr.routes';
import { financeRouter } from './modules/finance/finance.routes';

export const app = express();

app.set('trust proxy', 1); // correct client IP behind Railway / Render (rate limiting)
app.disable('x-powered-by');

// Security headers (no sniffing, no framing, HSTS in production...)
app.use(helmet());
// credentials: true lets the browser send the httpOnly session cookie.
// Only origins listed in CORS_ORIGINS may call the API with cookies.
app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()), credentials: true }));
app.use(globalLimiter);
app.use(originCheck);
app.use(requireJson);
app.use(cookieParser());
app.use(express.json({ limit: '100kb', strict: true }));
app.use(noStore);
// Never log cookies or bodies: they contain sessions and personal data
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', time: new Date().toISOString() } });
});

// One router per module. Mount new modules here.
app.use('/api/auth', authRouter);
app.use('/api/agencies', agenciesRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/fleet', fleetRouter);
app.use('/api/parcels', parcelsRouter);
app.use('/api/hr', hrRouter);
app.use('/api/finance', financeRouter);

app.use(notFoundHandler);
app.use(errorHandler);
