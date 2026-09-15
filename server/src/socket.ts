import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { envConfig } from "./config/env.js";
import jwt from "jsonwebtoken";

let io: Server | null = null;

export const initSocketIO = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin:
        envConfig.NODE_ENV === "production"
          ? [envConfig.CLIENT_URL, "http://localhost:3000"].filter(Boolean) as string[]
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  // Authenticate socket connection using the JWT cookie
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/healos_token=([^;]+)/);
        if (match && match[1]) {
          const token = decodeURIComponent(match[1]);
          const decoded = jwt.verify(token, envConfig.JWT_SECRET as string) as any;
          socket.data.user = decoded;
        }
      }
    } catch (err) {
      // If token is invalid/expired, leave socket.data.user as undefined
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`⚡ Realtime socket connected: ${socket.id} (Auth: ${!!socket.data.user})`);

    // Join user-specific room
    socket.on("join:user", (userId: string) => {
      if (userId && socket.data.user && socket.data.user.id === userId) {
        socket.join(`user:${userId}`);
        console.log(`👤 Socket ${socket.id} joined room user:${userId}`);
      } else {
        console.warn(`⚠️ Unauthorized attempt by socket ${socket.id} to join user:${userId}`);
      }
    });

    // Join role-specific rooms
    socket.on("join:role", (role: string) => {
      if (role && socket.data.user && socket.data.user.role.toUpperCase() === role.toUpperCase()) {
        const roomName = role.toLowerCase();
        socket.join(roomName);
        console.log(`🛡️ Socket ${socket.id} joined role room: ${roomName}`);
      } else {
        console.warn(`⚠️ Unauthorized attempt by socket ${socket.id} to join role room ${role}`);
      }
    });

    // Real-time Chat
    socket.on("chat:send_message", (messageData: { senderId: string, text: string, senderName: string, role: string, timestamp: string }) => {
      if (!socket.data.user) {
        console.warn(`⚠️ Unauthenticated chat message attempt from socket ${socket.id}`);
        return;
      }
      // Broadcast to the care team (doctors, nurses, etc) and back to the patient's room so all their devices sync
      socket.broadcast.emit("chat:receive_message", messageData);
      console.log(`💬 Chat message from ${messageData.senderName}: ${messageData.text}`);
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
    emitAdminDataChanged(["users", "staff", "roles"], "role_updated");
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
    emitAdminDataChanged(["approvals", "staff"], "onboarding_created");
  }
};

export const emitAdminDataChanged = (resources: string[], reason: string) => {
  if (io) {
    io.to("admin").emit("admin:data_changed", {
      resources,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
};
