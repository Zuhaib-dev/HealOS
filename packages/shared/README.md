# `@healos/shared`

The shared workspace contains a small set of TypeScript constants, types, and Zod validators used by HealOS packages. It is part of the npm/Turborepo monorepo; it is not a separately published npm package.

## Exports

The package entry point re-exports:

```text
packages/shared/src/
├── index.ts                 Public barrel
├── constants/index.ts       App metadata, API prefix, defaults, limits
├── types/index.ts           Base/user/appointment/API transport types
└── validators/index.ts      Email, password, phone, pagination, ObjectId schemas
```

Import from the package root:

```ts
import { API_PREFIX, paginationSchema, type ApiResponse } from "@healos/shared";

const page = paginationSchema.parse({ page: "2", limit: "25" });
```

The package is compiled with TypeScript (`tsc`). `main` and `types` point to generated files in `dist/`; build the shared workspace before consuming it in isolation. Root Turborepo tasks declare the shared build as a dependency for dependent workspace tasks.

## Build and typecheck

From the repository root:

```bash
npm run build -w @healos/shared
npm run typecheck -w @healos/shared
```

The workspace has `zod` as its runtime dependency. Keep browser/server-neutral code here: avoid importing Next.js, Express, Mongoose, filesystem, or server secrets.

## Domain model boundary

This package is a shared utility and type surface, not yet the single authoritative domain schema for the whole product. The Express server's Mongoose schemas and server role enum define persisted API behavior. In particular, `UserRole` in this package is a legacy generic role list and does not exactly match the server's current `UserRole` values. Do not use the shared enum as a substitute for server authorization or assume it is synchronized with the backend. If roles or API DTOs are unified later, update both sides intentionally and add compatibility checks.

## Related documentation

- [Monorepo architecture](../../README.md)
- [Client workspace](../../client/README.md)
- [Server workspace](../../server/README.md)
