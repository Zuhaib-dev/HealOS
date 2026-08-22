# HealOS Backend ⚙️

![Backend Banner](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034&auto=format&fit=crop)

The backend service for HealOS, providing robust RESTful APIs, real-time WebSocket communication, and secure data management using **Express.js**, **TypeScript**, and **MongoDB**.

---

## 🚀 Technologies Used

- **Framework**: Express.js (v5)
- **Language**: TypeScript
- **Database**: MongoDB Atlas via Mongoose (v8)
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **Real-time**: Socket.io
- **Payments**: Razorpay (Server-side validation)
- **Security**: Helmet, express-rate-limit, CORS
- **Testing**: Jest & Supertest

---

## 📂 Project Structure

```text
server/
├── src/
│   ├── app.ts                  # Application entry point and configuration
│   ├── controllers/            # Request handlers (logic for each route)
│   ├── middleware/             # Custom middleware (Auth, Error handling, RBAC)
│   ├── models/                 # Mongoose schemas and interfaces
│   ├── routes/                 # API route definitions
│   └── __tests__/              # Jest integration & unit tests
├── jest.config.js              # Jest configuration
├── tsconfig.json               # TypeScript compiler options
└── package.json
```

---

## 🔒 Security & Authentication

The backend implements strict Role-Based Access Control (RBAC). 
All protected routes verify an incoming JWT Bearer token and check the authenticated user's `role` against an allowed list:

```typescript
// Example from routes
router.use(verifyToken);
router.use(requireRole([UserRole.DOCTOR, UserRole.NURSE]));
```

### Supported Roles:
`ADMIN`, `DOCTOR`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `RECEPTIONIST`, `PATIENT`, `USER`

---

## 📡 Real-time Events (WebSockets)

Socket.io is integrated tightly into the Express server to broadcast changes instantly without requiring the client to poll:

- `consultation_saved`: Notifies doctors of updated notes.
- `call_bell_created` / `call_bell_updated`: Instantly alerts nurses of patient needs.
- `prescription_created`: Pushes new scripts straight to the pharmacy queue.
- `order_created`: Notifies the lab of new diagnostic requirements.

---

## 🛠️ Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the `server` directory and add:
   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/healos
   JWT_SECRET=super_secret_jwt_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   GMAIL_CLIENT_ID=your_google_oauth_client_id
   GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
   GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
   GMAIL_USER=your-email@gmail.com
   GMAIL_FROM="HealOS <your-email@gmail.com>"
   RESEND_API_KEY=your_resend_api_key
   EMAIL_FROM="HealOS <noreply@send.zuahibrashid.com>"
   ```

3. **Run Development Server (with hot reload):**
   ```bash
   npm run dev
   ```

4. **Run Tests:**
   ```bash
   npm run test
   ```

---

## 🚢 Deployment

The backend is configured for simple deployment to platforms like **Render** or **Heroku**.
The `package.json` includes `build` (`tsc`) and `start` (`node dist/app.js`) scripts.

1. Connect your repository to Render.
2. Select the `server` folder as the root directory.
3. Use the build command: `npm install && npm run build`.
4. Use the start command: `npm start`.
5. Don't forget to populate your Environment Variables in the Render dashboard!

### Production email delivery

Render free web services block outbound SMTP ports `25`, `465`, and `587`. For OTP emails on Render free without buying a domain, configure Gmail API credentials: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`, and `GMAIL_FROM`. This sends through Google's HTTPS API instead of SMTP. If you have a verified sending domain, you can use `RESEND_API_KEY` instead. SMTP is kept for local development or hosts that allow SMTP egress.
