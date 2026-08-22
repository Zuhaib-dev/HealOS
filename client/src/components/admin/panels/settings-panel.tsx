"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ActionButton, PanelHeader } from "../admin-shell";

/* ---------- 08 settings ---------- */

function Toggle({ label, note, initial }: { label: string; note: string; initial?: boolean }) {
  const [on, setOn] = useState(!!initial);
  return (
    <div className="hairline-b flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-muted-foreground mt-1 text-xs">{note}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label={label}
        className={`hairline relative h-6 w-11 shrink-0 transition-colors ${on ? "bg-accent/25" : ""}`}
      >
        <motion.span
          className={`absolute top-0.75 size-4 ${on ? "bg-accent" : "bg-muted-foreground/60"}`}
          animate={{ left: on ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const [profile, setProfile] = useState({
    facilityName: "HealOS Hospital",
    licenseNumber: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    escalationContact: "",
  });

  const handleSave = () => {
    window.localStorage.setItem("healos:admin:facility-settings", JSON.stringify(profile));
    toast.success("Facility settings saved in this browser session.");
  };

  return (
    <section>
      <PanelHeader
        index="08 / CONFIG"
        title="Facility settings"
        note="Governance switches that apply hospital-wide the moment they are changed."
        actions={<ActionButton tone="solid" onClick={handleSave}>Save changes</ActionButton>}
      />
      <div className="grid lg:grid-cols-2">
        <div className="hairline-b px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Access & safety</p>
          <div className="mt-3">
            <Toggle label="Enforce 2FA for clinical roles" note="Blocks record access without a second factor." initial />
            <Toggle label="Break-glass emergency access" note="Allows override with mandatory post-hoc review." initial />
            <Toggle label="Auto-suspend dormant accounts" note="Deactivates accounts idle for 45 days." />
            <Toggle label="Restrict exports to on-site network" note="Blocks bulk export from outside the facility." initial />
          </div>
        </div>
        <div className="hairline-b hairline-l px-5 py-6 sm:px-8">
          <p className="mono-label text-muted-foreground">Facility profile</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mono-label text-muted-foreground">Facility name</span>
              <input
                value={profile.facilityName}
                onChange={(e) => setProfile((current) => ({ ...current, facilityName: e.target.value }))}
                className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-(--hairline-strong)"
              />
            </label>
            <label className="block">
              <span className="mono-label text-muted-foreground">Licence number</span>
              <input
                value={profile.licenseNumber}
                onChange={(e) => setProfile((current) => ({ ...current, licenseNumber: e.target.value }))}
                placeholder="Enter facility licence"
                className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-(--hairline-strong)"
              />
            </label>
            <label className="block">
              <span className="mono-label text-muted-foreground">Timezone</span>
              <input
                value={profile.timezone}
                onChange={(e) => setProfile((current) => ({ ...current, timezone: e.target.value }))}
                className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-(--hairline-strong)"
              />
            </label>
            <label className="block">
              <span className="mono-label text-muted-foreground">Escalation contact</span>
              <input
                value={profile.escalationContact}
                onChange={(e) => setProfile((current) => ({ ...current, escalationContact: e.target.value }))}
                placeholder="ops@example.com"
                className="hairline mt-2 w-full bg-transparent px-3 py-2.5 font-mono text-sm outline-none focus:border-(--hairline-strong)"
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
