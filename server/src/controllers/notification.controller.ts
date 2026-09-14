import { Request, Response } from "express";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../middleware/error-handler.js";
import { getIO } from "../socket.js";
import { User } from "../models/user.model.js";

// Broadcast a new notification (Admin only)
export const broadcastNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, targetGroup, targetEmail } = req.body;
    const senderId = req.user?.id;

    if (!title || !message || !targetGroup) {
      throw new AppError("Missing required fields", 400);
    }

    if (targetGroup === "SPECIFIC" && !targetEmail) {
      throw new AppError("Target email is required for specific notifications", 400);
    }

    const notification = await Notification.create({
      title,
      message,
      targetGroup,
      targetEmail,
      sender: senderId,
      readBy: [],
    });

    const io = getIO();
    const payload = {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      targetGroup: notification.targetGroup,
      createdAt: notification.createdAt,
    };

    // Emit via WebSockets
    if (targetGroup === "EVERYONE") {
      io.emit("notification:new", payload);
    } else if (targetGroup === "PATIENTS") {
      io.to("patient").emit("notification:new", payload);
    } else if (targetGroup === "DOCTORS") {
      io.to("doctor").to("nurse").emit("notification:new", payload);
    } else if (targetGroup === "SPECIFIC") {
      const targetUser = await User.findOne({ email: targetEmail });
      if (targetUser) {
        io.to(`user:${targetUser._id}`).emit("notification:new", payload);
      }
    }

    res.status(201).json({ success: true, data: notification });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

// Get broadcast history (Admin only)
export const getBroadcastHistory = async (_req: Request, res: Response) => {
  try {
    const history = await Notification.find().sort({ createdAt: -1 }).populate("sender", "name email");
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get notifications for a user
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (!userId || !userRole) {
      throw new AppError("Unauthorized", 401);
    }

    const query: any = {
      $or: [
        { targetGroup: "EVERYONE" },
      ],
    };

    if (userRole === "PATIENT") {
      query.$or.push({ targetGroup: "PATIENTS" });
    } else if (userRole === "DOCTOR" || userRole === "NURSE") {
      query.$or.push({ targetGroup: "DOCTORS" });
    }

    if (userEmail) {
      query.$or.push({ targetGroup: "SPECIFIC", targetEmail: userEmail });
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    
    // Check read status
    const mapped = notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      targetGroup: n.targetGroup,
      createdAt: n.createdAt,
      isRead: n.readBy.includes(userId),
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) throw new AppError("Unauthorized", 401);

    await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: userId } });
    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (!userId) throw new AppError("Unauthorized", 401);

    const query: any = {
      $or: [
        { targetGroup: "EVERYONE" },
      ],
    };

    if (userRole === "PATIENT") {
      query.$or.push({ targetGroup: "PATIENTS" });
    } else if (userRole === "DOCTOR" || userRole === "NURSE") {
      query.$or.push({ targetGroup: "DOCTORS" });
    }

    if (userEmail) {
      query.$or.push({ targetGroup: "SPECIFIC", targetEmail: userEmail });
    }

    // Update all matching notifications that haven't been read by this user
    await Notification.updateMany(query, { $addToSet: { readBy: userId } });

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
