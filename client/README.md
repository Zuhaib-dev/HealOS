# HealOS web client

The `@healos/client` workspace is the browser-facing application. It uses Next.js App Router and React; the API and clinical workflow rules live primarily in the separate Express server. See the [root README](../README.md) for the monorepo architecture, shared run steps, and system design overview.

## Responsibilities

- Render public, authentication, patient, and staff workspaces.
- Apply role-aware navigation and client route guards for user experience.
- Call the server API through the shared Axios client.
- Subscribe to authorized Socket.IO events and refresh relevant UI state.
- Host selected Next route handlers for auth integration, developer endpoints, API surfaces, and markdown content.

The client is not an authorization boundary. Protected data and state changes must be checked by the Express API.

## Stack

- Next.js 16 App Router and React 19
- TypeScript, Tailwind CSS 4, Radix UI, Lucide React and Motion
- Axios for HTTP; Socket.IO client for real-time events
- Zustand for session/UI state; TanStack Query is available for server-state use
- React Hook Form and Zod for form handling and validation
- Sentry integration configured through Next.js

## Source map

```text
client/src/
├── app/                     Routes, layouts, metadata and Next route handlers
│   ├── (auth)/              Login and registration
│   ├── admin/               Administration workspace
│   ├── doctor/              Doctor workspace
│   ├── emergency/           ED board, records and clinical workflow
│   ├── lab/                 Laboratory workspace
│   ├── nurse/               Nursing workspace
│   ├── patient/             Patient portal
│   ├── pharmacy/            Pharmacy workspace
│   ├── radiology/           Radiology workspace
│   └── reception/           Reception and walk-in workspace
├── components/              Shared components and domain panels
├── hooks/                   Reusable client hooks
├── lib/
│   ├── api/                  Domain API functions
│   ├── api-client.ts         Axios configuration and interceptors
│   └── socket.ts             Singleton Socket.IO client
├── proxy.ts                  Route redirects and token-aware navigation
└── store/                    Zustand auth and UI state
```

## Data and real-time flow

Domain API functions in `src/lib/api/` call the Axios instance. The instance applies the configured API base URL, attaches the current bearer token, and logs out on an unauthorized response. Use these domain functions from pages and panels rather than duplicating URL construction or auth headers.

The socket client connects to the host derived from `NEXT_PUBLIC_API_URL`. The authenticated application joins user and role rooms through the socket provider/notification UI. Components should subscribe to the specific events relevant to their workspace, remove listeners on unmount, and refetch authoritative data after updates. Do not use a socket event as the only source of a clinical record or payment state.

Most workflow panels are interactive client components. Keep route shells, metadata, and static composition server-rendered where possible; add `"use client"` at the smallest component boundary that needs browser state, effects, or event handlers.

## Local development

Install dependencies from the monorepo root:

```bash
npm ci
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Start the complete local stack from the root with `npm run dev`, or start only the client with:

```bash
npm run dev -w @healos/client
```

The app runs on `http://localhost:3000`. The API must be available at the configured URL for authenticated or data-backed screens. Root `.env.example` documents additional optional integrations; only variables needed by the client should be placed in a `NEXT_PUBLIC_*` variable.

## Commands

Run from the repository root:

```bash
npm run build -w @healos/client
npm run typecheck -w @healos/client
npm run lint -w @healos/client
```

`cypress` is present in client dependencies and `cypress.config.ts` configures browser tests. Check the current Cypress spec files before assuming a particular E2E workflow is covered.

## Production build

`next.config.ts` enables standalone output and image optimization formats. The client Dockerfile builds the shared package and client, then copies Next standalone output and static assets into a Node 20 runtime image. Supply `NEXT_PUBLIC_API_URL`, the public app URL, and any provider settings required by the features enabled in that deployment. Since `NEXT_PUBLIC_*` values are embedded into client bundles at build time, configure them before building the production image.

## Implementation conventions

- Follow [client/AGENTS.md](./AGENTS.md) for the repository's Next.js 16 guidance; consult the matching installed Next docs before changing framework APIs.
- Keep API response types near the domain API functions in `src/lib/api/`.
- Use server responses as authoritative for statuses, prices, availability, permission checks, and clinical data.
- Show loading, empty, and error states for API-backed panels.
- Avoid fetching or rendering more records than the user needs; use server-side filters and pagination when the endpoint supports them.
- Preserve accessible labels, keyboard focus, and responsive behavior in clinical workspaces.

## Related documentation

- [Monorepo, architecture, and local services](../README.md)
- [Express API and backend workflows](../server/README.md)
- [Shared package](../packages/shared/README.md)

## Author

**Zuhaib Rashid**
