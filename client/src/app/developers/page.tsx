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

          {/* Model Context Protocol Integration */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Model Context Protocol (MCP) Integration
            </h2>
            <p className="mt-2 text-muted-foreground">
              Add HealOS tools directly into Claude Desktop, Cursor, or autonomous agent runtimes:
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
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
