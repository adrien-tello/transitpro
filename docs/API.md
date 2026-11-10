# TransitPro API contract

Base URL: `http://localhost:4000/api` (dev). Web dev server proxies `/api` to it.

This file is the agreement between the server, the web dashboard and the mobile app. **Change it before you change an endpoint**, and tell the people whose screens use it.

**Exact response fields:** [contracts/api-types.d.ts](../contracts/api-types.d.ts) (one type per endpoint, with the screen that shows it).
**Example values from the design:** [contracts/mocks.ts](../contracts/mocks.ts). The server must return exactly this shape; the screens use these mocks until the endpoint is ready.

## Conventions

| Topic | Rule |
|---|---|
| Auth | httpOnly cookie `tp_session` (7 days), set by every route that logs someone in (see Auth below). Clients send `credentials: 'include'`. Never store a token yourself. |
| Success | `200/201 { "data": <object or array> }` |
| Error | `{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid", "details": {...} } }` |
| Codes | `400 BAD_REQUEST / VALIDATION_ERROR / BAD_JSON`, `401 UNAUTHORIZED`, `403 FORBIDDEN / BAD_ORIGIN`, `404 NOT_FOUND`, `409 CONFLICT`, `413 TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `429 TOO_MANY_REQUESTS`, `501 NOT_IMPLEMENTED` |
| Writes | POST / PUT / PATCH / DELETE bodies must be `Content-Type: application/json`, max 100 kb |
| Lists | `?page=1&limit=20` → `{ "data": { "items": [...], "page": 1, "limit": 20, "total": 134 } }` |
| Money | Integer FCFA (`6000`, never `6000.00`) |
| Dates | ISO 8601 UTC strings (`2026-11-03T07:00:00.000Z`) |
| IDs | cuid strings |

Roles: `CUSTOMER, COUNTER_AGENT, DRIVER, COURIER, BRANCH_MANAGER, FLEET_MANAGER, HR_OFFICER, ACCOUNTANT, AGENCY_OWNER, PLATFORM_ADMIN`.
`AGENCY_OWNER` passes every staff role check inside their agency (never the `PLATFORM_ADMIN` ones), `PLATFORM_ADMIN` everywhere.
Staff of an agency that is not `APPROVED` can log in, but every agency route answers `403` ("Your agency is waiting for verification by TransitPro").

Messages: all codes and notices go by **email**, sent from the project Gmail account (Gmail SMTP, free, ~500 a day, to any address). No SMS: no free provider reaches Cameroon numbers.

| Email | Sent when | Module file |
|---|---|---|
| Welcome | `/auth/register`, first `/auth/google` | `auth.emails.ts` |
| Reset code (6 digits, 10 min) | `/auth/password/forgot` | `auth.emails.ts` |
| Password changed (security notice) | `/auth/password/reset`, `/auth/password/change` | `auth.emails.ts` |
| Application received (documents list) | `/agencies/register`, to the owner | `agencies.emails.ts` |
| Agency verified / not verified (with reason) | admin approve / reject, to the agency contact | `agencies.emails.ts` |

New emails (staff invite, ticket, parcel...): write them in `<module>.emails.ts` like `auth.emails.ts`, then `queueEmail(yourEmail(...))` in the service. Never build HTML yourself.

Status: ✅ built · 🧱 stub (returns 501, owner builds it)

---

## Auth · Lead

| Method | Path | Who | Body | Returns | Screen | Status |
|---|---|---|---|---|---|---|
| POST | `/auth/register` | public | `fullName, email, phone, password` | `201 { user }` + cookie | Mobile · Create account | ✅ |
| POST | `/auth/login` | public | `email, password` | `{ user }` + cookie | Mobile · Log in, Web · Sign in | ✅ |
| POST | `/auth/google` | public | `idToken` (from Google on the device) | `{ user }` + cookie | Continue with Google | ✅ tested with a real Google account |
| POST | `/auth/password/forgot` | public | `email` | `{ ok: true }`, 6-digit code by **email** | Forgot password | ✅ |
| POST | `/auth/password/reset` | public | `email, code, password` | `{ user }` + cookie | Forgot password · new password | ✅ |
| POST | `/auth/password/change` | logged in | `currentPassword, newPassword` | `{ user }` + fresh cookie | Profile · Security | ✅ |
| POST | `/auth/logout` | any | – | clears cookie | Profile, sidebar Log out | ✅ |
| POST | `/auth/logout-all` | logged in | – | ends every session of this user on all devices | Profile | ✅ |
| GET | `/auth/me` | logged in | – | user + agency (with `status`) + employee | app start | ✅ |

**Rules every screen must know**

| Situation | What the server does | What the screen shows |
|---|---|---|
| App starts | – | Call `GET /auth/me`. `401` → login screen. `role` = `CUSTOMER` → customer screens, any other role → staff screens. |
| Wrong email **or** password | `401` "Wrong email or password" (same message, so emails can't be guessed) | the message |
| Email or phone already used | `409` | "Log in instead?" |
| Bad fields | `400 VALIDATION_ERROR`, `details` = `{ field: [messages] }` | the message under each field |
| Passwords | 8 to 72 characters | – |
| Phones | spaces, dots and dashes are removed (`+237 6 70 00 00 00` → `+237670000000`) | – |
| Forgot password | always `{ ok: true }`, even for an unknown email. Code: 6 digits, **10 min**, 5 wrong tries, works once | "If this email has an account, we sent you a code. Check your inbox and spam." |
| Reset or change password | every **other** device is logged out | – |
| Any `401` later | the cookie is gone or ended | go back to the login screen |
| 10 login / sign-up / reset tries in 15 min from one IP | `429` | "Too many tries, wait a few minutes" |
| Dev testing | without `SMTP_USER` / `SMTP_PASS`, emails are printed in the **server terminal**, not sent | read the code there |

**Google sign-in for the apps**
- Web client ID (Google Cloud project `transitpro-514302`, client "TransitPro Web"): `556994393607-5l8a2rpeb7qv82ql30mu3pbrn56404c6.apps.googleusercontent.com`. It is public (it ships in the apps), not a secret.
- Web: Google Identity Services button with this client ID, send `credential` as `idToken`. Allowed origins: `http://localhost:5173`, `http://localhost:8081`.
- Mobile: use the **same web client ID** as `webClientId` in the Google sign-in library; the Android/iOS clients are created when the app has its package name (needs a development build, not Expo Go).
- The Google app is in **Testing**: only test users can sign in (Google Cloud > Google Auth Platform > Audience > Test users). Publishing needs a home page and privacy policy on our own domain.

## Agencies (SaaS) · Lead

| Method | Path | Who | Body / purpose | Returns | Screen | Status |
|---|---|---|---|---|---|---|
| GET | `/agencies` | public | Verified agencies only, `?q=&sort=rating` | `Paginated<AgencyListItem>` | Customer · Verified agencies | 🧱 |
| GET | `/agencies/:slug` | public | Profile, rating breakdown, today's departures | `AgencyProfile` | Customer · Agency profile | 🧱 |
| POST | `/agencies/register` | public | `{ agency: { name, headOffice, phone, email, rccmNumber?, niuNumber? }, owner: { fullName, email, phone, password } }` | `201 AgencyRegistered` + cookie (owner logged in, agency `PENDING`) | Web · Register your agency | ✅ |
| POST | `/agencies/me/documents` | AGENCY_OWNER | RCCM, NIU, CNI, licence files | | Web · Register (documents step) | 🧱 |
| GET/POST | `/agencies/me/branches` | owner / manager | Branches | | Web · settings, register parcel | 🧱 |
| GET | `/agencies/admin/pending` | PLATFORM_ADMIN | Waiting for verification, oldest first | `PendingAgency[]` | Platform admin | ✅ |
| POST | `/agencies/admin/:id/approve` | PLATFORM_ADMIN | – (email to the agency) | `{ id, name, slug, status }` | Platform admin | ✅ |
| POST | `/agencies/admin/:id/reject` | PLATFORM_ADMIN | `{ reason }` (email to the agency) | `{ id, name, slug, status }` | Platform admin | ✅ |

Web dashboard after login: if `me.agency.status` is `PENDING`, show the "waiting for verification" page (documents upload), not the dashboard.

## 1. Booking & Ticketing · Joy

| Method | Path | Who | Purpose | Screen | Status |
|---|---|---|---|---|---|
| GET | `/booking/trips/search?from=&to=&date=&sort=` | public | Trips of verified agencies with price, seats left, agency rating | Customer · Search results | 🧱 |
| GET | `/booking/trips/:id/seats` | public | Seat map: number, taken, front (+500) | Customer · Choose a seat | 🧱 |
| POST | `/booking/tickets` | CUSTOMER | `tripId, seatNumber, passengerName, passengerIdNumber, paymentMethod, payerPhone` → ticket + payment (via Finance) | Customer · Pay | 🧱 |
| GET | `/booking/tickets/mine` | CUSTOMER | My tickets (next trip first) | Customer · Home, E-ticket | 🧱 |
| POST | `/booking/tickets/:id/cancel` | CUSTOMER | Cancel before departure | E-ticket | 🧱 |
| POST | `/booking/reviews` | CUSTOMER | Rate a trip I travelled on (once per trip) | after trip | 🧱 |
| POST | `/booking/tickets/:code/board` | DRIVER, COUNTER_AGENT | Scan ticket QR at boarding | Staff · Driver Today | 🧱 |
| GET/POST | `/booking/routes` | BRANCH_MANAGER | Routes | Web · Trips & booking | 🧱 |
| GET/POST | `/booking/trips` | BRANCH_MANAGER | List / schedule trips. **Rejects** a bus not ACTIVE or a driver with an expired licence | Web · Trips, Dashboard departures | 🧱 |
| PATCH | `/booking/trips/:id/status` | BRANCH_MANAGER, DRIVER | BOARDING → DEPARTED → ARRIVED | Driver Today "Start trip" | 🧱 |

## 2. Fleet & Maintenance · Sweet

| Method | Path | Who | Purpose | Screen | Status |
|---|---|---|---|---|---|
| GET/POST | `/fleet/buses` | FLEET_MANAGER | Buses with status, next service | Web · Fleet | 🧱 |
| PATCH | `/fleet/buses/:id` | FLEET_MANAGER | Update bus | Web · Fleet | 🧱 |
| GET | `/fleet/buses/:id/maintenance` | FLEET_MANAGER | History | Web · Fleet | 🧱 |
| POST | `/fleet/maintenance` | FLEET_MANAGER | Open record → bus IN_MAINTENANCE → its future trips stop selling; cost → Finance expense | Dashboard "Bus needing attention" | 🧱 |
| POST | `/fleet/maintenance/:id/complete` | FLEET_MANAGER | Bus back to ACTIVE | Web · Fleet | 🧱 |
| POST | `/fleet/fuel` | FLEET_MANAGER, DRIVER | Fuel fill → Finance expense | Driver Today | 🧱 |
| POST | `/fleet/breakdowns` | DRIVER | Report breakdown on the road | Driver Today "Breakdown" | 🧱 |
| POST | `/fleet/trips/:tripId/location` | DRIVER | `lat, lng` every 30 s on a trip | Driver "Start trip · share location" | 🧱 |
| GET | `/fleet/live` | BRANCH_MANAGER, FLEET_MANAGER | Buses on the road + couriers out | Web · Live tracking, Dashboard map | 🧱 |

## 3. Parcel & Courier · Lead (answers the lecturer's questions)

`:id` = the parcel id **or the tracking code** (what the QR label contains), so the staff app can scan and call directly.
Every action below answers the full `ParcelDetail` (contracts), so the screen refreshes from the answer.

| Method | Path | Who | Body / purpose | Returns | Screen | Status |
|---|---|---|---|---|---|---|
| POST | `/parcels` | COUNTER_AGENT, BRANCH_MANAGER | sender/receiver (name, phone, email optional), `destinationBranchId`, contents, value, **`weightKg`, `sealNumber`, `photoUrls`** (1 to 6), `homeDelivery` + `deliveryAddress`, `insured`, `codAmount`, `paymentMethod` | `201 ParcelRegistered` = parcel + **`deliveryCode` (shown once)** | Web · Register a parcel → print label + receipt | ✅ |
| GET | `/parcels/track/:code` | public | Status + timeline, **no personal data** | `ParcelTracking` | Customer · Track parcel | ✅ |
| GET | `/parcels` | COUNTER_AGENT, BRANCH_MANAGER | `?status=&q=&page=&limit=` (q = tracking code or phone). Parcels leaving from or arriving at my branch; owner sees all | `Paginated<ParcelListItem>` | Web · Parcels | ✅ |
| GET | `/parcels/mine` | DRIVER, COURIER, agents | Parcels I hold right now | `ParcelListItem[]` | Staff app home | ✅ |
| GET | `/parcels/:id` | COUNTER_AGENT, BRANCH_MANAGER | Chain of custody, security checks, payments, escrow, claims | `ParcelDetail` | Web · Parcel detail | ✅ |
| POST | `/parcels/:id/scan` | COUNTER_AGENT, DRIVER, BRANCH_MANAGER | `{type: LOADED, tripId}` · `{type: DEPARTED}` · `{type: ARRIVED, weightKg}` · `{type: HANDED_TO_COURIER, courierId}` | `ParcelDetail` | Staff scan, Web | ✅ |
| POST | `/parcels/:id/cod-payment` | COURIER, COUNTER_AGENT | `{method}`: receiver pays the cash on delivery, money **held** in escrow | `ParcelDetail` | Courier delivery, counter | ✅ |
| POST | `/parcels/:id/deliver` | COURIER, COUNTER_AGENT | `otp` (4 digits). Courier also `photoUrl, lat, lng` | `ParcelDetail` (DELIVERED, escrow released) | Courier delivery, counter pickup | ✅ |
| POST | `/parcels/:id/refuse` | COURIER, COUNTER_AGENT | `reason` | `ParcelDetail` (REFUSED, claim, COD refunded) | Courier delivery, counter | ✅ |
| POST | `/parcels/:id/release-hold` | BRANCH_MANAGER (destination) | `note`: after checking a parcel ON_HOLD | `ParcelHoldReleased` = parcel + **new `deliveryCode`** | Web · Parcel detail | ✅ |

**The journey and its rules** (the server refuses anything out of order with a clear message)

```
REGISTERED ──LOADED──▶ LOADED ──DEPARTED──▶ IN_TRANSIT ──ARRIVED──▶ ARRIVED ──HANDED_TO_COURIER──▶ OUT_FOR_DELIVERY
 (origin agent)        (trip of the same    (driver of     (destination agent,      │                (courier = holder)
                        route, holder =      the trip)      re-weighs)             │                       │
                        the driver)                          │ > 0.1 kg difference  ▼ pickup at counter     ▼
                                                             └──▶ ON_HOLD       DELIVERED / REFUSED   DELIVERED / REFUSED
```

| Rule | Detail |
|---|---|
| Delivery code | 4 digits, made at registration, returned **once** in the register answer: print it on the **sender's receipt**, never on the label. Emailed to the sender/receiver if an email was given. Hash only on the server, valid 30 days, works once |
| 5 wrong codes | parcel ON_HOLD; only the destination branch manager can release it, which makes a **new** code |
| Custody | `currentHolder` is always one person: agent → driver (on LOADED) → destination agent (on ARRIVED) → courier. Only the courier holding it can deliver |
| Branch | origin agents load, destination agents receive and hand over. Owner can do everything |
| Seal | unique per agency (409 if reused). At least one photo |
| Cash on delivery | receiver pays first (`cod-payment`) → escrow HELD → RELEASED to the sender with the right code, REFUNDED if refused. TransitPro keeps no fee on this money |
| Price (provisional, `parcels.pricing.ts`) | 1000 + 250 per started kg + 1000 home delivery; insurance 2% of the declared value (min 500). TransitPro keeps `Agency.commissionRate` % (10%) as `platformFee` |
| Payment | cash = SUCCEEDED at once; MoMo / Orange Money = PENDING until the Finance webhook (Sweet) |

Test accounts: `agent@etoile.test` (Douala, origin), `driver@etoile.test`, `mvan.agent@etoile.test` and `mvan.manager@etoile.test` (Yaoundé, destination), `courier@etoile.test`. Password `Password123`. A trip Douala → Yaoundé must exist to load a parcel (Booking module).

## 4. Human Resources · Joy

| Method | Path | Who | Purpose | Screen | Status |
|---|---|---|---|---|---|
| GET | `/hr/employees` | HR_OFFICER, BRANCH_MANAGER | Staff list | Web · Staff | 🧱 |
| PATCH | `/hr/employees/:id` | HR_OFFICER | Branch, licence, salary, deactivate | Web · Staff | 🧱 |
| POST | `/hr/invites` | HR_OFFICER | `fullName, email, phone, role, branchId` → SMS + email link | Web · Staff "Add staff" | 🧱 |
| GET | `/hr/invites/:token` | public | Agency, role, email of the invite | Staff · Invite | 🧱 |
| POST | `/hr/invites/:token/accept` | public | `password` → creates User + Employee, sets cookie | Staff · Invite "Set password" | 🧱 |
| GET | `/hr/alerts/licences` | HR_OFFICER, BRANCH_MANAGER | Licences expiring in 30 days | Dashboard alert | 🧱 |
| POST | `/hr/payroll/run` | HR_OFFICER | Monthly salaries → Finance expenses | Web · Staff | 🧱 |

## 5. Finance & Reporting · Sweet

| Method | Path | Who | Purpose | Screen | Status |
|---|---|---|---|---|---|
| POST | `/finance/webhooks/payments` | payment provider | MoMo / OM confirmation | – | 🧱 |
| GET | `/finance/summary` | ACCOUNTANT, BRANCH_MANAGER | Revenue today, tickets vs parcels, cash to remit | Dashboard KPI cards | 🧱 |
| GET | `/finance/revenue?from=&to=&groupBy=day\|route\|bus` | ACCOUNTANT, BRANCH_MANAGER | Revenue chart | Dashboard chart, Web · Finance | 🧱 |
| GET | `/finance/payments` | ACCOUNTANT | Payments | Web · Finance | 🧱 |
| GET/POST | `/finance/expenses` | ACCOUNTANT | Expenses | Web · Finance | 🧱 |
| GET | `/finance/remittances` | ACCOUNTANT, BRANCH_MANAGER, COURIER | Cash each person must hand in | Courier "Cash to remit", Web | 🧱 |
| POST | `/finance/remittances/:id/close` | BRANCH_MANAGER | SETTLED or SHORT | Web · Finance | 🧱 |

Service functions other modules call (`finance.service.ts`): `recordPayment`, `holdInEscrow`, `releaseEscrowForParcel`, `recordExpense`.
