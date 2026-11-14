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

Test accounts (password `Password123`): see [`docs/TEST-ACCOUNTS.md`](../docs/TEST-ACCOUNTS.md).

## What is built

Full list of pages, status and who builds each one: [`docs/WEB-PAGES.md`](../docs/WEB-PAGES.md).
Every login: [`docs/TEST-ACCOUNTS.md`](../docs/TEST-ACCOUNTS.md).

- **Layout**: the design's sidebar (stays in place while the page scrolls, menu per role, live badges), top bar with search,
  messages and notifications, pages fade in, data of the Parcels page loads while the pointer is on its link.
- **Agency dashboard** (`/`): every block of the design. Parcels, alerts and revenue are live; tiles of modules not connected yet
  (tickets, buses, trips) show "—" and their first-day state.
- **TransitPro team** (`/admin`): overview (agencies, payments, our commission, parcels), agencies to verify.
- Parcels (list, register, detail), branches, settings (profile, password, light / dark / system theme),
  sign-in (email or Google), forgot password, agency sign-up.
- **Dark mode**: every color is a token in `styles/index.css` with a dark value. Never use a raw hex or `bg-white`
  (use `bg-surface`), or that spot stays light in dark mode.
- Other menu entries: "coming soon" pages with the name of who builds them.

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
4. **Style:** the components in `components/ui` and the tokens (`text-ink`, `bg-surface`, `bg-primary`, `border-line`...), as on the
   design canvas. No raw hex colors, no `bg-white`, no new font (they break dark mode).
5. Never store a token or personal data in `localStorage`. The session is the httpOnly cookie.

Design: page "Web dashboard" on https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
