import 'dotenv/config';
import { z } from 'zod';

// All environment variables are read and checked here, once.
// Other files import `env` instead of reading process.env directly.
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is missing in server/.env'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables. Copy server/.env.example to server/.env and fill it in.');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
