# TransitPro mobile app

Expo SDK 54 + Expo Router + TypeScript + TanStack Query. **One app, two experiences**: after login, `GET /api/auth/me` returns the role. `CUSTOMER` opens `(customer)`, `DRIVER` / `COURIER` open `(staff)`. Customers never see staff screens.

Dependencies are **not installed** in the repo. Mobile developers run:

```bash
cd mobile
npm install
npx expo install --fix      # aligns native packages with SDK 54
npx expo start
```

Testing on a phone: set `EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000/api` in `mobile/.env`.

## Routes → design screens → owner

| Route folder | Screens (design canvas) | Owner |
|---|---|---|
| `app/(auth)/` | Log in, Create account (Google + email/password) | Adrien |
| `app/(customer)/(tabs)/` | Home, Trips, Parcels, Profile (bottom bar) | Adrien |
| `app/(customer)/search/` | Search · where to?, Search results | Adrien |
| `app/(customer)/agency/` | Verified agencies, Agency profile | Adrien |
| `app/(customer)/booking/` | Choose a seat, Pay, E-ticket | Adrien |
| `app/(staff)/(tabs)/` | Courier Today / Driver Today, Scan, Cash, Profile | Fidel |
| `app/(staff)/deliver/` | Courier delivery (receiver's code, photo, GPS) | Fidel |
| `app/invite/` | Invite · set password (opened from the SMS link) | Fidel |

```
src/lib/api.ts       the only fetch wrapper (cookie session, no tokens in storage)
src/modules/         queries + components per feature (booking, parcels, agencies, staff, auth)
src/components/      shared UI
src/theme/           colors and fonts from the design
```

Design: pages "Customer app" and "Staff app" on https://claude.ai/artifact/1NiJFaNhTtXLuCb5VuzRaw
