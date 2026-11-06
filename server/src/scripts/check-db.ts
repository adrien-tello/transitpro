// npm run db:check
// Tells you if the server can reach the database. Never prints the connection string.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';

function describe(value: string): string {
  if (!value) return 'empty';
  if (value.startsWith('prisma+postgres://')) return 'Prisma Accelerate URL (prisma+postgres://)';
  if (value.startsWith('postgres://') || value.startsWith('postgresql://')) return 'PostgreSQL URL';
  return 'unknown format';
}

async function main() {
  console.log(`DATABASE_URL: ${describe(url)}`);
  if (!url) {
    console.log('Fill DATABASE_URL in server/.env first.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Connected to the database: OK');
    console.log(`Tables in the public schema: ${row?.count ?? 0}${Number(row?.count ?? 0) === 0 ? ' (run npm run db:migrate)' : ''}`);
  } catch (error) {
    // Only the error code and name: Prisma messages can contain the host and user
    const e = error as { errorCode?: string; code?: string; name?: string };
    console.log(`Could not connect. ${e.name ?? 'Error'} ${e.errorCode ?? e.code ?? ''}`.trim());
    console.log('Common causes: wrong password, missing ?sslmode=require, or a prisma+postgres:// URL instead of the direct postgres:// one.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
