import { Request, Response } from "express";
import mongoose from "mongoose";
import os from "os";
import { getIO } from "../socket.js";
import { envConfig } from "../config/env.js";
import { APP_VERSION } from "@healos/shared";

export const getSystemHealth = async (_req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    
    let activeSocketChannels = 0;
    const io = getIO();
    if (io) {
      activeSocketChannels = io.engine.clientsCount;
    }

    const healthData = {
      database: {
        status: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
        host: "MongoDB Atlas Cluster",
      },
      sockets: {
        status: io ? "Online" : "Offline",
        activeChannels: activeSocketChannels,
        gateway: `WS Gateway :${envConfig.PORT}`
      },
      process: {
        uptime: process.uptime(),
        memory: {
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          rss: memoryUsage.rss,
          external: memoryUsage.external,
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        mongooseVersion: mongoose.version,
        appVersion: APP_VERSION,
        nextjsVersion: "15.0.0 (Turbopack)" // Harcoded for demo purposes as requested
      }
    };

    res.status(200).json({ success: true, data: healthData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
