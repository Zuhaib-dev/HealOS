"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { toast } from "sonner";

export default function SandboxPage() {
  const [token, setToken] = useState("healos_test_token_agent_eval_sandbox");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"token" | "patients" | "vitals">("token");

  const handleGenerateToken = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/sandbox", { method: "POST" });
      const data = await res.json();
      if (data.sandbox_token) {
        setToken(data.sandbox_token);
        toast.success("Fresh sandbox evaluation token generated!");
      }
    } catch {
      toast.error("Failed to generate token, using local mock key.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative border-b border-border/60 bg-linear-to-b from-card/40 to-background px-6 py-16 md:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-500">
              <span>●</span> Zero-Auth Agent Testing Sandbox Active
            </div>
            <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              HealOS Agent Sandbox
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground leading-relaxed">
              Safe, isolated hospital simulation environment designed for autonomous AI agents, clinical copilots, and developer integration tests without live Protected Health Information (PHI).
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleGenerateToken}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Generating Key…" : "⚡ Issue Instant Sandbox Token"}
              </button>
              <Link
                href="/openapi.json"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>📑</span> OpenAPI 3.1 Spec
              </Link>
              <Link
                href="/auth.md"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>🔒</span> Auth Walkthrough
              </Link>
            </div>
          </div>
        </section>

        {/* Interactive Console */}
        <section className="mx-auto max-w-5xl px-6 py-12 md:px-12 lg:px-20">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-border bg-muted/40 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("token")}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "token"
                    ? "border-b-2 border-primary bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🔑 Sandbox Credential
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("patients")}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "patients"
                    ? "border-b-2 border-primary bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                👥 Synthetic Patients
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("vitals")}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "vitals"
                    ? "border-b-2 border-primary bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💓 Telemetry Feeds
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6">
              {activeTab === "token" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block">
                      Active Sandbox Bearer Token
                    </span>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        aria-label="Active Sandbox Bearer Token"
                        value={token}
                        className="flex-1 rounded-md border border-border bg-muted/50 px-4 py-2 font-mono text-sm text-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(token)}
                        className="rounded-md border border-border bg-card px-4 py-2 font-mono text-xs font-medium hover:bg-muted"
                      >
                        Copy Token
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-4 font-mono text-xs">
                    <span className="text-muted-foreground block select-none"># Authenticated cURL call to the sandbox environment:</span>
                    <pre className="mt-2 text-primary select-all whitespace-pre-wrap">
{`curl -H "Authorization: Bearer ${token}" \\
  https://healos-theta.vercel.app/api/v1/appointments`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === "patients" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Pre-seeded synthetic patient EHR identities available in the sandbox:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="font-semibold text-primary">pat_94821 — Elena Rostova</div>
                      <div className="text-muted-foreground mt-1">MRN: MRN-84729 · DOB: 1988-04-12</div>
                      <div className="text-amber-500 mt-1">Allergies: Penicillin, Latex</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="font-semibold text-primary">pat_31204 — Marcus Vance</div>
                      <div className="text-muted-foreground mt-1">MRN: MRN-10293 · DOB: 1974-11-23</div>
                      <div className="text-amber-500 mt-1">Allergies: Sulfa drugs</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "vitals" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Live synthetic bedside telemetry stream for patient pat_94821:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-muted-foreground text-[11px]">Heart Rate</div>
                      <div className="text-xl font-bold text-emerald-500 mt-1">74 bpm</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-muted-foreground text-[11px]">Blood Pressure</div>
                      <div className="text-xl font-bold text-primary mt-1">120/80</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-muted-foreground text-[11px]">SpO2</div>
                      <div className="text-xl font-bold text-cyan-500 mt-1">98.5%</div>
                    </div>
                    <div className="p-3 rounded-lg border border-border bg-background">
                      <div className="text-muted-foreground text-[11px]">Temperature</div>
                      <div className="text-xl font-bold text-amber-500 mt-1">36.8 °C</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sandbox Architecture & Developer Details */}
          <div className="mt-12 rounded-xl border border-border bg-card/60 p-6">
            <h2 className="font-display text-xl font-bold">HealOS Sandbox Guarantees</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>✓ <strong>100% Synthetic Data</strong>: Generated according to HL7 FHIR US Core profiles.</li>
              <li>✓ <strong>Zero Auth Required for Evaluation</strong>: Immediate evaluation without account creation.</li>
              <li>✓ <strong>Full Tool Coverage</strong>: Supports appointments, vitals, triage boards, and MCP SSE streaming.</li>
            </ul>

            <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
              <div>
                Maintained by <span className="text-foreground font-semibold">Zuhaib Rashid</span> (Full Stack Developer)
              </div>
              <div className="flex gap-4">
                <a href="https://zuhaibrashid.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  zuhaibrashid.com
                </a>
                <a href="mailto:zuhaibrashid01@gmail.com" className="text-primary hover:underline">
                  zuhaibrashid01@gmail.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
