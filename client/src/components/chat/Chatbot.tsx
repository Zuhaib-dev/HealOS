"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TypingIndicator = () => (
  <div className="flex space-x-1.5 items-center h-6 px-1">
    <motion.div
      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
    />
    <motion.div
      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    />
    <motion.div
      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
    />
  </div>
);

export function Chatbot() {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am the HealOS AI Assistant. I can help you with healthcare, medical information, or using the HealOS platform. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isOpen]);

  // Don't render anything if not hydrated or not authenticated
  if (!_hasHydrated || !isAuthenticated || !user) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiClient.post("/chat", {
        messages: messages.concat(userMessage).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: response.data.message.content,
          },
        ]);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Sorry, I am currently unavailable. Please try again later.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-shadow"
                onClick={() => setIsOpen(true)}
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-80 sm:w-96"
          >
            <Card className="flex h-125 flex-col shadow-2xl border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3 bg-primary text-primary-foreground rounded-t-xl space-y-0">
                <CardTitle className="text-md flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  HealOS Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-primary/90 hover:text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                          className={`flex gap-3 ${
                            msg.role === "user" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                            {msg.role === "assistant" ? (
                              <AvatarFallback className="bg-primary/10 text-primary">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            ) : (
                              <AvatarFallback className="bg-muted">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] shadow-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-card border border-border/40 text-foreground rounded-tl-sm"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="flex gap-3 flex-row"
                        >
                          <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-card border border-border/40 text-foreground text-sm flex items-center shadow-sm">
                            <TypingIndicator />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>

              <CardFooter className="border-t p-3">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    placeholder="Ask about healthcare..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="flex-1 rounded-full border-border/60 bg-muted/30 focus-visible:ring-primary/20 transition-all"
                  />
                  <motion.div whileHover={!input.trim() || isLoading ? {} : { scale: 1.05 }} whileTap={!input.trim() || isLoading ? {} : { scale: 0.95 }}>
                    <Button
                      size="icon"
                      disabled={!input.trim() || isLoading}
                      onClick={handleSend}
                      className="rounded-full shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
