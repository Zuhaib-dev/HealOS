// ============================================
// HealOS Server — API Router
// ============================================
import { Router } from "express";
import { APP_NAME, APP_VERSION } from "@healos/shared";
import authRouter from "./auth.routes.js";
import onboardingRouter from "./onboarding.routes.js";
import appointmentRouter from "./appointment.routes.js";
import adminRouter from "./admin.routes.js";
import doctorRouter from "./doctor.routes.js";
import patientRouter from "./patient.routes.js";
import radiologyRouter from "./radiology.routes.js";
import receptionRouter from "./reception.routes.js";
import pharmacyRouter from "./pharmacy.routes.js";
import nurseRouter from "./nurse.routes.js";
import paymentRouter from "./payment.routes.js";
import labRouter from "./lab.routes.js";

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
      admin: "/api/v1/admin",
      doctor: "/api/v1/doctor",
      lab: "/api/v1/lab",
    },
  });
}); 

// ---------------------------
// Mount Feature Routers
// ---------------------------
apiRouter.use("/auth", authRouter);
apiRouter.use("/onboarding", onboardingRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/doctor", doctorRouter);
apiRouter.use("/patient", patientRouter);
apiRouter.use("/radiology", radiologyRouter);
apiRouter.use("/reception", receptionRouter);
apiRouter.use("/pharmacy", pharmacyRouter);
apiRouter.use("/nurse", nurseRouter);
apiRouter.use("/payment", paymentRouter);
apiRouter.use("/lab", labRouter);
