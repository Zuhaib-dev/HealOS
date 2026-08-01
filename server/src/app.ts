// ============================================
// HealOS Server — Application Entry Point
// ============================================
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { connectDB } from "./config/database.js";
import { envConfig } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiRouter } from "./routes/index.js";
import { API_PREFIX, APP_NAME, APP_VERSION } from "@healos/shared";

// ---------------------------
// Create Express App
// ---------------------------
const app = express();

app.use(helmet());

app.use(
  cors({
    origin:
      envConfig.NODE_ENV === "production"
        ? [envConfig.CLIENT_URL, "http://localhost:3000"].filter(Boolean) as string[]
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);
app.use(compression());
app.use(morgan(envConfig.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------------------------
// Health Check
// ---------------------------
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: `${APP_NAME} v${APP_VERSION} is running`,
    environment: envConfig.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------
// API Routes
// ---------------------------
app.use(API_PREFIX, apiRouter);

// ---------------------------
// Error Handling
// ---------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------
// Start Server
// ---------------------------
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(envConfig.PORT, () => {
      console.log(`\n🏥 ${APP_NAME} Server v${APP_VERSION}`);
      console.log(`🌍 Environment: ${envConfig.NODE_ENV}`);
      console.log(`🚀 Server running on: http://localhost:${envConfig.PORT}`);
      console.log(`📡 API available at: http://localhost:${envConfig.PORT}${API_PREFIX}`);
      console.log(`❤️  Health check: http://localhost:${envConfig.PORT}/health\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
