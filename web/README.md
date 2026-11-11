# TransitPro web dashboard

React 19 + Vite + TypeScript + Tailwind v4 + **axios** + **React Query** (cache) + React Router.
Used by agency office staff, agency owners and the TransitPro team (admin).

```bash
# 1. the server (other terminal): cd server && npm run dev        → http://localhost:4000
cd web
npm install
npm run dev     # http://localhost:5173  (calls to /api go to the server on :4000)
npm run build   # production build in dist/ (also type-checks)
```

Test accounts (password `Password123`): `agent@etoile.test` (Douala counter), `mvan.agent@etoile.test` and
`mvan.manager@etoile.test` (Yaoundé), `owner@etoile.test`, `admin@transitpro.test` (TransitPro team).

## What is built

| Screen | Route | Who |
|---|---|---|
| Sign in, forgot password (code by email) | `/login`, `/forgot-password` | everyone |
| Register your agency | `/register-agency` | new agency owner |
| Waiting for verification (rejection reason) | `/pending` | owner of a PENDING / REJECTED agency |
| Agencies to verify (approve / reject) | `/admin` | PLATFORM_ADMIN |
| Dashboard (parcel counters, latest parcels) | `/` | agency staff |
| Parcels list (status tabs, search, pages) | `/parcels` | counter agent, branch manager, owner |
| Register a parcel (photos, price, cash / MoMo / Orange, label, delivery code) | `/parcels/new` | same |
| Parcel detail (checks, custody, payments, next step) | `/parcels/:trackingCode` | same |
| Branches | `/branches` | owner |
| Trips, Fleet, Staff, Finance, Live tracking | "coming soon" pages | |

Drivers, couriers and customers see "use the mobile app".

## Folders

```
src/app/                router.tsx (every route), guards.tsx (who goes where), AppLayout.tsx (sidebar + top bar), nav.ts (menu per role)
src/components/ui/      Button, fields, Card, Badge, Skeleton / Empty / Error states, Toast, Icon, Logo
src/lib/api.ts          axios instance: the ONLY way to call the server (sends the session cookie)
src/lib/queryClient.ts  React Query settings + every cache key (keys.parcels, keys.me...)
src/lib/format.ts       fcfa(), dateTime(), ago(), phone()
src/styles/index.css    design tokens from the canvas (colors, font), skeleton animation, print rules
src/modules/<module>/   <module>.api.ts (queries + mutations) and the pages
```

## Adding a page (the rules)

1. **Data** in `src/modules/<module>/<module>.api.ts`: one `useQuery` per read, one `useMutation` per action,
   types from `contracts/api-types.d.ts`, cache keys in `lib/queryClient.ts`. After a change, update or invalidate the cache
   (see `parcels.api.ts`).
2. **Page** in the same folder. Every screen that loads data shows the 3 states:
   `Skeleton` / `SkeletonRows` while loading, `EmptyState` when there is nothing, `ErrorState` (with "Try again") on error.
   Buttons that send a request use `loading={mutation.isPending}` (no double submit). Field errors come from
   `fieldError(error, 'field')`, the rest from `errorMessage(error)`.
3. **Route** in `app/router.tsx`, **menu entry** in `app/nav.ts` (with the roles that see it).
4. **Style:** the components in `components/ui` and the tokens (`text-ink`, `bg-primary`, `border-line`...), as on the
   design canvas. No raw hex colors, no new font.
5. Never store a token or personal data in `localStorage`. The session is the httpOnly cookie.

Design: page "Web dashboard" on https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
