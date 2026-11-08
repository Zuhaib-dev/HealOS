# HealOS API server

The `@healos/server` workspace is the Node.js API and real-time service. It is a TypeScript/Express modular monolith backed by MongoDB through Mongoose. It owns the main application API under `/api/v1`; the Next.js client is documented in [client/README.md](../client/README.md).

## Architecture

```text
HTTP request
  -> app.ts: security headers, CORS, compression, request parsing, logging
  -> routes/index.ts: mount domain router beneath /api/v1
  -> verifyToken: verify JWT, reload user and validate token version
  -> requireRole / validation middleware
  -> controller: validate workflow and coordinate domain records
  -> Mongoose model(s) -> MongoDB
  -> JSON response and, where needed, Socket.IO event
```

`app.ts` creates the Express app and Node HTTP server, initializes Socket.IO, connects MongoDB, and installs not-found and error handlers. Domain routes are mounted from `routes/index.ts`. Each router is responsible for its endpoint namespace and route-level role restrictions; controllers implement request and workflow behavior; models define persisted data and indexes.

| Directory                       | Responsibility                                                      |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/routes/`                   | API paths, authentication and role middleware                       |
| `src/controllers/`              | Request parsing, domain rules, persistence and response shapes      |
| `src/models/`                   | Mongoose schemas, relationships, status enums and indexes           |
| `src/middleware/`               | JWT/RBAC, rate limits, request validation and error handling        |
| `src/config/`                   | Environment validation and MongoDB connection                       |
| `src/services/`                 | Reusable service operations                                         |
| `src/utils/`                    | Audit, local date handling, billing, mail and report access helpers |
| `src/sockets/`, `src/socket.ts` | Socket.IO setup and event helpers                                   |
| `src/__tests__/`                | Jest/Supertest tests and database setup                             |

### API modules

The root API router mounts `/auth`, `/onboarding`, `/appointments`, `/admin`, `/doctor`, `/patient`, `/radiology`, `/reception`, `/pharmacy`, `/nurse`, `/payment`, `/lab`, `/ai`, `/emergency`, `/notifications`, `/system`, and `/reports`.

The Mongoose domain includes accounts and profiles, appointments and doctor availability, consultations and notes, diagnostic orders and reports, invoices, inventory and pharmacy sales, nursing records, wards, radiology/lab operations, and emergency cases, observations, admissions and medication-administration events.

## Algorithms and consistency

### Appointment booking

The server validates doctor eligibility, schedule day, working hours, slot alignment, slot duration, date/time, and remaining daily capacity. It computes the possible intervals from the doctor's working window, checks persisted appointments for the selected day, and rejects occupied or exhausted slots. Reception walk-in bookings use the same server-owned availability concepts while enforcing same-day and not-in-the-past rules. Client availability is advisory; the write endpoint performs its own validation.

### ED prioritization and pending work

The active ED board sorts cases by ESI acuity and then arrival time. The ED records endpoint pages visit history by arrival date and supports text/status filtering. The pending-work endpoint aggregates persisted case, order, report, consultation, pharmacy, and admission state over a bounded recent work window. Result content is only exposed after report verification. These are domain rules, not a general-purpose task scheduler.

### Diagnostics, prescriptions and medication events

Diagnostic orders and reports are separate linked records with explicit lifecycle states. A report can exist before it is verified, but result details must remain behind the relevant verification/access rules. A prescription, pharmacy payment/dispensing sale, and nurse medication-administration event represent different stages and should not be conflated.

### Persistence and indexes

MongoDB collections are defined by Mongoose models. Models add indexes for frequent lookup paths such as appointment status/date, user role, patient and case history, diagnostic status/type, and pharmacy sale status. Unique indexes protect selected identifiers and relationships (for example, case IDs, appointment slot uniqueness, and one consultation per ED case). Indexes speed reads and enforce database-level constraints, but they do not replace request validation or authorization.

The app opens one Mongoose connection with a bounded connection pool. Transactions should be added only where a multi-document operation needs atomicity and the deployment supports MongoDB transactions (replica set/sharded cluster); do not imply that every workflow currently executes inside a transaction.

## Authentication and API security

- Protected API routers use JWT bearer verification. The middleware reloads the user and compares the token version before attaching the user to the request.
- `requireRole` enforces allowed backend roles at route level. A client-side role guard is only a navigation aid.
- Authentication and OTP endpoints use rate limiting.
- Helmet, CORS allowlists, JSON/form body limits, and request logging are configured in `app.ts`.
- Production environment validation rejects weak/default JWT secrets and missing auth-sync secret.
- Report files are served through authenticated report routes rather than the general static upload path.

Never log credentials, bearer tokens, payment secrets, or unnecessary patient details. Add resource ownership checks to controllers when access should be scoped to one user or care relationship; broad role access alone may not be sufficient.

## Real-time and external integrations

Socket.IO runs on the same HTTP server as Express. The server validates the JWT cookie during connection and validates room-join requests for user and role rooms. Feature controllers emit events for subscribed clients; clients should refetch persisted API state after receiving an event. WebRTC signaling events support teleconsultation rooms.

Razorpay keys are optional environment settings for payment flows. Email delivery can be configured via SMTP, Gmail API, or Resend, depending on the deployment and configured credentials. Redis is defined in Docker Compose and `REDIS_URL` is accepted by configuration, but no Redis application client is currently wired into this server; queues, distributed cache, and Socket.IO adapter/pub-sub are not enabled by that configuration alone.

## Configuration

The root [`.env.example`](../.env.example) is the canonical template. `src/config/env.ts` loads a repository-root `.env` and then `server/.env` for server-specific values, and validates runtime settings with Zod.

Common settings:

| Variable                                            | Required / use                                           |
| --------------------------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`, `PORT`, `CLIENT_URL`                    | Runtime mode, listen port and browser origin             |
| `MONGODB_URI`                                       | MongoDB connection string                                |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`                  | Signing secrets; production must use long random secrets |
| `AUTH_SYNC_SECRET`                                  | Required by production environment validation            |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`            | Optional payment provider credentials                    |
| `SMTP_*`, `GMAIL_*`, `RESEND_API_KEY`, `EMAIL_FROM` | Optional mail delivery configuration                     |
| `ADMIN_EMAIL`                                       | Optional bootstrap/admin configuration                   |

Do not commit real `.env` files. `REDIS_URL` is present for local infrastructure/configuration but is not currently consumed by an application Redis client.

## Local development

From the repository root:

```bash
npm ci
cp .env.example .env
# Start MongoDB locally, or use: npm run services:up
npm run dev:server
```

The API listens on port `5001` by default. Check `GET http://localhost:5001/health`; API routes are prefixed with `/api/v1`. To start all workspaces, use `npm run dev` from the root. See [the root README](../README.md) for the complete local setup and environment details.

## Commands and tests

```bash
npm run build -w @healos/server
npm run typecheck -w @healos/server
npm run lint -w @healos/server
npm run test -w @healos/server
```

Tests are configured with Jest and `ts-jest`; Supertest is available for HTTP-level tests, and the test setup uses `mongodb-memory-server`. CI runs backend tests with Jest in-band and configures the MongoDB binary version. The GitHub Actions workflow also runs monorepo lint, typecheck, and build.

## Deployment

The server Dockerfile uses Node 20 multi-stage builds and builds `@healos/shared` before the API. **Check the current container entrypoint before deploying:** the Dockerfile runs `server/dist/server.js`, while the TypeScript build and `npm start` target `dist/app.js`. Configure environment variables in the target deployment and provide a reachable production MongoDB URI. Production must use unique, strong JWT secrets, a trusted `CLIENT_URL`, and real provider credentials when enabling integrations. Do not expose server credentials to the client or embed them in a Docker image.

## Related documentation

- [Monorepo architecture and system workflows](../README.md)
- [Client API integration and UI conventions](../client/README.md)
- [Shared package exports](../packages/shared/README.md)

## Author

**Zuhaib Rashid**
