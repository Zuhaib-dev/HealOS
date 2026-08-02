import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { envConfig } from "./config/env.js";

let io: Server | null = null;

export const initSocketIO = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin:
        envConfig.NODE_ENV === "production"
          ? [envConfig.CLIENT_URL, "http://localhost:3000"].filter(Boolean) as string[]
          : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`⚡ Realtime socket connected: ${socket.id}`);

    // Join user-specific room
    socket.on("join:user", (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`👤 Socket ${socket.id} joined room user:${userId}`);
      }
    });

    // Join role-specific rooms
    socket.on("join:role", (role: string) => {
      if (role) {
        const roomName = role.toLowerCase();
        socket.join(roomName);
        console.log(`🛡️ Socket ${socket.id} joined role room: ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Realtime socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized!");
  }
  return io;
};

// ============================================
// Realtime Event Helpers
// ============================================

/**
 * Emit role update event to a specific user
 */
export const emitUserRoleUpdated = (userId: string, newRole: string) => {
  if (io) {
    io.to(`user:${userId}`).emit("user:role_updated", { userId, newRole });
    // Also notify global admin & role rooms
    io.emit("role:changed", { userId, newRole });
  }
};

/**
 * Emit appointment update event to doctor and patient
 */
export const emitAppointmentUpdated = (appointmentData: any) => {
  if (io) {
    io.to("doctor").emit("appointment:updated", appointmentData);
    if (appointmentData.patient) {
      const patientId = typeof appointmentData.patient === "object" ? appointmentData.patient._id : appointmentData.patient;
      io.to(`user:${patientId}`).emit("appointment:updated", appointmentData);
    }
  }
};

/**
 * Emit new onboarding application event to admins
 */
export const emitNewOnboardingRequest = (requestData: any) => {
  if (io) {
    io.to("admin").emit("onboarding:new_request", requestData);
  }
};
