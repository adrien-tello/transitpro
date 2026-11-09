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
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((e) => e.NODE_ENV !== 'production' || !/localhost/.test(e.CORS_ORIGINS), {
    message: 'In production CORS_ORIGINS must list the real website, not localhost',
    path: ['CORS_ORIGINS'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Field names and reasons only, never the values
  console.error('Invalid environment variables in server/.env:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
