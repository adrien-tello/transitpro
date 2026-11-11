import 'dotenv/config';
import { z } from 'zod';

// All environment variables are read and checked here, once.
// Other files import `env` instead of reading process.env directly.
const schema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is empty in server/.env')
      .refine((v) => /^postgres(ql)?:\/\//.test(v), 'Use the direct postgres:// connection string (not prisma+postgres://)'),
    PORT: z.coerce.number().default(4000),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
    // Google sign-in: the OAuth client IDs (web, Android, iOS), comma-separated.
    // Empty = "Continue with Google" answers 501 until it is set.
    GOOGLE_CLIENT_IDS: z.string().default(''),
    // Emails (codes, notices) are sent from one Gmail account through Gmail SMTP: free,
    // about 500 emails a day, to ANY address. SMTP_PASS is a Google "App password"
    // (16 letters), never the real Gmail password. Empty = emails printed in the terminal.
    SMTP_USER: z.string().trim().default(''),
    SMTP_PASS: z
      .string()
      .default('')
      .transform((v) => v.replace(/\s/g, '')), // Google shows it as "abcd efgh ijkl mnop"
    EMAIL_FROM_NAME: z.string().default('TransitPro'),
    // Web dashboard address, used for the buttons in emails
    WEB_URL: z.string().url().default('http://localhost:5173'),
    // Mobile Money (MTN, Orange) through Notch Pay. Test keys start with pk_test / sk_test / hsk_test.
    // Empty = Mobile Money answers 503 and only cash works.
    NOTCHPAY_PUBLIC_KEY: z.string().trim().default(''),
    NOTCHPAY_PRIVATE_KEY: z.string().trim().default(''),
    NOTCHPAY_HASH_KEY: z.string().trim().default(''), // checks that a webhook really comes from Notch Pay
    // Minutes a Mobile Money payment may stay PENDING before we give up (the phone prompt expires)
    PAYMENT_TIMEOUT_MINUTES: z.coerce.number().int().min(2).max(60).default(15),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((e) => e.NODE_ENV !== 'production' || !/localhost/.test(e.CORS_ORIGINS), {
    message: 'In production CORS_ORIGINS must list the real website, not localhost',
    path: ['CORS_ORIGINS'],
  })
  // Online, codes must really be emailed, never printed in the logs
  // Online, never with sandbox keys, and never live keys while developing
  .refine((e) => !e.NOTCHPAY_PUBLIC_KEY || (e.NODE_ENV === 'production') !== /test/.test(e.NOTCHPAY_PUBLIC_KEY), {
    message: 'Use Notch Pay TEST keys while developing and LIVE keys only in production',
    path: ['NOTCHPAY_PUBLIC_KEY'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || (e.SMTP_USER.length > 0 && e.SMTP_PASS.length > 0), {
    message: 'In production SMTP_USER and SMTP_PASS are required (codes are sent by email)',
    path: ['SMTP_USER'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Field names and reasons only, never the values
  console.error('Invalid environment variables in server/.env:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
