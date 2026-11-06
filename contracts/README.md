# contracts/

The meeting point between the server and the screens.

- `api-types.d.ts`: the exact fields each endpoint returns (inside `{ data }`), with the screen that shows it.
- `mocks.ts`: example values for each type, taken from the design.

**Server (Joy, Sweet, Lead):** your service function returns the type, e.g.
`export async function searchTrips(...): Promise<TripSearchResult[]>`. If a field is missing or misspelled, `npm run typecheck` fails.

**Screens (Adrien, Fidel, Lead):** build with the mock first, then swap one line:

```ts
import type { TripSearchResult } from '@contracts/api-types';
import { tripSearchResults } from '@contracts/mocks';

// before the endpoint exists
const trips: TripSearchResult[] = tripSearchResults;
// when it exists
const trips = await api<TripSearchResult[]>('/booking/trips/search?from=Douala&to=Yaoundé&date=2026-11-03');
```

Need a field the type does not have? Add it here in a Pull Request and tell the server owner. Never add it only on one side.
