<div align="center">
  <img src="assets/healos_hero_banner.png" alt="HealOS Hero Banner" width="100%" />
  
  <br />
  <br />

  <h1>🏥 HealOS</h1>
  <p><strong>An Operating System for Healthcare</strong></p>
  <p>A production-ready, full-stack Hospital & Clinic Management System built with the modern MERN stack.</p>

  <div>
    <img src="https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo" />
  </div>
</div>

---

## 🌟 Overview

**HealOS** is a comprehensive, centralized platform designed to streamline healthcare operations. Whether it's managing patient records, scheduling appointments, or handling staff rosters and billing, HealOS provides a sleek, intuitive, and highly responsive interface to make hospital administration effortless.

## 🚀 Key Features

- **🧑‍⚕️ Patient Management**: Securely store and manage patient profiles, medical history, and admittance records.
- **📅 Appointment Scheduling**: Advanced calendar system for booking, rescheduling, and tracking appointments.
- **💼 Staff Roster**: Manage doctors, nurses, and administrative staff across different departments.
- **📊 Analytics Dashboard**: Real-time insights into hospital performance, patient flow, and financials.
- **💰 Billing & Finance**: Seamless invoice generation and payment tracking.
- **🔒 Security First**: Role-based access control and encrypted sensitive data.

## 💻 Tech Stack

HealOS is built using a modern, scalable architecture within a monorepo setup.

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS v4, Framer Motion, Zustand
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO
- **Database**: MongoDB (Mongoose)
- **Tooling**: npm Workspaces, Turborepo, ESLint, Prettier

## 📂 Project Structure

This project is a monorepo managed by [Turborepo](https://turbo.build/repo).

```
HMS/
├── client/               # Next.js 15 Frontend (@healos/client)
├── server/               # Express.js Backend (@healos/server)
├── packages/
│   └── shared/           # Shared types, constants, validators (@healos/shared)
├── turbo.json            # Turborepo config
└── package.json          # Root workspace config
```

*See individual `README.md` files in `client`, `server`, and `packages/shared` for more details.*

## 🏁 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB (local instance or MongoDB Atlas)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd HMS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   *Make sure to update `.env` with your MongoDB URI and other necessary secrets.*

### Running the App

Start both the client and server concurrently in development mode:

```bash
npm run dev
```

- **Frontend**: Available at `http://localhost:3000`
- **Backend API**: Available at `http://localhost:5000`

If you want to run them separately:
```bash
npm run dev:client    # Starts frontend only
npm run dev:server    # Starts backend only
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all dev servers concurrently |
| `npm run build` | Build all packages for production |
| `npm run lint` | Lint all packages |
| `npm run typecheck` | Run TypeScript type checking across all packages |
| `npm run clean` | Clean all build artifacts and caches |

## 👨‍💻 Author

**Zuhaib** 

Connect with me and check out my other projects:

- <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" width="20" height="20" /> &nbsp; **GitHub**: [@Zuhaib-dev](https://github.com/Zuhaib-dev)
- <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter" width="20" height="20" /> &nbsp; **Twitter/X**: [@Zuhaib_dev](https://twitter.com/Zuhaib_dev)
- <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" width="20" height="20" /> &nbsp; **LinkedIn**: [Zuhaib](https://linkedin.com/in/Zuhaib-dev)

*Feel free to reach out if you have any questions or want to collaborate!*

---

<div align="center">
  <sub>Built with ❤️ for a better healthcare future.</sub>
</div> 
