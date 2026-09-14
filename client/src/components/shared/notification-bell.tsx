"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "@/store/use-auth-store";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import * as Popover from "@radix-ui/react-popover";

export function NotificationBell() {
  const { user, token } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || !token) return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
        const res = await fetch(`${apiUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) setNotifications(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotifications();

    // Listen to real-time broadcasts
    const socket = getSocket();
    
    // Join the user's personal room
    socket.emit("join:user", user.id);
    
    // Also join their role room (useful for PATIENTS / DOCTORS / ADMIN broadcasts)
    socket.emit("join:role", user.role);

    const handleNewNotification = (notif: any) => {
      setNotifications(prev => [{ ...notif, isRead: false }, ...prev]);
      toast(notif.title, {
        description: notif.message,
        icon: <Bell className="size-4" />,
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [user, token]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      await fetch(`${apiUrl}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) return null;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors outline-hidden rounded-full hover:bg-muted/50 cursor-pointer">
          <Bell className="size-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-rose-500 border-2 border-background"
              />
            )}
          </AnimatePresence>
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-80 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl p-4 shadow-2xl mr-4 sm:mr-0 outline-hidden"
          sideOffset={8}
          align="end"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
            )}
          </div>
          
          <div className="max-h-75 overflow-y-auto space-y-3 pr-1 -mr-1">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div key={n._id} className={`p-3 rounded-xl border transition-colors ${n.isRead ? 'bg-background border-transparent' : 'bg-accent/5 border-accent/20'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-xs font-semibold ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                    {!n.isRead && (
                      <button 
                        onClick={() => handleMarkAsRead(n._id)}
                        className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent/20 hover:text-accent transition-colors"
                        title="Mark as read"
                      >
                        <Check className="size-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{n.message}</p>
                  <p className="text-[9px] font-mono text-muted-foreground/60 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
