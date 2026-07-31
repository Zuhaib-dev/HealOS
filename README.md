# 🏥 HealOS

> *An Operating System for Healthcare*

A production-ready, full-stack Hospital & Clinic Management System built with the MERN stack.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Framer Motion
- **Backend**: Express.js + TypeScript
- **Database**: MongoDB (Mongoose)
- **Monorepo**: npm Workspaces + Turborepo

## Project Structure

```
HMS/
├── client/               # Next.js 15 Frontend (@healos/client)
│   └── src/
│       ├── app/           # App Router pages & layouts
│       ├── components/    # UI, shared, forms, charts
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities, API client
│       ├── store/         # Zustand state management
│       └── types/         # Client-specific types
│
├── server/               # Express.js Backend (@healos/server)
│   └── src/
│       ├── config/        # DB, env config
│       ├── controllers/   # Route handlers
│       ├── middleware/     # Auth, validation, error handling
│       ├── models/        # Mongoose schemas
│       ├── routes/        # Express routes
│       ├── services/      # Business logic
│       ├── sockets/       # Socket.IO handlers
│       └── utils/         # Helpers
│
├── packages/
│   └── shared/            # Shared types, constants, validators (@healos/shared)
│
├── turbo.json             # Turborepo config
├── .env.example           # Environment variables template
└── package.json           # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- MongoDB (local or Atlas)

### Setup

```bash
# 1. Clone & install
git clone <repo-url>
cd HMS
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Run development servers
npm run dev           # Both client & server
npm run dev:client    # Frontend only (http://localhost:3000)
npm run dev:server    # Backend only  (http://localhost:5000)
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all dev servers |
| `npm run dev:client` | Start frontend only |
| `npm run dev:server` | Start backend only |
| `npm run build` | Build all packages |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | Type-check all packages |
| `npm run clean` | Clean build artifacts |

## License

Private — All rights reserved.
