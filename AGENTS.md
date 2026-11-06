# TransitPro: rules for the team and for AI coding agents

Read this file before writing any code. If you use an AI agent (Claude Code, Cursor, Copilot, Codex...), point it at this file first. Everything here is mandatory.

- Team plan, owners and deadlines: [docs/TEAM_PLAN.md](docs/TEAM_PLAN.md)
- API contract (what every endpoint takes and returns): [docs/API.md](docs/API.md)
- UI design (web, customer app, staff app): https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
- Database (the single source of truth): [server/prisma/schema.prisma](server/prisma/schema.prisma)

## 1. What we are building

TransitPro is a SaaS for intercity bus agencies in Cameroon. Five modules share **one PostgreSQL database**:

| # | Module | Server folder | Writes the server code | Draws the UML |
|---|---|---|---|---|
| 1 | Booking & Ticketing | `server/src/modules/booking` | Joy | Adrien Tello |
| 2 | Fleet & Maintenance | `server/src/modules/fleet` | Sweet | Ngwese Fidel |
| 3 | Parcel & Courier | `server/src/modules/parcels` | Fanyi Charllson (Lead) | Fanyi Charllson |
| 4 | Human Resources | `server/src/modules/hr` | Joy | Joy |
| 5 | Finance & Reporting | `server/src/modules/finance` | Sweet | Sweet |
| – | Auth, agencies (SaaS), shared code | `server/src/modules/auth`, `agencies`, `lib`, `middleware` | Lead | – |

Interfaces: **web/** Lead (Adrien and Fidel join after mobile) · **mobile/** Adrien (customer screens) and Fidel (staff screens).

## 2. Repository layout

```
transitpro/
  server/   Express + TypeScript + Prisma. The ONLY thing that talks to the database.
  web/      Agency dashboard. React + Vite + Tailwind. Talks to server/ only.
  mobile/   Expo app. Customer screens + staff screens (role decides). Talks to server/ only.
  contracts/ Shared response types + mock data (server and screens use the same shapes).
  docs/     Team plan, API contract, UML diagrams.
```

Web and mobile **never** contain business rules that the server does not also enforce. The server is the source of truth.

## 3. Server rules (Express)

### Module shape (copy `modules/parcels`)

```
modules/<name>/
  <name>.schemas.ts   Zod schemas for every request body / query / params
  <name>.service.ts   Business rules + Prisma queries. No req/res here.
  <name>.routes.ts    HTTP only: validate -> requireAuth/requireRole -> call service -> respond
```

- Routes are thin. All logic lives in the service.
- Every input is validated with Zod through `validate({ body, query, params })`. Never read `req.body` unvalidated.
- Responses: success `{ "data": ... }`. Errors are thrown as `HttpError` (see `lib/http-error.ts`) and leave as `{ "error": { "code", "message", "details" } }`. Do not build error JSON by hand.
- Express 5 catches errors from `async` handlers. Do not wrap handlers in try/catch just to call `next(err)`.
- New router? Mount it in `server/src/app.ts`.

### Modules talk through services, never through each other's tables

- You may **read** any table you need.
- You may only **write** the tables of your own module. To change another module's data, call that module's service.
  - Booking and Parcels record money with `finance.service.recordPayment(tx, ...)`.
  - Fleet and HR record costs with `finance.service.recordExpense(tx, ...)`.
- When one action writes several tables, use `prisma.$transaction(async (tx) => ...)` and pass `tx` to the other module's service.
- This is how the modules are "interconnected through the central database". Keep it this way: it is what we show in the sequence diagrams.

### Database

- `server/prisma/schema.prisma` is shared. **Do not edit models you do not own** without telling the Lead in the group first. Changing the schema = run `npm run db:migrate` and commit the migration folder.
- Money is an `Int` in FCFA. Never use floats for money.
- IDs are `cuid()` strings. Never expose auto-increment numbers.
- Append-only tables (`ParcelEvent`) are never updated or deleted.

### Response shapes: `contracts/`

- `contracts/api-types.d.ts` defines the exact fields of every response. Services return these types (`import type { ... } from '@contracts/api-types'`, type-only imports).
- `contracts/mocks.ts` holds example values from the design. Screens use them until the endpoint exists, then swap to `api()`.
- A screen needs a new field? Add it to the type in a Pull Request and tell the server owner. Never change the shape on one side only.

## 4. Security (non-negotiable)

1. **Login session = httpOnly cookie** named `tp_session` (see `middleware/auth.ts`).
   - Never put the token in the JSON response, localStorage, AsyncStorage or a URL.
   - Web and mobile call the API with `credentials: 'include'` (already done in `web/src/lib/api.ts` and `mobile/src/lib/api.ts`).
2. **Role-based access control on every non-public route**: `requireAuth` then `requireRole(...)`. Pick the smallest list of roles that need it.
3. **Agency isolation**: staff can only see their own agency. In services, always filter with the agencyId from `agencyIdOf(req)`. **Never trust an `agencyId`, `role` or `employeeId` sent by the client.**
4. **Customers can never become staff.** Staff accounts are only created by HR invites.
5. Secrets (OTP codes, invite tokens) are stored **hashed** (`sha256` in `lib/codes.ts`). Passwords use bcrypt.
6. Public endpoints (tracking, agency list) return **no names, phone numbers or photos**.
7. Never commit `.env`. Never log passwords, codes or tokens.
8. Already enforced in `middleware/security.ts` and `app.ts`, do not remove: rate limits (300 req / 15 min, 10 logins / 15 min), Origin check on writes (CSRF), JSON-only writes, 100 kb body limit, `Cache-Control: no-store`, helmet headers. Sessions are checked against the database on every request, so a deactivated account or `POST /auth/logout-all` ends sessions at once.
9. Compare codes with `matchesHash()` from `lib/codes.ts`, never with `===`.

## 5. Web rules (`web/`)

- React + TypeScript + Tailwind v4. Colors come from the tokens in `src/styles/index.css` (`bg-primary`, `text-ink`, `bg-accent`...). No random hex values.
- Data fetching: TanStack Query + `api()` from `src/lib/api.ts`. No direct `fetch` in components.
- One folder per module in `src/modules/<module>/` (pages, components, queries). Shared UI in `src/components/`.
- Match the design canvas (page "Web dashboard"). If a screen needs data the API does not give, ask the module owner to add it to `docs/API.md` first.

## 6. Mobile rules (`mobile/`)

- Expo SDK 54 + Expo Router. After cloning: `npm install` then `npx expo install --fix`.
- Routes: `app/(auth)` login/sign-up, `app/(customer)` customer app, `app/(staff)` driver/courier app, `app/invite/[token]` staff invite. The role returned by `GET /api/auth/me` decides which group opens.
- Customers must never see staff screens or staff wording.
- Data: TanStack Query + `api()` from `src/lib/api.ts`. No tokens in storage: the cookie does it.
- Match the design canvas (pages "Customer app" and "Staff app").

## 7. Code style

- TypeScript strict everywhere. No `any` unless you write why in a comment.
- Names: files `kebab-case.ts`, React components `PascalCase.tsx`, functions `camelCase`, enums and roles `UPPER_CASE` (same as Prisma).
- Small functions with clear names. Comment the **why** (business rule), not the obvious.
- English in code and comments. User-facing text can be French or English.
- Run `npm run typecheck` in the folder you changed before every commit.

## 8. Git workflow

- `main` is protected by habit: **never push directly to main**.
- One branch per task: `feat/<module>-<short-name>` (e.g. `feat/booking-seat-map`), `fix/<module>-<short-name>`, `docs/<name>`.
- Commit messages: `feat(booking): seat map endpoint`, `fix(fleet): block trips on bus in maintenance`, `docs(uml): parcel sequence diagram`.
- Open a Pull Request to `main`. The Lead reviews and merges.
- Pull `main` every morning: `git pull origin main`.

## 9. For AI agents specifically

- Stay inside the module you were asked to work on. Do not "improve" other modules.
- Follow the API contract in `docs/API.md` exactly (paths, field names, response shape). If it must change, say so instead of silently changing it.
- Do not add new libraries without a reason written in the PR description.
- Do not edit `schema.prisma` models owned by someone else.
- Do not disable TypeScript checks, Zod validation, `requireAuth` or `requireRole` to make something work.
