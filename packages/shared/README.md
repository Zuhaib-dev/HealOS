# `@healos/shared`

Shared TypeScript utilities for the HealOS monorepo — constants, types, and Zod validators consumed by both the Next.js client and the Express API server.

This is **not** a published npm package. It is a private workspace resolved via npm workspaces and built by Turborepo before dependent packages compile.

---

## What's in here

```
packages/shared/src/
├── index.ts                 Public re-export barrel
├── constants/
│   └── index.ts             App metadata, API prefix, pagination defaults, limits
├── types/
│   └── index.ts             Base types, User, Appointment, API transport shapes
└── validators/
    └── index.ts             Zod schemas: email, password, phone, pagination, ObjectId
```

---

## Usage

Import from the package root in any workspace:

```ts
import {
  API_PREFIX,
  paginationSchema,
  type ApiResponse,
  type PaginationInput,
} from "@healos/shared";

// Parse and coerce pagination query params
const page = paginationSchema.parse({ page: "2", limit: "25" });
// → { page: 2, limit: 25 }

// Type an API response wrapper
function wrap<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}
```

---

## Build

The package compiles with `tsc`. `main` and `types` in `package.json` point to files in `dist/`. Turborepo declares the shared build as a dependency for all consuming workspace tasks — you normally do not need to build it manually during development.

```bash
# From the monorepo root
npm run build -w @healos/shared
npm run typecheck -w @healos/shared
```

---

## Authoring rules

> [!IMPORTANT]
> Keep this package **browser/server-neutral**. Do not import Next.js, Express, Mongoose, `fs`, or any server secret here. The package runs in both environments.

- Add types that describe API transport shapes (request bodies, response envelopes)
- Add Zod schemas for inputs that need validation in both client and server (pagination, IDs, email format)
- Add string constants used in both environments (API prefix, app name, limits)
- Do **not** add domain business logic, database models, or UI components

---

## Important caveat on roles

> [!WARNING]
> `UserRole` exported from this package is a legacy generic list and does **not** exactly match the Express server's current `UserRole` values. Do not use the shared enum as a substitute for server-side authorization checks. If you unify roles across packages, update both sides intentionally and add compatibility tests.

---

## Related Documentation

- [Monorepo architecture](../../README.md)
- [Client workspace](../../client/README.md)
- [Server workspace](../../server/README.md)

---

## Author

**Zuhaib Rashid** — Full Stack Developer & Healthcare Systems Architect  
[GitHub](https://github.com/Zuhaib-dev) · [Portfolio](https://zuhaibrashid.com/) · [LinkedIn](https://www.linkedin.com/in/zuhaib-rashid-661345318/) · [X / Twitter](https://x.com/xuhaib_x9)
