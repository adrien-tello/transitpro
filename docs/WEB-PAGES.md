# TransitPro · web dashboard pages

Every page of the sidebar, its status and who builds it. A "coming soon" page shows the same badge in the app.
To build one: make the page in `web/src/modules/<module>/`, then swap its `<ComingSoonPage …/>` in `web/src/app/router.tsx`.
Rules (data hooks, skeleton / empty / error states, design tokens): `web/README.md`. Design: page "Web dashboard" of the design canvas.

## Agency staff

| Page | Route | Status | Built by |
|---|---|---|---|
| Dashboard | `/` | Done: parcels, alerts and revenue are live. Tickets, buses, trip on the road, departures and bus tiles show "—" until Booking / Fleet send data | Lead (Booking and Fleet tiles: Joy, Sweet) |
| Parcels (list, register, detail) | `/parcels` | Done | Lead |
| Branches | `/branches` | Done (owner) | Lead |
| Settings (profile, change password) | `/settings` | Done | Lead |
| Trips & booking | `/trips` | Coming soon | Joy (Booking) |
| Schedule | `/schedule` | Coming soon | Joy (Booking) |
| Staff | `/staff` | Coming soon | Joy (HR) |
| Fleet | `/fleet` | Coming soon | Sweet (Fleet) |
| Finance | `/finance` | Coming soon | Sweet (Finance) |
| Reports | `/reports` | Coming soon | Sweet (Finance) |
| Live tracking | `/live` | Coming soon | Fidel (staff app GPS) + Lead |
| Messages (page + top bar button) | `/messages` | Coming soon | to assign |
| Support | `/support` | Coming soon | to assign |

## TransitPro team (PLATFORM_ADMIN)

| Page | Route | Status | Built by |
|---|---|---|---|
| Overview | `/admin` | Done: agencies, payments, commission, parcels | Lead |
| Agencies to verify | `/admin/verify` | Done | Lead |
| Settings | `/admin/settings` | Done (profile, password) | Lead |
| All agencies | `/admin/agencies` | Coming soon | Lead + Adrien |
| Payments | `/admin/payments` | Coming soon | Lead + Adrien |
| Payouts | `/admin/payouts` | Coming soon (next after the dashboard) | Lead |
| Customers | `/admin/customers` | Coming soon | Lead + Adrien |
| Reports | `/admin/reports` | Coming soon | Lead |

## Dashboard tiles waiting for another module

In `web/src/modules/dashboard/DashboardPage.tsx`, each one has a comment where its data goes:

- **Tickets sold** (key figure) and **Today's departures**: Booking (Joy)
- **Trip on the road**: Booking (Joy) + staff app GPS (Fidel)
- **Buses on the road** (key figure) and **Bus needing attention**: Fleet (Sweet)
- **Live map**: staff app GPS (Fidel)
