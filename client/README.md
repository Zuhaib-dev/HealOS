# HealOS Frontend 🖥️

![Client Banner](https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop)

The frontend application for HealOS, built with **Next.js** (App Router), **React 19**, and **Tailwind CSS v4**. It serves as the primary interface for all 7 user roles (Admin, Doctor, Nurse, Pharmacist, Lab Technician, Receptionist, and Patient), providing a highly responsive, real-time experience.

---

## 🚀 Technologies Used

- **Framework**: Next.js (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4, Framer Motion for animations
- **State Management**: Zustand (Global Auth/Theme State), React Query (Async Server State)
- **Components**: Radix UI (Unstyled, accessible primitives), Lucide Icons
- **Real-time**: Socket.io-client
- **Payments**: Razorpay Checkout SDK
- **Forms & Validation**: React Hook Form + Zod

---

## 📂 Project Structure

```text
client/
├── cypress/                # E2E Tests for clinical flows
├── public/                 # Static assets and images
├── src/
│   ├── app/                # Next.js App Router pages and layouts
│   ├── components/         # Reusable UI components & Workspace specific panels
│   │   ├── admin/          # Admin-specific panels
│   │   ├── doctor/         # Doctor-specific panels
│   │   ├── nurse/          # Nurse-specific panels
│   │   ├── patient/        # Patient-specific panels
│   │   ├── pharmacy/       # Pharmacy-specific panels
│   │   ├── lab/            # Lab-specific panels
│   │   └── workspace/      # Shared dashboard shells and layout wrappers
│   ├── lib/                # API clients, Socket configuration, Utility functions
│   └── store/              # Zustand global state (Auth, Theme)
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS v4 configuration
└── package.json
```

---

## ⚡ Key Features

- **Role-based Dashboards**: Dynamically renders distinct navigation and panels based on the authenticated user's role.
- **Real-time Data Streams**: Uses Socket.io to push live updates for Call Bells, Lab Reports, Appointments, and eMAR modifications directly to the active components.
- **Optimistic UI Updates**: Instant feedback on UI interactions (like completing tasks or administering medications) while syncing with the backend in the background.
- **Responsive Layout**: Adapts gracefully to mobile devices (great for Nurses logging eMAR at the bedside) and large desktop monitors (ideal for Admins and Doctors).

---

## 🛠️ Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env.local` file in the `client` directory and populate it with the following:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   *The app will be available at `http://localhost:3000`.*

4. **Run E2E Tests (Cypress):**
   ```bash
   npx cypress open
   ```

---

## 🚢 Deployment

The client is optimized for deployment on **Vercel**.
Simply connect your repository to Vercel, set the Root Directory to `client`, and configure your Environment Variables (`NEXT_PUBLIC_API_URL`). Vercel will automatically detect Next.js and build the project using `next build`.

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
