// ============================================
// HealOS Server — API Router
// ============================================
import { Router } from "express";
import { APP_NAME, APP_VERSION } from "@healos/shared";
import authRouter from "./auth.routes";
import onboardingRouter from "./onboarding.routes";
import appointmentRouter from "./appointment.routes";

export const apiRouter = Router();

// ---------------------------
// API Root Info
// ---------------------------
apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    message: `${APP_NAME} API v${APP_VERSION}`,
    endpoints: {
      health: "GET /health",
      api: "GET /api/v1",
      auth: "/api/v1/auth",
      onboarding: "/api/v1/onboarding",
      appointments: "/api/v1/appointments",
    },
  });
});

// ---------------------------
// Mount Feature Routers
// ---------------------------
apiRouter.use("/auth", authRouter);
apiRouter.use("/onboarding", onboardingRouter);
apiRouter.use("/appointments", appointmentRouter);
