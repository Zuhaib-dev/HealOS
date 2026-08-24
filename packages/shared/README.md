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

---

## Author

<div align="center">

**Zuhaib Rashid**  
Full-stack engineer · UI/UX obsessive · Real-time systems nerd

[![Portfolio](https://img.shields.io/badge/Portfolio-zuhaibrashid.com-0078D4?style=for-the-badge&logo=microsoft-edge)](https://zuhaibrashid.com)
[![GitHub](https://img.shields.io/badge/GitHub-Zuhaib--dev-181717?style=for-the-badge&logo=github)](https://github.com/Zuhaib-dev)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Zuhaib_Rashid-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/zuhaib-rashid-661345318/)
[![Twitter](https://img.shields.io/badge/Twitter-@xuhaib__x9-1DA1F2?style=for-the-badge&logo=twitter)](https://x.com/xuhaib_x9)

*Built with obsessive attention to detail, real-world production patterns, and way too much coffee.*

</div>
