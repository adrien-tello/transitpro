# TransitPro · test accounts

Demo accounts from the seed (`server/prisma/seed.ts`). **Every password is `Password123`.**
They exist in the shared development database. To create them again: `cd server && npm run db:seed` (safe to run many times).

> Test accounts only. Never put a real password, an API key or the `.env` in this file.

## Where to log in

| What | Address |
|---|---|
| Web dashboard | http://localhost:5173 (run `server` → `npm run dev`, then `web` → `npm run dev`) |
| API | http://localhost:4000/api |
| API docs | `docs/API.md` |

## Accounts

Agency: **Étoile Voyages** (verified). Branches: **Douala · Akwa** and **Yaoundé · Mvan**.

| Email | Name | Role | Branch | App | What they see |
|---|---|---|---|---|---|
| `admin@transitpro.test` | Platform Admin | TransitPro team (**master admin**) | — | Web | Overview, agencies to verify, the whole platform, Revenue + withdraw |
| `owner@etoile.test` | Agency Owner | Agency owner | all branches | Web | The full sidebar, every branch, Branches page |
| `manager@etoile.test` | Alice Ngo | Branch manager | Douala · Akwa | Web | Dashboard, parcels, trips, fleet, staff, finance, reports |
| `mvan.manager@etoile.test` | Grace Mballa | Branch manager | Yaoundé · Mvan | Web | Same, for Mvan (releases parcels on hold there) |
| `agent@etoile.test` | Carine Ndoumbe | Counter agent | Douala · Akwa | Web | Dashboard, parcels (register, scan), trips |
| `mvan.agent@etoile.test` | Paul Essomba | Counter agent | Yaoundé · Mvan | Web | Receives parcels in Yaoundé (re-weighs on arrival) |
| `fleet@etoile.test` | Eric Tchinda | Fleet manager | Douala · Akwa | Web | Live tracking, schedule, fleet, reports |
| `hr@etoile.test` | Sandrine Mbida | HR officer | Douala · Akwa | Web | Staff |
| `accountant@etoile.test` | Joseph Kamga | Accountant | Douala · Akwa | Web | Finance, reports |
| `driver@etoile.test` | Jean Fotso | Driver | Douala · Akwa | Staff app | Web says "use the mobile app" |
| `courier@etoile.test` | Bernard Atangana | Courier | Yaoundé · Mvan | Staff app | Delivers parcels (code + photo + GPS) |
| `customer@transitpro.test` | Marie Ekane | Customer | — | Customer app | Web says "use the mobile app" |

Each person sees only the menu entries of their job; the server checks the role again on every request.

## A parcel from start to finish (who does what)

1. `agent@etoile.test` registers the parcel in Douala (photos, weight, seal). Write down the **delivery code**: it is shown once.
2. `agent@etoile.test` (or the driver in the staff app) scans **Loaded**, then **Departed**.
3. `mvan.agent@etoile.test` scans **Arrived** in Yaoundé and weighs it again. More than 0.1 kg of difference puts it **On hold**.
4. On hold: `mvan.manager@etoile.test` checks it and releases it (a new delivery code is made).
5. `mvan.agent@etoile.test` gives it to the courier, or hands it over at the counter with the receiver's code.

## Mobile Money test numbers (Notch Pay sandbox, no real money)

| Number | Result |
|---|---|
| `670000000` (any 6x0000000) | Payment succeeds |
| `670000002` | Fails |
| `670000003` | Expires |
| `670000004` | Cancelled by the payer |

## Demo data already in the database

Parcels `TP-DOU-UFUMV` (paid cash) and `TP-DOU-FCKDY` (paid MTN MoMo), both registered in Douala for Yaoundé.

## Money settings (server `.env`, optional)

| Variable | Default | What |
|---|---|---|
| `PAYOUT_MINIMUM` | 5000 | Smallest payout / withdrawal (FCFA) |
| `BADGE_PRICE` / `BADGE_MONTHS` | 25000 / 12 | Optional Verified badge |
| `TRANSITPRO_PAYOUT_NAME`, `TRANSITPRO_PAYOUT_PHONE`, `TRANSITPRO_PAYOUT_CHANNEL` | empty | TransitPro's own Mobile Money account for the master admin's withdrawals (`cm.mtn` or `cm.orange`; sandbox: `670000000`) |

## Google sign-in

Works with the Google accounts added as test users in Google Cloud (project `transitpro-514302`, Testing mode). Send your Gmail address to the Lead to be added.
