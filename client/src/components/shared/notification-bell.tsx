"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2, ChevronLeft, CheckCheck } from "lucide-react";
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
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  // Close detail view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setSelectedNotif(null), 200); // Wait for exit animation
    }
  }, [isOpen]);

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

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
      await fetch(`${apiUrl}/notifications/read-all`, {
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
          <AnimatePresence mode="wait">
            {selectedNotif ? (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
                  <button 
                    onClick={() => setSelectedNotif(null)}
                    className="p-1.5 hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <ChevronLeft className="size-4 text-muted-foreground" />
                  </button>
                  <h3 className="font-semibold text-sm">Notification Detail</h3>
                </div>
                <div className="flex-1 overflow-y-auto max-h-75 pr-1 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{selectedNotif.title}</h4>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                      {new Date(selectedNotif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/40">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedNotif.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-mono bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-md"
                    >
                      <CheckCheck className="size-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="max-h-75 overflow-y-auto space-y-2 pr-1 -mr-1">
                  {isLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 flex flex-col items-center gap-2">
                      <Bell className="size-8 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-xs">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div 
                        key={n._id} 
                        onClick={() => {
                          setSelectedNotif(n);
                          if (!n.isRead) handleMarkAsRead(n._id);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${n.isRead ? 'bg-background hover:bg-muted/30 border-border/50' : 'bg-primary/5 hover:bg-primary/10 border-primary/20'}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-xs font-semibold ${n.isRead ? 'text-foreground/80' : 'text-primary'}`}>{n.title}</p>
                          {!n.isRead && <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/50 mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
