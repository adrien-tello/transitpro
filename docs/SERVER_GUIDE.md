# Server guide for Joy and Sweet

You do not need to know everything about Express. You need to repeat one recipe: **build one endpoint at a time**.

## What is an endpoint?

An address the apps call to do one thing. Example: the customer app calls
`GET /api/booking/trips/search?from=Douala&to=Yaoundé&date=2026-11-03`
and the server answers with the list of trips. Your endpoints are listed in `docs/API.md` (Joy: sections Booking and HR, Sweet: sections Fleet and Finance).

## Setup (once)

```bash
git clone https://github.com/fanyicharllson/transitpro.git
cd transitpro/server
npm install
```
Ask Charllson for the `.env` file (it holds the database password; never send it in the group, never commit it). Put it in `server/`. Then:
```bash
npm run db:check     # must say "Connected to the database: OK"
npm run dev          # server runs on http://localhost:4000/api/health
```
Demo accounts: see `server/README.md` (password `Password123`).

## The recipe for one endpoint

Every module has 3 files. Look at `src/modules/auth/` to see a finished example.

1. **Branch:** `git checkout -b feat/booking-search-trips`
2. **Rules of the input** in `<module>.schemas.ts`: what fields are allowed (Zod).
3. **The work** in `<module>.service.ts`: read or save in the database with `prisma`. Always filter by the agency of the logged-in user.
   **What you return is already decided:** open `contracts/api-types.d.ts`, find your endpoint's type (e.g. `TripSearchResult`), and write it as the return type:
   `export async function searchTrips(...): Promise<TripSearchResult[]>`. `contracts/mocks.ts` shows an example. If you forget a field, `npm run typecheck` tells you, before the screens break.
4. **The door** in `<module>.routes.ts`: replace the `throw notImplemented(...)` line: check the role, validate, call your service, answer `{ data }`.
5. **Test it** with Thunder Client (VS Code extension) or Postman: log in first with a demo account, then call your endpoint.
6. **Save:** `npm run typecheck`, then commit, push your branch, open a Pull Request. Charllson reviews.

## Asking an AI agent to help

Copy this, change the endpoint:

> Read AGENTS.md and docs/API.md first. Work only in server/src/modules/booking.
> Build the endpoint `GET /booking/trips/search` exactly as described in docs/API.md.
> Follow the same style as src/modules/auth (schemas, service, routes).
> Keep requireAuth / requireRole and Zod validation. Do not change schema.prisma.
> Explain what you changed in simple words.

Then read what it wrote, run it, and test it yourself before you commit.

## Which endpoints first

| Joy | Sweet |
|---|---|
| 1. `GET /booking/trips/search` | 1. `GET/POST /fleet/buses` |
| 2. `GET /booking/trips/:id/seats` | 2. `POST /fleet/maintenance` (bus goes IN_MAINTENANCE) |
| 3. `POST /booking/tickets` | 3. `finance.service`: `recordPayment`, `recordExpense` |
| 4. `POST /hr/invites` + `/hr/invites/:token/accept` | 4. `GET /finance/summary` (dashboard numbers) |
| 5. `GET /hr/employees` | 5. `GET /finance/remittances` |

Stuck more than a day? Say it in the group.
