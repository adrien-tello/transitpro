# TransitPro · Staff app brief (for Fidel and his coding agent)

> **For the agent:** this file is the spec for the staff side of the TransitPro mobile app. Read it fully before
> writing code. Follow the existing project structure, the design values below, and the API contracts exactly.
> Ask the human when something here is unclear; do not invent endpoints or fields.

## 1. What you are building

The **staff app** is the part of the TransitPro mobile app used by **drivers** and **couriers** of a bus agency in
Cameroon. It lives in the same Expo app as the customer app: after login, the role decides which screens open.

| Role | What they do in the app |
|---|---|
| `DRIVER` | See today's trip, **scan passengers' tickets at boarding**, see the passenger list, scan parcels loaded on the bus, start the trip and share the bus location |
| `COURIER` | See today's deliveries, deliver a parcel (receiver's 4-digit code + photo + GPS), collect cash on delivery, record a refusal |
| both | Accept the invite and set a password (first time), profile, log out |

Counter agents, managers, owners, HR, accountants and the TransitPro team use the **web dashboard**, not this app.
Customers use the customer screens (built by Adrien).

## 2. Project facts (do not change these)

- Repo: `transitpro/` → mobile app in `mobile/`. Expo SDK 54, Expo Router v6, TypeScript, TanStack Query v5, Zustand.
  Read `mobile/README.md` first.
- **Your folders:**
  - `mobile/app/(staff)/` for routes
  - `mobile/app/invite/` for the invite screen
  - `mobile/src/modules/staff/` for queries, mocks and staff components
- Do not edit Adrien's `(customer)` and `(auth)` screens. Shared files (`src/theme/*`, `src/components/ui/*`, `src/lib/api.ts`)
  may be **extended**, never rewritten. Tell Adrien when you add to them.
- API calls: **only** through `api()` in `src/lib/api.ts`.
  - It sends the httpOnly session cookie (`credentials: 'include'`).
  - **Never store a token in AsyncStorage / SecureStore.**
- Types: import from `@contracts/api-types` (`contracts/api-types.d.ts`). That file is the agreement with the server.
- The role gate already exists in `mobile/app/_layout.tsx`:
  - `CUSTOMER` goes to `(customer)`
  - every other role goes to `(staff)`
  - **In `(staff)`, show a simple "Use the web dashboard" screen for roles other than DRIVER / COURIER**, with a Log out button.
- Server for local testing:
  - `cd server && npm run dev` serves `http://localhost:4000/api`.
  - On a phone, set `EXPO_PUBLIC_API_URL=http://<computer LAN IP>:4000/api` in `mobile/.env`.
- Test accounts (password `Password123`): `driver@etoile.test` (Jean Fotso), `courier@etoile.test` (Bernard Atangana, Yaoundé Mvan).
  All accounts: `docs/TEST-ACCOUNTS.md`.
- API reference: `docs/API.md`. Error format: `{ error: { code, message, details } }`. `api()` throws `ApiError(status, code, message, details)`.

## 3. Design (follow it exactly)

Design canvas, page **"Staff app (drivers, couriers)"**: https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
Screens drawn there:
- Invite · set password
- Courier · Today
- Courier · Delivery
- Driver · Today

Screens **not** drawn: Scan, Passenger list, Boarding result, Trips, Cash, Profile. Build them in the same style, using the rules below.

### Tokens

Add any missing ones to `src/theme/colors.ts` under a `// Staff app` comment. Never put raw hex in screens.

| Token | Value | Used for |
|---|---|---|
| background | `#F3F5F9` | screen background |
| surface | `#FFFFFF` | cards |
| ink / navy | `#0E1726` | text, **dark hero cards**, tab bar, dark headers |
| body | `#3E4757` | normal text |
| muted | `#5B6576` | secondary text |
| onDarkMuted | `#AEB8C8` | secondary text on navy |
| primary (accent) | `#1E4FD8` | main buttons, active states, "Boarding" pill |
| primaryTint / primaryInk | `#E8EEFD` / `#163BA6` | avatar circle, light blue chips |
| line / field | `#E4E8EF` / `#D5DBE4` | borders, inputs |
| chip | `#F1F4FA` | small grey tiles (times) |
| success / tint | `#146C43` / `#E3F5EC` | ✓ marks, call button |
| warning / tint | `#8A5200` / `#FFF3DC` | cash to collect, courier avatar |
| danger / tint | `#B42318` / `#FDECEA` | Breakdown, refused, errors |
| accent orange | `#F59E0B` | logo dot, receiver dot |
| progress (on navy) | `#9DB4F2` passengers · `#4ADE80` parcels · track `#2A3446` | progress bars |

### Type and shapes

- **Type:** Plus Jakarta Sans (400–800) for everything.
  - JetBrains Mono (600–700) for times (`08:00`) and codes.
  - Titles 20/800, section titles 15/700, body 14, small 12–13.
  - Load them with `@expo-google-fonts/plus-jakarta-sans` and `@expo-google-fonts/jetbrains-mono`.
- **Shapes:**
  - cards radius 16–20
  - hero cards (navy) radius 24, padding 16
  - buttons 52 high, radius 14–16
  - inputs 52 high, radius 14
  - screen side padding 18
- **Tab bar** (both roles): a floating **navy pill**.
  - 64 high, radius 999, 20 from the sides and bottom, shadow.
  - Active tab: white pill with icon + label, navy text.
  - Inactive tabs: icon only, `#C9D2E0`.
  - Driver tabs: **Today · Scan · Trips · Profile**.
  - Courier tabs: **Today · Scan · Cash · Profile**.
- Icons: stroke icons, 2 px, rounded (`react-native-svg`, or `lucide-react-native`). **No emoji in the UI.**
- Every screen that loads data shows 3 states:
  - a **skeleton** while loading
  - a clear **empty** message
  - an **error** with "Try again"
  Buttons show a spinner and can't be pressed twice.
- Touch targets ≥ 44 px. Text contrast readable in sunlight: no light grey on white for important info.

## 4. Screens

### 4.1 Invite · set password (`app/invite/[token].tsx`), drawn

- Navy header showing:
  - logo
  - "Invite expires in 47 h"
  - agency initials tile
  - "Étoile Voyages invited you / Welcome, Bernard"
  - chips: role (orange), branch, "Added by …"
- Then "Set your password": login email (read-only), new password, repeat password, live rules (8+ characters, a number, both match), and the button **"Set password and start"**.
- API (Joy's HR module, **not built yet: mock it**):
  - `GET /hr/invites/:token` → `InvitePreview`
  - `POST /hr/invites/:token/accept { password }` → `SessionResponse` (sets the cookie). Then refetch `/auth/me`; the gate opens the staff app.
- Opened from a link in the invite SMS/email: configure the deep link `transitpro://invite/<token>`.

### 4.2 Driver · Today (`app/(staff)/(tabs)/index.tsx` when role = DRIVER), drawn

- **Header:** avatar initials, "Mon 2 Nov · Driver · Akwa", "Morning, Jean", and a red **Breakdown** button. Breakdown opens a confirm sheet; mock it for now, as Fleet will own it.
- **Hero card (navy):**
  - "Trip TR-0802 · CE 118 KD" and a status pill (Scheduled / Boarding / Departed)
  - departure time (big, mono), dashed line, arrival time; city names under each
  - two tiles:
    - **Passengers scanned 58 / 62** with a progress bar
    - **Parcels loaded 21 / 21** with a progress bar
- **Two big buttons:**
  - **Scan tickets** opens the scanner in ticket mode
  - **Scan parcels** opens the scanner in parcel mode
- **"Before departure" checklist:** tyres and lights, fuel, documents on board, all passengers scanned.
  - The last item is automatic: ticked when boarded = sold, otherwise it shows "4 missing" and tapping it opens the passenger list filtered on "Not boarded".
  - The others are local ticks for now.
- **Main button "Start trip · share live location":**
  - asks for location permission
  - sets the trip to DEPARTED (`PATCH /booking/trips/:id/status`)
  - sends `POST /fleet/trips/:tripId/location { lat, lng }` every 30 s while the trip is DEPARTED
  - shows "Sharing location" with a Stop button

  If passengers are still missing, warn first: "4 passengers not scanned. Start anyway?"
- **No trip today:** an empty state, "No trip assigned today. Your branch manager assigns trips."

### 4.3 Scan (tab "Scan"), not drawn

- Full-screen camera (`expo-camera`, barcode scanner, QR only), with a dark overlay, a rounded square frame and a torch button.
- A mode switch at the top: **Tickets | Parcels** (driver); couriers only scan parcels.
- A manual entry field below: "Type the code", for a damaged QR (`TK-58104` / `TP-DLA-48213`).
- The QR content is the **ticket code** (`TK-…`) or the **parcel tracking code** (`TP-…`).
- After a scan, haptic feedback (`expo-haptics`) and the result sheet (4.4). Ignore the same code scanned again within 3 s.

### 4.4 Boarding: Fidel's question, the agreed flow

1. The driver scans the passenger's QR (or types the code).
2. The app asks the server to **check** the ticket for **this trip**:
   `GET /booking/tickets/:code/check?tripId=…` → `BoardingCheck`.
3. A sheet slides up with the result:
   - **Valid:**
     - big green ✓
     - **passenger name**, **seat number** (very big), **ticket code** (booking reference)
     - origin → destination
     - payment "Paid · MTN MoMo"

     Buttons: **"Confirm boarding"** (primary) and "Cancel".
   - **Not valid:** a red or amber card with the reason in plain words. Nothing to confirm, only "Scan next".

     | `reason` | Text to show |
     |---|---|
     | `ALREADY_BOARDED` | "Already boarded at 07:41 (seat 14)": possible ticket sharing |
     | `WRONG_TRIP` | "This ticket is for Douala → Yaoundé 12:00, not this bus" |
     | `NOT_PAID` | "Not paid yet: send the passenger to the counter" |
     | `CANCELLED` | "Cancelled ticket" |
     | `NOT_FOUND` | "Unknown ticket" |
4. **Confirm boarding:**
   - `POST /booking/tickets/:code/board { tripId }` → `BoardingResult`
   - the ticket becomes **BOARDED**, the counter updates (**59 / 62**)
   - a short success toast, then the camera reopens at once for the next passenger
5. The Today hero card and the passenger list read the same cache: invalidate `['staff','trip',tripId]` after each boarding.

### 4.5 Passenger list (manifest), new screen: answer to "can the driver see the passengers?"

**Yes.** From Today ("Passengers scanned" tile) and from Trips, the driver opens **Passengers** for his trip
(`app/(staff)/trip/[id]/passengers.tsx`):
- Top: "59 / 62 boarded" with a progress bar, a search field (name or seat), and filter chips **All · Not boarded · Boarded**.
- One row per sold ticket, **sorted by seat**:
  - seat number in a square tile
  - passenger name
  - ticket code
  - status on the right: **Boarded 07:41** (green) or **Not boarded** (grey)
- Tapping a *Not boarded* row lets the driver board manually after checking the passenger's ID: same confirm sheet, same `board` call. This is the fallback when a phone is dead.
- **Privacy:** the driver sees **name, seat, ticket code and status only**. No phone numbers, no ID numbers, no payment details.
- Pull to refresh. While the trip is in Boarding, the list refreshes every 20 s, because the counter agent can also board people.
- API: `GET /booking/trips/:id/manifest` → `TripManifest`.

### 4.6 Scan parcels (driver), parcel mode of the scanner

- Scan `TP-…`, then show a sheet with:
  - tracking code
  - from → to
  - weight
  - seal number
  - current status
- Actions:
  - **Load on this bus**: `POST /parcels/:code/scan { type: "LOADED", tripId }`
  - **Departed**: after Start trip, `{ type: "DEPARTED" }`
- Parcels loaded counter: from the manifest (`parcels.loaded / parcels.total`).
- Server errors: show `error.message`. They are written for staff ("This parcel is on hold", "Not paid yet"…).

### 4.7 Trips (driver tab), not drawn

- Today's and upcoming trips as cards: time, route, bus plate, status, seats sold.
- Past trips collapsed under "Earlier".
- API: `GET /booking/trips/driver` → `DriverTrip[]` (mock).

### 4.8 Courier · Today (`(tabs)/index.tsx` when role = COURIER), drawn

- **Header:** "Mon 2 Nov · Courier · Mvan", "Morning, Bernard", and a bell.
- **3 stat tiles:** Delivered 5 / 9 · Refused 1 · Cash to remit (FCFA).
- **"Next up"** with "Stop 6 of 9": a navy hero card with
  - chips (Home delivery, Paid / "Collect 8,500")
  - time
  - receiver name and address
  - tracking code · seal · weight
  - buttons **Navigate** (opens Google Maps with the address) and **Start delivery** (opens 4.9)
- **"Later today"** list: time tile, area, receiver, a "Collect 8,500" chip when there is cash on delivery.
- API: **`GET /parcels/mine`, which already works.** It returns `ParcelListItem[]`, the parcels this courier holds (status OUT_FOR_DELIVERY).
  - Sort by `updatedAt`.
  - "Collect X" when `codAmount` is set.
  - Stats are counted on the phone for now.

### 4.9 Courier · Delivery (`app/(staff)/deliver/[code].tsx`), drawn

- **Navy header:** back to Today, "3 of 7 today", "Deliver TP-DLA-48230", "Scanned and matched · seal S-0061".
- **Receiver card:** initials, name, address, green **call** button (`tel:`).
- **"Proof of delivery" checklist:** each item turns ✓ when done.
  1. **At the delivery address:** take GPS with `expo-location`, high accuracy.
  2. **Handover photo taken:** camera, then upload.
  3. **Cash:**
     - "Nothing to collect"
     - or "Collect 8,500 FCFA" with **Collect cash** → `POST /parcels/:code/cod-payment { method: "CASH" }`
     - or Mobile Money (`method: "MTN_MOMO" | "ORANGE_MONEY", payerPhone`). The receiver approves on their phone, so poll `GET /parcels/:code` every 3 s until the payment is SUCCEEDED or FAILED.
- **Receiver's code:** 4 boxes, numeric keypad, auto-advance. "Ask Paul for the 4-digit code from his SMS once he has checked the parcel."
- **Confirm delivery:**
  - disabled until GPS, photo and 4 digits are ready, and cash is settled if any
  - calls `POST /parcels/:code/deliver { otp, photoUrl, lat, lng }`, which **already works**
  - wrong code: the server answers with the attempts left; show it under the boxes. After 5 wrong codes the parcel goes ON_HOLD.
- **"Receiver refused the parcel"** (red outline button): reason field → `POST /parcels/:code/refuse { reason }`. This **already works**: it opens a claim and refunds a cash-on-delivery payment.
- **Photo upload (works today):**
  - `POST /api/uploads` with the **image bytes as the body**, `Content-Type: image/jpeg`, max 3 MB → `{ url }`.
  - Resize to about 1600 px with `expo-image-manipulator` first.
  - Send the session cookie (`credentials: 'include'`).
  - Use the returned `url` as `photoUrl`.

### 4.10 Cash (courier tab), not drawn

- "Cash to remit today": the total of CASH cash-on-delivery payments collected today, plus the list (code, receiver, amount, time).
- Note: "Hand this cash to your branch at the end of the day."
- Count it from `/parcels/mine` and the parcel details for now; Finance will add an endpoint later.

### 4.11 Profile (both), not drawn

- Initials, name, role, agency, branch, email.
- Buttons:
  - **Change password**: `POST /auth/password/change { currentPassword, newPassword }`, which works.
  - **Log out**: `POST /auth/logout`, then clear the query cache.
- App version.

## 5. API status

| Endpoint | Status | Notes |
|---|---|---|
| `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/password/change` | ✅ works | `me.role`, `me.employee.branchId`, `me.agency.name` |
| `GET /parcels/mine` | ✅ works | courier's (and driver's) parcels |
| `GET /parcels/:code` | ✅ works | `ParcelDetail` (receiver phone, address, payments). A driver / courier gets it only for a parcel **they are carrying**, otherwise 403 |
| `POST /parcels/:code/scan` | ✅ works | DRIVER: `LOADED { tripId }`, `DEPARTED` |
| `POST /parcels/:code/deliver`, `/refuse`, `/cod-payment` | ✅ works | courier must be the parcel's current holder |
| `POST /api/uploads` | ✅ works | raw image body |
| `GET /hr/invites/:token`, `POST /hr/invites/:token/accept` | 🧱 Joy (HR) | mock |
| `GET /booking/trips/driver` | 🆕 to add (Joy) | mock |
| `GET /booking/trips/:id/manifest` | 🆕 to add (Joy) | mock |
| `GET /booking/tickets/:code/check?tripId=` | 🆕 to add (Joy) | mock |
| `POST /booking/tickets/:code/board { tripId }` | 🧱 Joy (in API.md) | mock |
| `PATCH /booking/trips/:id/status` | 🧱 Joy | mock |
| `POST /fleet/trips/:tripId/location` | 🧱 Sweet (Fleet) | mock |

**Mocks:** put them in `src/modules/staff/staff.mock.ts`, behind one flag:

```ts
const USE_MOCKS = process.env.EXPO_PUBLIC_STAFF_MOCKS === '1'
```

Each query function returns mock data (with a 400 ms delay so the skeletons show) when the flag is on, and calls `api()` otherwise. When Joy ships an endpoint, only that query switches; no screen changes.

### Proposed types for the new Booking endpoints

The Lead adds these to `contracts/api-types.d.ts` so Joy builds exactly this:

```ts
// GET /booking/trips/driver            Staff · Driver Today, Trips
export interface DriverTrip {
  id: string;
  code: string; // "TR-0802"
  status: 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'ARRIVED' | 'CANCELLED';
  originCity: string; originBranch: string;
  destinationCity: string; destinationBranch: string;
  departureAt: string; arrivalEta: string;
  busPlate: string;
  passengers: { boarded: number; sold: number };
  parcels: { loaded: number; total: number };
}

// GET /booking/trips/:id/manifest     Staff · Passengers
export interface TripManifest {
  trip: DriverTrip;
  passengers: {
    ticketCode: string; // "TK-58104"
    passengerName: string;
    seatNumber: number;
    status: 'PAID' | 'BOARDED';
    boardedAt: string | null;
  }[]; // sorted by seat; only PAID and BOARDED tickets
}

// GET /booking/tickets/:code/check?tripId=   Staff · Scan result
export type BoardingCheck =
  | { ok: true; ticket: ManifestPassenger & { originCity: string; destinationCity: string; paymentMethod: PaymentMethod } }
  | { ok: false; reason: 'NOT_FOUND' | 'WRONG_TRIP' | 'ALREADY_BOARDED' | 'NOT_PAID' | 'CANCELLED'; message: string; boardedAt?: string; seatNumber?: number };

// POST /booking/tickets/:code/board { tripId }
export interface BoardingResult {
  ticketCode: string; seatNumber: number; passengerName: string;
  boardedAt: string;
  passengers: { boarded: number; sold: number }; // new counter, e.g. 59 / 62
}
```

Server rules for Joy (the app relies on them):
- Only the trip's driver, or a counter agent of the origin branch, can board.
- `board` is idempotent: boarding twice returns `ALREADY_BOARDED`, never a second count.
- Boarding is allowed from 2 h before departure until departure.

## 6. Order of work

1. Theme tokens + fonts, the floating tab bar, the role switch (driver tabs / courier tabs / "use the web dashboard").
2. Courier Today + Delivery with the **real** parcel API (it works now).
   Test with `courier@etoile.test`: a parcel must be OUT_FOR_DELIVERY with him. Ask the Lead to prepare one, or run the flow from the web dashboard.
3. Scanner (both modes) + parcel sheet.
4. Driver Today + boarding sheet + passenger list, **on mocks**.
5. Trips, Cash, Profile, Invite.
6. Live location (after Start trip).

## 7. Done means

- Every screen matches the design values above and works at 360–430 px width.
- Loading, empty and error states everywhere; no double submit.
- A courier delivers a real parcel end to end on a real phone: GPS, photo, code. The parcel shows **Delivered** on the web dashboard.
- Boarding works on mocks:
  - valid ticket → confirm → counter +1
  - same ticket again → "Already boarded"
  - a ticket of another trip → "Wrong trip"
- `npm run typecheck` passes. No token stored on the phone. No emoji in the UI.
