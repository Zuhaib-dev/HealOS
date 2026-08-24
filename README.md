# HealOS 🏥

![HealOS Banner](https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop)

> **A Next-Generation Hospital Management System built with the MERN stack.**

HealOS is a comprehensive, real-time, role-based Hospital Management System designed to streamline clinical workflows, patient management, and facility operations. Built with modern web technologies, it features 7 distinct workspaces tailored to the specific needs of different hospital staff and patients.

---

## 🏗️ System Architecture

HealOS uses a decoupled client-server architecture. The frontend is a highly interactive React application powered by Next.js, communicating via RESTful APIs and real-time WebSockets to an Express.js backend.

```mermaid
graph TD
    Client[Next.js Client App]
    API[Express.js REST API]
    WS[Socket.io Real-time Server]
    DB[(MongoDB Atlas)]
    Payment[Razorpay Gateway]

    Client -- HTTPS / JSON --> API
    Client -- WebSockets --> WS
    API -- Mongoose --> DB
    WS -- Pub/Sub --> API
    API -- Webhooks / Server-to-Server --> Payment
    Client -- Client SDK --> Payment
```

### 🔐 Authentication Flow

The system uses stateless JSON Web Tokens (JWT) for authentication and role-based access control (RBAC).

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant Server
    participant DB

    User->>Client: Enters Credentials
    Client->>Server: POST /auth/login
    Server->>DB: Verify User & Password Hash
    DB-->>Server: User Data & Role
    Server-->>Client: Returns JWT Token
    Client->>Client: Stores Token in Zustand / LocalStorage
    Client->>Server: Request Protected Route + Bearer Token
    Server->>Server: verifyToken() & requireRole([ROLE])
    Server-->>Client: Authorized Data
```

---

## 👥 Role-Based Workspaces

HealOS provides tailored dashboards and tools for 7 different user roles:

1. **👨‍⚕️ Doctor**: Manage consultations, write persistent clinical notes, order lab diagnostics, and prescribe medications.
2. **👩‍⚕️ Nurse**: Interactive eMAR (Medication Administration), Shift Handovers (SBAR), Call Bells queue, and patient vitals tracking.
3. **💊 Pharmacist**: Real-time e-Prescription queue and medication dispensing workflow.
4. **🔬 Lab Technician**: Receive diagnostic orders, upload patient lab reports, and manage sample collections.
5. **🏢 Admin**: Facility overview, staff role management, ward capacity tracking, and clinical credential approvals.
6. **🏥 Receptionist**: Patient onboarding, billing, and appointment scheduling.
7. **🤒 Patient**: Patient portal to book appointments, view medical records, view lab reports, and pay invoices online via Razorpay.

---

## 🚀 Comprehensive Tech Stack

### Frontend (Client)
- **Core Framework**: [Next.js 15 (App Router)](https://nextjs.org/) & [React 19](https://react.dev/)
- **Styling & UI**: 
  - [Tailwind CSS v4](https://tailwindcss.com/) (using modern logical properties and zero-config CSS variables)
  - Custom *Emerald Prestige* Design System (clinical interface focus)
  - [Framer Motion](https://www.framer.com/motion/) (Silky-smooth microinteractions and structural page transitions)
  - [Lucide React](https://lucide.dev/) (Consistent, clean iconography)
- **State Management & Data Fetching**: 
  - [Zustand](https://zustand-demo.pmnd.rs/) (Lightweight global state for Auth & UI)
  - [TanStack React Query](https://tanstack.com/query) (Server state caching and synchronization)
- **Forms & Validation**: React Hook Form, Zod
- **Typography**: `next/font` (JetBrains Mono for data/UI, Work Sans for prose)
- **SEO & Performance**: 
  - Next.js Metadata API, dynamic `sitemap.xml`, and JSON-LD Structured Data
  - Strict Client Component separation (`"use client"`) to maximize Server Components

### Backend (Server)
- **Runtime & Framework**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Language**: TypeScript (Strict typing across API borders)
- **Database**: [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) (NoSQL ODM)
- **Real-time Engine**: [Socket.io](https://socket.io/) (Pub/Sub for immediate clinical updates)
- **Authentication**: JWT (JSON Web Tokens) with strictly typed Role-Based Access Control (RBAC)
- **Payments**: [Razorpay API](https://razorpay.com/) (For patient invoices and online billing)

### Architecture & Patterns
- **Decoupled Monorepo**: Separate `/client` and `/server` environments
- **Role Guards**: Custom Higher-Order Components ensuring strict URL routing for 9 different user types
- **Hallmark Protocol**: Structural variety and anti-slop design in public landing pages (Marquee Heroes, Workbenches, Long Documents)

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account / Local MongoDB instance
- Razorpay Account (for payment integration)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/healos.git
   cd healos
   ```

2. **Setup Backend:**
   ```bash
   cd server
   npm install
   # Create a .env file based on .env.example
   npm run dev
   ```
   *See [server/README.md](./server/README.md) for detailed backend configuration.*

3. **Setup Frontend:**
   ```bash
   cd ../client
   npm install
   # Create a .env.local file
   npm run dev
   ```
   *See [client/README.md](./client/README.md) for detailed frontend configuration.*

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#).

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

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
