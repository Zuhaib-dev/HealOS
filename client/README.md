# HealOS — Client Workspace

> `@healos/client` · Next.js 16 App Router · React 19 · TypeScript

The browser-facing application for HealOS. Nine role-specific workspaces — patient portal, receptionist front desk, doctor clinical suite, nursing station, pharmacy dispensary, lab LIS, radiology RIS/PACS, emergency ED board, and admin control panel — all rendered from a single Next.js application.

**Authorization and domain logic live in the Express API.** The client calls the server for all protected data and state changes; it is never an authorization boundary.

---

## Stack

| Concern      | Technology                       |
| ------------ | -------------------------------- |
| Framework    | Next.js 16, React 19, App Router |
| Language     | TypeScript                       |
| Styling      | Tailwind CSS 4, Radix UI         |
| Animation    | Motion (Framer Motion)           |
| Icons        | Lucide React                     |
| Client state | Zustand                          |
| Server state | TanStack Query                   |
| Forms        | React Hook Form + Zod            |
| HTTP         | Axios (auto-auth interceptors)   |
| Real-time    | Socket.IO client                 |
| Auth         | NextAuth.js, JWT, Google OAuth   |
| Teleconsult  | WebRTC + TURN relay              |
| Monitoring   | Sentry                           |
| Testing      | Cypress (E2E)                    |

---

## Source Map

```
client/src/
├── app/                          Routes, layouts, metadata
│   ├── (auth)/                   Login + registration flows
│   ├── (public)/                 Marketing and public pages
│   ├── admin/                    Admin workspace pages
│   ├── doctor/                   Doctor workspace pages
│   ├── emergency/                ED board + clinical workflow pages
│   ├── lab/                      Laboratory (LIS) pages
│   ├── nurse/                    Nursing ward pages
│   ├── patient/                  Patient self-service portal pages
│   ├── pharmacy/                 Pharmacy dispensary pages
│   ├── radiology/                Radiology (RIS/PACS) pages
│   ├── reception/                Reception + walk-in pages
│   └── .well-known/              Developer/agent discovery endpoints
│
├── components/
│   ├── admin/                    Admin shell + 12 panel components
│   ├── auth/                     RoleGuard, UserProfileMenu
│   ├── brand/                    HealOS logo, wordmark
│   ├── doctor/                   Doctor shell + clinical panels
│   ├── emergency/                ED board panels
│   ├── lab/                      LIS panels (collection, accession, analyzers…)
│   ├── landing/                  Public landing page sections
│   ├── nurse/                    Nursing panels (eMAR, vitals, wounds…)
│   ├── patient/                  Patient portal panels
│   ├── pharmacy/                 Dispensary panels
│   ├── radiology/                RIS panels (worklist, reporting, archive…)
│   ├── shared/                   Notification bell, shared UI
│   ├── ui/                       Radix-based design system components
│   └── workspace/                WorkspaceShell (shared mobile/desktop nav)
│
├── hooks/                        Reusable React hooks
│
├── lib/
│   ├── api/                      Typed Axios wrappers per domain
│   │   ├── appointmentService.ts
│   │   ├── authService.ts
│   │   ├── doctorService.ts
│   │   ├── labService.ts
│   │   ├── radiologyService.ts
│   │   └── …
│   ├── api-client.ts             Axios instance + JWT interceptors
│   └── socket.ts                 Singleton Socket.IO client
│
├── proxy.ts                      Token-aware route redirects
└── store/
    ├── use-auth-store.ts         Zustand auth state
    └── use-ui-store.ts           Zustand UI state
```

---

## Role Workspaces

Each role has its own shell component and set of panels. The shell renders a persistent sidebar on desktop and a bottom tab bar on mobile with a "More" drawer for overflow tabs.

| Workspace   | Shell component       | Mobile tabs                               |
| ----------- | --------------------- | ----------------------------------------- |
| Patient     | `patient-shell.tsx`   | Home, Book, Visits, Records + More        |
| Doctor      | `doctor-shell.tsx`    | Shift, Clinic, Patients, Profile + More   |
| Nurse       | `WorkspaceShell`      | Rounds, Meds, Wounds, Fluids + More       |
| Pharmacist  | `WorkspaceShell`      | Rx Queue, Past Orders                     |
| Lab Tech    | `WorkspaceShell`      | Collection, Accession, Analyzers + More   |
| Radiologist | `radiology-shell.tsx` | Worklist, Upload, Reports, Archive + More |
| Emergency   | `WorkspaceShell`      | Board, Triage, Inbound, Resus             |
| Admin       | `admin-shell.tsx`     | Overview, Clinicians, Users + More        |

---

## Data & Real-Time Flow

### API calls

All server communication goes through **domain API functions** in `src/lib/api/`. These call the shared Axios instance which:

1. Attaches the current bearer JWT from Zustand auth store
2. Applies the base URL from `NEXT_PUBLIC_API_URL`
3. Auto-logs-out on `401 Unauthorized`

**Always use the domain functions** (e.g. `fetchLabOrders()`, `updateOrderStatusApi()`) from panels and pages rather than constructing URLs manually.

### Real-time events

```ts
// Connect once — socket.ts creates a singleton
import { getSocket } from "@/lib/socket";

// In a component
useEffect(() => {
  const socket = getSocket();
  socket.on("lab:result-ready", (data) => {
    // Trigger a refetch — do NOT use the socket payload as the source of truth
    queryClient.invalidateQueries({ queryKey: ["lab-orders"] });
  });
  return () => {
    socket.off("lab:result-ready");
  };
}, []);
```

> [!IMPORTANT]
> Never treat a Socket.IO event as the authoritative record for a clinical result, payment state, or workflow status. Always refetch from the API after receiving an event.

### Server vs. client rendering

- Route shells, metadata, and static layout: **server-rendered** (no `"use client"`)
- Interactive panels (forms, real-time, browser APIs): **client components** (`"use client"`)
- Add `"use client"` at the smallest necessary boundary — not at the route level

---

## Local Development

### Install

```bash
# From the monorepo root
npm ci
```

### Configure

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For optional integrations (teleconsult TURN, Sentry, etc.) see [`.env.example`](../.env.example).

### Run

```bash
# Full stack (client + server)
npm run dev

# Client only (server must be running separately)
npm run dev -w @healos/client
# or
npm run dev:client
```

The app serves on **http://localhost:3000**. The Express API must be running at the configured `NEXT_PUBLIC_API_URL` for authenticated or data-backed screens.

---

## Commands

Run from the **monorepo root**:

```bash
npm run build -w @healos/client          # Production build
npm run typecheck -w @healos/client      # Type check (tsc --noEmit)
npm run lint -w @healos/client           # ESLint
npm run format -w @healos/client         # Prettier auto-fix
```

E2E tests with Cypress (from `client/`):

```bash
npx cypress open     # Interactive UI
npx cypress run      # Headless
```

---

## Production Build

`next.config.ts` enables:

- **Standalone output** — minimal Node.js runtime bundle
- **Image optimization** — AVIF + WebP formats

`NEXT_PUBLIC_*` variables are **baked into the bundle at build time**. Set them before running `next build`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourhospital.com/api/v1 \
NEXT_PUBLIC_APP_URL=https://yourhospital.com \
npm run build -w @healos/client
```

The client Dockerfile builds `@healos/shared`, then `@healos/client`, and copies Next standalone output + static assets into a minimal Node 20 image.

---

## Implementation Conventions

> [!NOTE]
> Follow [`client/AGENTS.md`](./AGENTS.md) for Next.js 16 App Router guidance. Consult the installed Next docs before changing framework APIs.

- **API response types** belong near their domain API functions in `src/lib/api/`
- Always handle **loading**, **empty**, and **error** states in API-backed panels
- Use **server-side filters and pagination** when endpoints support it — never load full collections client-side
- Use **server responses as authoritative** for statuses, prices, slot availability, and clinical data
- Preserve **accessible labels**, keyboard focus, and responsive behavior in all clinical workspaces
- Mobile bottom nav labels must fit in one short word — use `shortLabel` on section definitions or rely on first-word truncation

---

## Related Documentation

- [Monorepo architecture & system design](../README.md)
- [Express API & backend workflows](../server/README.md)
- [Shared types & validators](../packages/shared/README.md)

---

## Author

**Zuhaib Rashid** — Full Stack Developer & Healthcare Systems Architect  
UI/UX Engineering · Real-time Systems · Autonomous Agent Protocols

[GitHub](https://github.com/Zuhaib-dev) · [Portfolio](https://zuhaibrashid.com/) · [LinkedIn](https://www.linkedin.com/in/zuhaib-rashid-661345318/) · [X / Twitter](https://x.com/xuhaib_x9)
