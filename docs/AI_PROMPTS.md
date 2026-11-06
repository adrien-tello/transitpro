# Prompts to paste in your AI agent

Paste your prompt at the **start** of every new chat with your AI (Claude Code, Cursor, Copilot...). Replace the part in [brackets]. Always read and test what it wrote before you commit.

## Joy and Sweet (server)

```
You are helping me on the TransitPro project. Before writing code, read AGENTS.md,
docs/SERVER_GUIDE.md, docs/API.md and contracts/api-types.d.ts.
I am [Joy / Sweet]. I only work in server/src/modules/[booking or hr / finance or fleet].
Task: build the endpoint [GET /booking/trips/search] exactly as in docs/API.md.
- The service must return the type from contracts/api-types.d.ts ([TripSearchResult[]]),
  with the same fields as the example in contracts/mocks.ts.
- Follow the style of server/src/modules/auth: schemas.ts (Zod), service.ts (Prisma), routes.ts.
- Keep requireAuth, requireRole and Zod validation. Filter by the user's agency.
- Do not edit schema.prisma or files outside my module.
When done, run npm run typecheck, then explain in simple words what you changed
and how I can test it with Thunder Client.
```

## Adrien (customer app) and Fidel (staff app)

```
You are helping me on the TransitPro mobile app (Expo SDK 54, Expo Router).
Before writing code, read AGENTS.md, mobile/README.md, docs/API.md and contracts/api-types.d.ts.
I am [Adrien, I own app/(auth) and app/(customer)] / [Fidel, I own app/(staff) and app/invite].
Task: build the screen [Search results] to match the design screenshot I attach.
- Data: use the mock from contracts/mocks.ts ([tripSearchResults]) typed with
  contracts/api-types.d.ts, through TanStack Query, so I can later swap it for api('[/booking/trips/search]').
- Use mobile/src/lib/api.ts for server calls. Never store tokens: the session is a cookie.
- Customers must never see staff screens or wording.
- Only touch my folders. Do not add libraries without telling me why.
When done, run npm run typecheck and tell me in simple words how to see the screen.
```

Tip: attach a screenshot of the screen from the design link, so the AI matches it.
