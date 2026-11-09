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

Status: ✅ built · 🧱 stub (returns 501, owner builds it)

---

## Auth · Lead

| Method | Path | Who | Body | Returns | Screen | Status |
|---|---|---|---|---|---|---|
| POST | `/auth/register` | public | `fullName, email, phone, password` | `201 { user }` + cookie | Mobile · Create account | ✅ |
| POST | `/auth/login` | public | `email, password` | `{ user }` + cookie | Mobile · Log in, Web · Sign in | ✅ |
| POST | `/auth/google` | public | `idToken` (from Google on the device) | `{ user }` + cookie | Continue with Google | ✅ needs `GOOGLE_CLIENT_IDS`, answers 501 until set |
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

| Method | Path | Who | Purpose | Screen | Status |
|---|---|---|---|---|---|
| POST | `/parcels` | COUNTER_AGENT, BRANCH_MANAGER | Register: sender, receiver, contents, value, **weightKg, sealNumber, photoUrls**, delivery, insurance, COD, payment → tracking code | Web · Register a parcel | 🧱 |
| GET | `/parcels/track/:code` | public | Status + timeline, **no personal data** | Customer · Track parcel | 🧱 |
| GET | `/parcels/:id` | COUNTER_AGENT, BRANCH_MANAGER | Full detail: chain of custody, security checks, claims, escrow | Web · Parcel detail | 🧱 |
| POST | `/parcels/:id/scan` | COUNTER_AGENT, DRIVER, BRANCH_MANAGER | `{type: LOADED, tripId}` · `{type: DEPARTED}` · `{type: ARRIVED, weightKg}` (weight check) · `{type: HANDED_TO_COURIER, courierId}` | Staff scan, Web | 🧱 |
| POST | `/parcels/:id/deliver` | COURIER, COUNTER_AGENT | `otp, photoUrl, lat, lng` → DELIVERED, escrow released | Staff · Courier delivery | 🧱 |
| POST | `/parcels/:id/refuse` | COURIER, COUNTER_AGENT | `reason` → REFUSED + claim | Courier delivery, Customer "refuse and report" | 🧱 |

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
