# TransitPro web dashboard

React 19 + Vite + TypeScript + Tailwind v4 + TanStack Query + React Router. Used by agency office staff.

```bash
cd web
npm install
npm run dev     # http://localhost:5173 (calls to /api go to the server on :4000)
```

## Folders

```
src/app/                router, providers, dashboard layout (sidebar + top bar)
src/components/ui/      buttons, inputs, badges, tables (shared)
src/components/layout/  sidebar, top bar, page header
src/lib/api.ts          the only fetch wrapper (sends the session cookie)
src/styles/index.css    design tokens (colors, fonts) from the design canvas
src/modules/
  auth/           Sign in, agency sign-up                      Lead
  dashboard/      Agency dashboard                             Lead
  live-tracking/  Live map of buses and couriers               Lead
  parcels/        Register parcel, parcel detail               Lead
  booking/        Trips & booking, routes                      Lead (or Adrien after mobile)
  fleet/          Buses, maintenance, fuel                     Fidel after mobile (or Lead)
  hr/             Staff, invites, licences, payroll            Adrien after mobile (or Lead)
  finance/        Payments, expenses, cash reconciliation      Lead
  agencies/       Platform admin: verify agencies              Lead

All web pages are built by the Lead, Adrien and Fidel. Joy and Sweet build the server
endpoints these pages call (see docs/API.md).
```

Design: page "Web dashboard" on https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
