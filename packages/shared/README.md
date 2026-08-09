<div align="center">
  <h1>📦 HealOS Shared Package</h1>
  <p>Shared constants, types, and validators for the HealOS Monorepo.</p>
</div>

## 🎯 Purpose

The `@healos/shared` package serves as the single source of truth for code that is used by both the Next.js `client` and the Express `server`. This ensures type safety and consistency across the entire stack.

## 🛠 Contents

- **Types/Interfaces**: Shared TypeScript definitions (e.g., `User`, `Patient`, `Appointment`).
- **Constants**: Shared enums and constants (e.g., Status codes, Roles).
- **Validators**: Zod schemas used for form validation on the client and request validation on the server.

## 📂 Directory Structure

```
packages/shared/
└── src/
    ├── index.ts       # Main export file
    ├── types/         # Shared interfaces
    ├── constants/     # Shared variables/enums
    └── schemas/       # Zod validation schemas
```

## 🚀 Usage

Since this is a local workspace package, it is already linked via Turborepo and npm Workspaces.

### Importing in Client or Server

You can import directly from `@healos/shared`:

```typescript
import { UserRole } from '@healos/shared/constants';
import { type Patient } from '@healos/shared/types';
import { loginSchema } from '@healos/shared/schemas';

// Usage example
const role: UserRole = UserRole.ADMIN;
```

## 🏗 Building

This package uses `tsup` or `tsc` to bundle the TypeScript files for consumption. It is automatically built when running the root `npm run build` command.

---
*Part of the [HealOS Monorepo](../../README.md).*
