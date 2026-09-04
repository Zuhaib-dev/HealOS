import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Developer Portal & API Docs | HealOS",
  description:
    "Explore the HealOS developer documentation, OpenAPI 3.1 specifications, Model Context Protocol (MCP) tool bindings, and OAuth 2.0 authentication guides.",
  alternates: {
    canonical: "https://healos-theta.vercel.app/developers",
  },
};

export default function DevelopersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative border-b border-border/60 bg-gradient-to-b from-card/40 to-background px-6 py-20 md:px-12 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <span>●</span> REST 3.1 &amp; MCP Protocol Ready
            </div>
            <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              HealOS Developer Platform
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground leading-relaxed">
              Programmatic APIs and autonomous agent toolkits for modern healthcare management. Connect clinical EHR records, real-time telemetry, scheduling engines, and diagnostic workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-5 py-2.5 font-mono text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <span>↓</span> OpenAPI 3.1 Spec
              </a>
              <a
                href="/.well-known/mcp"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>⚡</span> MCP Manifest
              </a>
              <Link
                href="/auth.md"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>🔒</span> Auth Guide
              </Link>
            </div>
          </div>
        </section>

        {/* Quickstart & Integration */}
        <section className="mx-auto max-w-5xl px-6 py-16 md:px-12 lg:px-20">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Quickstart in 60 Seconds
          </h2>
          <p className="mt-2 text-muted-foreground">
            Probe the live HealOS gateway or inspect system health directly with cURL:
          </p>

          <div className="mt-6 rounded-lg border border-border bg-card/60 p-5 font-mono text-sm shadow-sm overflow-x-auto">
            <div className="text-muted-foreground mb-2 select-none"># 1. Probe the system health endpoint</div>
            <code className="text-primary select-all">
              curl -s https://healos-theta.vercel.app/api/v1/health | jq .
            </code>

            <div className="text-muted-foreground mt-4 mb-2 select-none"># 2. Query available clinical appointments</div>
            <code className="text-primary select-all">
              curl -s https://healos-theta.vercel.app/api/v1/appointments | jq .
            </code>
          </div>

          {/* Multi-language SDK Packages */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Official Client SDKs
            </h2>
            <p className="mt-2 text-muted-foreground">
              Pre-built typed SDKs for TypeScript, Python, and Go:
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-lg border border-border bg-card/60">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Node.js / TypeScript</span>
                <code className="text-primary mt-2 block select-all font-semibold">npm i @healos/sdk</code>
                <p className="text-muted-foreground mt-2 font-sans text-xs">Full TypeScript definitions, React hooks, and MCP client bindings.</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card/60">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Python (LangChain / CrewAI)</span>
                <code className="text-primary mt-2 block select-all font-semibold">pip install healos-sdk</code>
                <p className="text-muted-foreground mt-2 font-sans text-xs">Pydantic models, async telemetry client, and LangChain clinical tools.</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card/60">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Go</span>
                <code className="text-primary mt-2 block select-all font-semibold">go get github.com/Zuhaib-dev/healos-go</code>
                <p className="text-muted-foreground mt-2 font-sans text-xs">High-performance hospital gateway client and WebSocket listener.</p>
              </div>
            </div>
          </div>

          {/* Model Context Protocol Integration & A2UI Generative UI */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Model Context Protocol (MCP) &amp; A2UI Generative UI
            </h2>
            <p className="mt-2 text-muted-foreground">
              HealOS publishes a first-party MCP server at <code>/.well-known/mcp</code> supporting JSON-RPC 2.0 handshake, live SSE telemetry, and A2UI generative UI resources (<code>ui://</code>) for Claude Desktop, Cursor, and autonomous agent runtimes:
            </p>

            <div className="mt-6 rounded-lg border border-border bg-card/60 p-5 font-mono text-sm shadow-sm overflow-x-auto">
              <div className="text-muted-foreground mb-2 select-none">{"// claude_desktop_config.json"}</div>
              <pre className="text-foreground">
{`{
  "mcpServers": {
    "healos": {
      "url": "https://healos-theta.vercel.app/.well-known/mcp"
    }
  }
}`}
              </pre>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-muted/20 p-5">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                A2UI (Agent-to-UI) &amp; MCP Apps Support
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                HealOS exposes in-agent interactive UI cards that agents can present directly to users without leaving the chat interface:
              </p>
              <ul className="mt-3 space-y-2 text-xs font-mono text-muted-foreground">
                <li><code className="text-foreground font-semibold">ui://healos/appointment-booking-form</code> — Interactive date picker and clinician selector.</li>
                <li><code className="text-foreground font-semibold">ui://healos/vitals-telemetry-monitor</code> — Real-time continuous ECG, SpO2, and blood pressure graphs.</li>
                <li><code className="text-foreground font-semibold">ui://healos/emergency-triage-board</code> — Live Emergency Department triage board (ESI 1-5).</li>
                <li><code className="text-foreground font-semibold">ui://healos/patient-search-card</code> — Demographic master patient index summary.</li>
              </ul>
            </div>
          </div>

          {/* Scoped Permissions & OAuth */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              OAuth 2.0 Scopes &amp; Security
            </h2>
            <p className="mt-2 text-muted-foreground">
              Granular OAuth permissions enforced across all clinical endpoints:
            </p>

            <div className="mt-6 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left font-mono text-xs sm:text-sm">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Standard Roles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary">read:patients</td>
                    <td className="px-4 py-3 text-muted-foreground">Read demographic records and allergies</td>
                    <td className="px-4 py-3">Doctor, Nurse, Admin</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary">write:patients</td>
                    <td className="px-4 py-3 text-muted-foreground">Register or update patient profiles</td>
                    <td className="px-4 py-3">Reception, Admin</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary">read:appointments</td>
                    <td className="px-4 py-3 text-muted-foreground">Query scheduled consultation slots</td>
                    <td className="px-4 py-3">All Authenticated</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary">write:appointments</td>
                    <td className="px-4 py-3 text-muted-foreground">Book or cancel clinic appointments</td>
                    <td className="px-4 py-3">Patient, Doctor, Reception</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-primary">read:vitals</td>
                    <td className="px-4 py-3 text-muted-foreground">Access physiological vitals observations</td>
                    <td className="px-4 py-3">Nurse, Doctor</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* API Deprecation & Sunset Policy */}
          <div id="deprecation" className="mt-16 rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-500">
              <span>⚠️</span> RFC 8594 Sunset &amp; Deprecation Policy
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl mt-4">
              API Deprecation Policy
            </h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              HealOS adheres strictly to semantic versioning and the IETF RFC 8594 standard. Changes to public REST and MCP contracts are governed by our stability commitments:
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-lg border border-border bg-background">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Guarantee Window</span>
                <span className="text-foreground text-sm font-semibold mt-1 block">24 Months Minimum Notice</span>
                <p className="text-muted-foreground mt-2 font-sans text-xs">All deprecated endpoints remain functional and supported for at least 24 months after deprecation notice.</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-background">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Current Stable Version</span>
                <span className="text-primary text-sm font-semibold mt-1 block">v1 (Path Prefix: /api/v1)</span>
                <p className="text-muted-foreground mt-2 font-sans text-xs">Includes health, catalog, sandbox, appointments, patients, and vitals APIs.</p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-background">
                <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">Scheduled Sunset Date</span>
                <span className="text-amber-500 text-sm font-semibold mt-1 block">December 31, 2027</span>
                <p className="text-muted-foreground mt-2 font-sans text-xs">Responses include <code>Sunset: Fri, 31 Dec 2027 23:59:59 GMT</code> and <code>Deprecation</code> headers.</p>
              </div>
            </div>

            <div className="mt-6 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                When an endpoint is marked for deprecation, HealOS automatically includes the standard HTTP <code>Sunset</code> and <code>Link: &lt;https://healos-theta.vercel.app/developers#deprecation&gt;; rel=&quot;deprecation&quot;</code> headers.
              </p>
              <p>
                Migration documentation and version release notes are continuously mirrored at <Link href="/developers" className="text-primary hover:underline">/developers</Link> and <Link href="/openapi.json" className="text-primary hover:underline">/openapi.json</Link>.
              </p>
            </div>
          </div>

          {/* Agent Coding Configs & Open Source */}
          <div className="mt-16 rounded-xl border border-border bg-card/40 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              AI Coding Agent Configurations
            </h2>
            <p className="mt-2 text-muted-foreground">
              Official workspace rules and instruction sets for Claude Code, Cursor, and Windsurf are published in our open-source repository:
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <a
                href="https://github.com/Zuhaib-dev/HealOS/blob/main/.claude/CLAUDE.md"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
              >
                <span className="text-primary font-semibold block">Claude Code Rules</span>
                <span className="text-muted-foreground mt-1 block font-mono text-[11px]">.claude/CLAUDE.md</span>
              </a>
              <a
                href="https://github.com/Zuhaib-dev/HealOS/blob/main/.cursorrules"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
              >
                <span className="text-primary font-semibold block">Cursor Rules</span>
                <span className="text-muted-foreground mt-1 block font-mono text-[11px]">.cursorrules</span>
              </a>
              <a
                href="https://github.com/Zuhaib-dev/HealOS/blob/main/.windsurfrules"
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors"
              >
                <span className="text-primary font-semibold block">Windsurf Rules</span>
                <span className="text-muted-foreground mt-1 block font-mono text-[11px]">.windsurfrules</span>
              </a>
            </div>

            <div className="mt-4">
              <a
                href="https://github.com/Zuhaib-dev/HealOS"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline font-mono text-xs"
              >
                <span>📦</span> Explore Full GitHub Repository: github.com/Zuhaib-dev/HealOS →
              </a>
            </div>
          </div>

          {/* Author & Engineering Spotlight */}
          <div className="mt-16 rounded-xl border border-border bg-gradient-to-r from-card/80 to-card/40 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="mono-label text-primary font-semibold text-xs tracking-wider uppercase">
                  Architecture &amp; Engineering
                </span>
                <h3 className="font-display text-2xl font-bold mt-1">Zuhaib Rashid</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Full Stack Developer &amp; Healthcare Systems Architect
                </p>
                <p className="text-muted-foreground text-xs font-mono mt-3">
                  Lead architect of HealOS clinical workflows, WebSocket telemetry, and autonomous MCP integration.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://zuhaibrashid.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-mono text-xs font-medium text-background transition-opacity hover:opacity-90"
                >
                  🌐 Portfolio
                </a>
                <a
                  href="mailto:zuhaibrashid01@gmail.com"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  ✉️ zuhaibrashid01@gmail.com
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
