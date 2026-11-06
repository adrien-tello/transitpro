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
  dashboard/      Agency dashboard                             Lead (numbers from Sweet)
  live-tracking/  Live map of buses and couriers               Lead (data from Fidel)
  parcels/        Register parcel, parcel detail               Lead
  booking/        Trips & booking, routes                      Lead (API from Adrien)
  fleet/          Buses, maintenance, fuel                     Joy (API from Fidel)
  hr/             Staff, invites, licences, payroll            Joy
  finance/        Payments, expenses, cash reconciliation      Sweet
  agencies/       Platform admin: verify agencies              Lead
```

Design: page "Web dashboard" on https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
