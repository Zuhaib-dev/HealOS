<div align="center">
  <h1>💻 HealOS Client</h1>
  <p>The frontend application for HealOS, built with Next.js 15.</p>
</div>

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- **Data Fetching**: React Query / Custom API Client

## 📂 Directory Structure

```
client/
└── src/
    ├── app/           # Next.js App Router (Pages, Layouts, API Routes)
    ├── components/    # Reusable UI components, forms, and charts
    ├── hooks/         # Custom React hooks
    ├── lib/           # Utility functions and API client setup
    ├── store/         # Zustand global state stores
    └── types/         # Client-specific TypeScript interfaces
```

## 🚀 Getting Started

Ensure you are in the root directory of the monorepo or inside the `client` directory.

### Running in Development

To start the client in development mode (with Hot Module Replacement):

```bash
# From the root of the monorepo:
npm run dev:client

# Or from within the client directory:
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### Building for Production

To create an optimized production build:

```bash
# From the root of the monorepo:
npm run build:client
```

This will output the build artifacts to the `.next` folder, ready for deployment.

## 🎨 Styling & Design

This project utilizes **Tailwind CSS v4** for utility-first styling. The design system features:
- A glassmorphism aesthetic with floating dashboard elements.
- A carefully curated dark-mode color palette (teal, soft blue, dark backgrounds).
- Smooth micro-interactions powered by **Framer Motion**.

---
*Part of the [HealOS Monorepo](../README.md).*
