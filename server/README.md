# TransitPro server

Express 5 + TypeScript + Prisma (PostgreSQL). The only part of the project that touches the database.

## First run

```bash
cd server
npm install
cp .env.example .env        # then put the DATABASE_URL the Lead shares in the group
npm run db:check            # says if the database is reachable (never prints the URL)
npm run db:generate
npm run db:migrate          # creates the tables (only the Lead runs this on the shared cloud DB)
npm run db:seed             # demo agency + one account per role, password: Password123
npm run dev                 # http://localhost:4000/api/health
```

If npm says install scripts were skipped, the approvals are already in `package.json` (`allowScripts`); run `npm rebuild`.

## Demo accounts (after seeding)

| Email | Role |
|---|---|
| admin@transitpro.test | PLATFORM_ADMIN |
| owner@etoile.test | AGENCY_OWNER |
| manager@etoile.test | BRANCH_MANAGER |
| agent@etoile.test | COUNTER_AGENT |
| driver@etoile.test | DRIVER |
| courier@etoile.test | COURIER |
| customer@transitpro.test | CUSTOMER |

## Folders

```
prisma/schema.prisma      central database (all modules)
prisma/seed.ts            demo data
src/app.ts                middleware + module routers
src/config/env.ts         environment variables (checked at start)
src/lib/                  prisma client, HttpError, codes (tracking, OTP, hashing), sms
src/middleware/           auth cookie + requireRole, validate (Zod), error handler
src/modules/<module>/     <module>.schemas.ts · <module>.service.ts · <module>.routes.ts
```

Rules: [../AGENTS.md](../AGENTS.md) · Endpoints: [../docs/API.md](../docs/API.md)
