<div align="center">
  <h1>⚙️ HealOS Server</h1>
  <p>The backend API and websocket server for HealOS.</p>
</div>

## 🛠 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) (with [Mongoose](https://mongoosejs.com/) ODM)
- **Real-time Comm.**: [Socket.IO](https://socket.io/)
- **Validation**: Zod / Express-Validator (via `@healos/shared`)

## 📂 Directory Structure

```
server/
└── src/
    ├── config/        # Environment and DB configuration
    ├── controllers/   # Route handler functions
    ├── middleware/    # Auth, error handling, validation middleware
    ├── models/        # Mongoose database schemas
    ├── routes/        # Express route definitions
    ├── services/      # Complex business logic (separated from controllers)
    ├── sockets/       # Socket.IO event handlers (realtime features)
    └── utils/         # Helper functions (logging, formatting)
```

## 🚀 Getting Started

Ensure you are in the root directory of the monorepo or inside the `server` directory.
You must have a running MongoDB instance and your `.env` configured correctly.

### Environment Variables

Required environment variables in the root `.env` file (or `server/.env`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/healos
JWT_SECRET=your_super_secret_key
# Add other secrets as needed (AWS, Twilio, etc.)
```

### Running in Development

To start the server in development mode (with hot-reloading via `ts-node-dev` or `nodemon`):

```bash
# From the root of the monorepo:
npm run dev:server

# Or from within the server directory:
npm run dev
```

The API will be available at [http://localhost:5000](http://localhost:5000).

### Building for Production

To compile TypeScript to JavaScript for production:

```bash
# From the root of the monorepo:
npm run build:server
```

This will output the compiled files to the `dist/` directory.

## 🔐 Authentication & Security

- Passwords are encrypted using **bcrypt**.
- Authentication is handled via **JSON Web Tokens (JWT)**.
- Sensitive routes are protected by the `auth` middleware.

---
*Part of the [HealOS Monorepo](../README.md).*
