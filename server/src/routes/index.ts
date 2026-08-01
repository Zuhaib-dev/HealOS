// ============================================
// HealOS Server — API Router
// ============================================
// Central router that mounts all feature routers.
// Each feature has its own router file in this directory.
import { Router } from "express";
import { APP_NAME, APP_VERSION } from "@healos/shared";

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
      // Future route groups will be listed here:
      // auth: "/api/v1/auth",
      // users: "/api/v1/users",
      // patients: "/api/v1/patients",
      // doctors: "/api/v1/doctors",
      // appointments: "/api/v1/appointments",
      // departments: "/api/v1/departments",
      // prescriptions: "/api/v1/prescriptions",
      // lab: "/api/v1/lab",
      // pharmacy: "/api/v1/pharmacy",
      // billing: "/api/v1/billing",
      // admin: "/api/v1/admin",
    },
  });
});

// ---------------------------
// Mount Feature Routers
// ---------------------------
// Uncomment as features are built:
import authRouter from "./auth.routes";
import onboardingRouter from "./onboarding.routes";
// import { userRouter } from "./user.routes.js";
// import { patientRouter } from "./patient.routes.js";
// import { doctorRouter } from "./doctor.routes.js";
// import { appointmentRouter } from "./appointment.routes.js";
// import { departmentRouter } from "./department.routes.js";
// import { prescriptionRouter } from "./prescription.routes.js";
// import { labRouter } from "./lab.routes.js";
// import { pharmacyRouter } from "./pharmacy.routes.js";
// import { billingRouter } from "./billing.routes.js";
// import { adminRouter } from "./admin.routes.js";

apiRouter.use("/auth", authRouter);
apiRouter.use("/onboarding", onboardingRouter);
// apiRouter.use("/users", userRouter);
// apiRouter.use("/patients", patientRouter);
// apiRouter.use("/doctors", doctorRouter);
// apiRouter.use("/appointments", appointmentRouter);
// apiRouter.use("/departments", departmentRouter);
// apiRouter.use("/prescriptions", prescriptionRouter);
// apiRouter.use("/lab", labRouter);
// apiRouter.use("/pharmacy", pharmacyRouter);
// apiRouter.use("/billing", billingRouter);
// apiRouter.use("/admin", adminRouter);
