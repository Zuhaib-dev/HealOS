# HealOS — API Server

> `@healos/server` · Node.js 20 · Express · TypeScript · MongoDB / Mongoose

The `@healos/server` workspace is the Node.js REST API and real-time service for HealOS. It owns all business logic, authorization, persistence, and clinical domain workflows. The Next.js client is documented in [`client/README.md`](../client/README.md).

---

## Architecture

### Request lifecycle

```
Incoming HTTP request
  → app.ts
      Helmet security headers
      CORS (CLIENT_URL allowlist)
      Compression
      JSON / urlencoded body parsing
      Morgan request logging
      Rate limiting
  → routes/index.ts  (mount all domain routers at /api/v1)
  → verifyToken      (decode JWT → reload User → check token version)
  → requireRole      (RBAC enforcement at route level)
  → Controller       (parse input → enforce domain rules → persist)
  → Mongoose Model   → MongoDB
  → JSON response
  → (optional) Socket.IO event emit
```

`app.ts` creates the Express application and Node HTTP server, initializes Socket.IO, connects MongoDB, mounts domain routers, and registers 404 and global error handlers. Each domain router owns its URL namespace and route-level role restrictions. Controllers handle request parsing, enforce workflow rules, and coordinate persistence. Models define schemas, indexes, and status enumerations.

---

## Directory Layout

```
server/src/
├── app.ts                    Express + Socket.IO bootstrap, middleware chain
├── server.ts                 HTTP server entry point
├── config/
│   ├── env.ts                Zod-validated environment loading
│   └── database.ts           Mongoose connection + retry logic
├── routes/                   16 domain routers
│   ├── auth.routes.ts
│   ├── appointment.routes.ts
│   ├── doctor.routes.ts
│   ├── nurse.routes.ts
│   ├── lab.routes.ts
│   ├── radiology.routes.ts
│   ├── pharmacy.routes.ts
│   ├── reception.routes.ts
│   ├── patient.routes.ts
│   ├── emergency.routes.ts
│   ├── payment.routes.ts
│   ├── admin.routes.ts
│   ├── ai.routes.ts
│   ├── notification.routes.ts
│   ├── report.routes.ts
│   └── system.routes.ts
├── controllers/              Business logic per domain
├── models/                   30+ Mongoose schemas with compound indexes
├── middleware/
│   ├── auth.middleware.ts    JWT decode, user reload, token-version check
│   ├── role.middleware.ts    requireRole RBAC enforcement
│   ├── validate.middleware.ts Zod request schema validation
│   ├── rate-limit.middleware.ts Express-rate-limit per endpoint group
│   └── error.middleware.ts   Global error handler + not-found handler
├── services/                 Reusable service-layer operations
├── utils/
│   ├── audit.ts              Audit log creation helpers
│   ├── localDate.ts          IST-aware date utilities
│   ├── billing.ts            Invoice + payment calculation helpers
│   ├── mailer.ts             SMTP / Gmail / Resend email dispatch
│   └── reportAccess.ts       Protected report file serving
├── sockets/                  Socket.IO event handler modules
│   └── socket.ts             Connection auth, room management, event helpers
└── __tests__/
    ├── setup.ts              mongodb-memory-server test database
    └── *.test.ts             Jest + Supertest API tests
```

---

## Domain Models (Mongoose)

| Model                               | Description                            |
| ----------------------------------- | -------------------------------------- |
| `User`                              | Accounts, roles, auth tokens           |
| `PatientProfile`                    | Demographic + medical history          |
| `ProfessionalProfile`               | Staff credentials + specialisation     |
| `Appointment`                       | Scheduled / walk-in visits             |
| `DoctorAvailability`                | Working hours + slot configuration     |
| `Consultation`                      | Clinical encounter record              |
| `ClinicalNote`                      | SOAP/APSO structured notes             |
| `DiagnosticOrder`                   | Lab / radiology requisitions           |
| `DiagnosticReport`                  | Test results (linked to order)         |
| `LabAnalyser`                       | Analyser machine configuration         |
| `LabAnalyte`                        | Per-analyte result values              |
| `LabCriticalContact`                | Critical-value callback records        |
| `ModalityMachine`                   | Radiology scanner telemetry            |
| `RadiologyBooking`                  | Imaging slot reservations              |
| `ReportTemplate`                    | Structured report templates            |
| `Invoice`                           | Billing records                        |
| `PharmacySale`                      | Dispensing transaction                 |
| `Inventory`                         | Drug / consumable stock                |
| `Vitals`                            | Nursing observation records            |
| `FluidBalance`                      | Fluid input/output tracking            |
| `Wound`                             | Wound care records                     |
| `MARDose`                           | Medication administration events       |
| `Handover`                          | Shift handover notes                   |
| `CallBell`                          | Patient call events                    |
| `EmergencyCase`                     | ED presentation + triage               |
| `EmergencyObservation`              | ED clinical observations               |
| `EmergencyAdmission`                | ED-to-ward admission                   |
| `EmergencyMedicationAdministration` | ED MAR events                          |
| `InboundAmbulance`                  | Pre-hospital notification              |
| `MajorIncident`                     | Mass-casualty / major incident records |
| `ResusBay`                          | Resuscitation bay status               |
| `Ward`                              | Ward + bed configuration               |
| `Schedule`                          | Staff rota                             |
| `AuditLog`                          | Immutable action audit trail           |
| `Notification`                      | In-app notification records            |
| `Integration`                       | External service credentials           |
| `OTP`                               | One-time password records              |

---

## Domain Logic & Algorithms

### Appointment availability engine

The booking endpoint validates:

1. Doctor exists and is active in the system
2. Requested date falls on a configured working day
3. Requested time falls within working hours
4. Slot aligns with the doctor's slot duration setting
5. Remaining daily capacity has not been exhausted
6. The specific slot is not already occupied

The engine computes all possible intervals from the doctor's configured window, queries existing appointments for the day, and rejects collisions. Walk-in reception bookings use the same server-side logic while adding same-day and not-in-the-past constraints. The client availability display is advisory — the write endpoint validates independently.

### Emergency triage board

Active ED cases are sorted by **ESI acuity level** (1 = most critical) and then by arrival time. The pending-work endpoint aggregates active case, diagnostic order, consultation, pharmacy, and admission state over a bounded recent window. Diagnostic result details are blocked behind the report verification gate even when fetched via the ED API.

### Diagnostic lifecycle

```
Order placed (PENDING)
  → Sample collected (COLLECTED)
  → Analyser / manual result entry (RESULTED)
  → Clinician verification (VERIFIED)
  → Critical value? → callback workflow triggered
```

A `DiagnosticReport` is a separate record linked to its `DiagnosticOrder`. Reports can exist before verification; result details are access-restricted until the appropriate verification step completes. This state machine is enforced in controllers — not just on the client.

### Prescription & medication lifecycle

These are **three distinct record types** representing different workflow stages:

1. **Prescription** — written by the doctor (Consultation)
2. **PharmacySale** — dispensed by the pharmacist (inventory deducted)
3. **MARDose** — administered by the nurse (time + dose documented)

Do not conflate these when querying medication history.

### Persistence & indexes

Models add indexes for high-frequency access patterns:

- Appointment status + date composite
- User role + active status
- Diagnostic order status + type + date
- Pharmacy sale status + date
- Emergency case status + acuity
- Lab result + verification state

Unique indexes protect slot uniqueness (appointment per doctor+time+date), one consultation per ED case, and case ID uniqueness.

---

## Real-Time with Socket.IO

Socket.IO runs on the same HTTP server as Express (`app.ts` passes the server to `socket.ts`).

**Connection security:**

- JWT cookie validated on `connection` event
- Room joins (`user:<id>`, `role:<ROLE>`) validated before acceptance
- Clients that fail auth are disconnected immediately

**Event pattern:**

1. Controller completes a write → emits targeted room event
2. Client receives event → triggers API refetch
3. API response updates UI state

> [!IMPORTANT]
> Socket events are notification signals, not data payloads. The database is always the source of truth.

**WebRTC signaling** events (`offer`, `answer`, `ice-candidate`) are relayed through the socket for teleconsultation room participants.

---

## Security

> [!WARNING]
> Server authorization is the security boundary. Never rely on client-side guards for access control.

- **JWT verification** (`verifyToken` middleware): decodes and validates the access token, reloads the User document, and checks the token version field (invalidating old tokens on password change / forced logout)
- **RBAC** (`requireRole` middleware): enforces allowed roles at the route level before any controller code runs
- **Rate limiting**: stricter limits on auth endpoints; general API limits applied globally
- **Helmet**: sets security-relevant HTTP response headers
- **CORS**: scoped to configured `CLIENT_URL`
- **Body limits**: JSON and form body sizes bounded in `app.ts`
- **Report access**: diagnostic report files served through authenticated protected routes, not the general static upload path
- **Production env validation**: rejects deployments with weak/default JWT secrets or missing `AUTH_SYNC_SECRET`

**Never log bearer tokens, payment secrets, or unnecessary patient details.** Add resource ownership checks in controllers when access should be scoped beyond role membership.

---

## External Integrations

| Integration             | Variables                                                       | Status                                        |
| ----------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| **Razorpay** (payments) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                        | Optional                                      |
| **SMTP email**          | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`              | Optional                                      |
| **Gmail API**           | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Optional                                      |
| **Resend**              | `RESEND_API_KEY`                                                | Optional                                      |
| **Google OAuth**        | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                          | Optional                                      |
| **Gemini AI**           | `GEMINI_API_KEY`                                                | Optional                                      |
| **Redis**               | `REDIS_URL`                                                     | Configured but not yet wired to an app client |

> [!NOTE]
> `REDIS_URL` is present in Docker Compose and env config for future use. No application Redis client (session store, queue, pub-sub adapter) is currently connected. Enabling Redis features requires wiring a client in `app.ts`.

---

## Configuration

Configuration is loaded and validated with Zod in `src/config/env.ts`. It reads the repository-root `.env` and optionally `server/.env` for server-specific overrides.

| Variable                 | Required | Purpose                                           |
| ------------------------ | -------- | ------------------------------------------------- |
| `NODE_ENV`               | ✅       | `development` / `production` / `test`             |
| `PORT`                   | —        | Listen port (default `5001`)                      |
| `CLIENT_URL`             | ✅       | Browser origin allowed by CORS                    |
| `MONGODB_URI`            | ✅       | MongoDB connection string                         |
| `JWT_SECRET`             | ✅       | Access token signing (use 64+ char random string) |
| `JWT_EXPIRES_IN`         | —        | Access token TTL (default `7d`)                   |
| `JWT_REFRESH_SECRET`     | ✅       | Refresh token signing                             |
| `JWT_REFRESH_EXPIRES_IN` | —        | Refresh TTL (default `30d`)                       |
| `AUTH_SYNC_SECRET`       | ✅ prod  | Required by production env validation             |
| `ADMIN_EMAIL`            | optional | Bootstrap admin configuration                     |

See [`.env.example`](../.env.example) for the complete variable list.

---

## Local Development

```bash
# From the monorepo root
npm ci
cp .env.example .env

# Start MongoDB (or use Docker)
docker compose up -d mongodb

# Start the API server
npm run dev:server
# → API: http://localhost:5001
# → Health: http://localhost:5001/health
# → REST: http://localhost:5001/api/v1/*
```

To run the full stack together:

```bash
npm run dev
```

---

## Commands & Testing

```bash
# From the monorepo root
npm run build -w @healos/server       # Compile TypeScript to dist/
npm run typecheck -w @healos/server   # tsc --noEmit
npm run lint -w @healos/server        # ESLint
npm run test -w @healos/server        # Jest (uses mongodb-memory-server)
```

The test suite uses:

- **Jest** as the test runner
- **ts-jest** for TypeScript compilation
- **Supertest** for HTTP-level API assertions
- **mongodb-memory-server** for isolated, in-memory database per test run

GitHub Actions CI runs lint, typecheck, build, and backend tests on every push.

---

## Deployment

The server Dockerfile:

1. Builds `@healos/shared` (TypeScript compile)
2. Builds `@healos/server` (`tsc` → `dist/`)
3. Copies output into a minimal Node 20 runtime image

> [!CAUTION]
> Verify the Dockerfile `CMD` matches the compiled entry point. The TypeScript build produces `dist/app.js`; ensure the container runs the correct file.

**Production checklist:**

- Set `NODE_ENV=production`
- Use long, randomly generated `JWT_SECRET` and `JWT_REFRESH_SECRET` (never the example values)
- Set `AUTH_SYNC_SECRET` (required by production env validation)
- Configure `CLIENT_URL` to your exact browser origin
- Provide a production MongoDB URI with appropriate credentials
- Supply real payment/email/AI credentials if those features are enabled
- Never embed server secrets in Docker image layers or client bundles

---

## Related Documentation

- [Monorepo architecture & system design](../README.md)
- [Client API integration & UI conventions](../client/README.md)
- [Shared types & validators](../packages/shared/README.md)

---

## Author

**Zuhaib Rashid** — Full Stack Developer & Healthcare Systems Architect  
UI/UX Engineering · Real-time Systems · Autonomous Agent Protocols

[GitHub](https://github.com/Zuhaib-dev) · [Portfolio](https://zuhaibrashid.com/) · [LinkedIn](https://www.linkedin.com/in/zuhaib-rashid-661345318/) · [X / Twitter](https://x.com/xuhaib_x9)
