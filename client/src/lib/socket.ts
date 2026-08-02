import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:5001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("⚡ Realtime socket connected to server:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Realtime socket disconnected");
    });
  }

  return socket;
};
