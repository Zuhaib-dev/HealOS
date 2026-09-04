"use client";

import { useEffect } from "react";

/**
 * WebMCP Provider
 * Exposes window.modelContext and navigator.modelContext for in-browser AI agents
 * adhering to the WebMCP standard.
 */
export function WebMcpProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const modelContext = {
      version: "1.0.0",
      product: "HealOS",
      manifestUri: "https://healos-theta.vercel.app/.well-known/mcp",
      tools: [
        {
          name: "search_clinical_records",
          description: "Search patient directory, clinical orders, and medical charts.",
          parameters: {
            type: "object",
            required: ["query"],
            properties: {
              query: { type: "string" },
            },
          },
        },
        {
          name: "book_clinic_appointment",
          description: "Book an outpatient consultation slot with a physician.",
          parameters: {
            type: "object",
            required: ["patientId", "doctorId", "date"],
            properties: {
              patientId: { type: "string" },
              doctorId: { type: "string" },
              date: { type: "string" },
            },
          },
        },
      ],
      invokeTool: async (toolName: string, args: Record<string, unknown>) => {
        if (toolName === "search_clinical_records") {
          const res = await fetch(`/api/v1/patients?query=${encodeURIComponent(String(args.query || ""))}`);
          return res.json();
        }
        if (toolName === "book_clinic_appointment") {
          const res = await fetch("/api/v1/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(args),
          });
          return res.json();
        }
        throw new Error(`Tool ${toolName} not supported in browser context`);
      },
    };

    // Register on both navigator and window/document for agent detection
    try {
      (window as unknown as Record<string, unknown>).modelContext = modelContext;
      (document as unknown as Record<string, unknown>).modelContext = modelContext;
      if (typeof navigator !== "undefined") {
        (navigator as unknown as Record<string, unknown>).modelContext = modelContext;
      }
    } catch {
      // Ignore if navigator is frozen
    }
  }, []);

  return null;
}
