"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  TestTube,
  PhoneCall,
  Check,
  X,
  Barcode,
  TriangleAlert,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import {
  Card,
  LiveDot,
  Pill,
  StatGrid,
  Td,
  Th,
  type Tone,
} from "@/components/workspace/ui";
import {
  fetchLabCriticalValuesApi,
  recordLabCriticalCallbackApi,
  fetchLabCriticalContactsApi,
  saveLabCriticalContactApi,
} from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

/** Animated tube-rack glyph — hand-drawn SVG, no raster assets. */
function RackGlyph({ tubes }: { tubes: { colour: string; count: number }[] }) {
  const flat = tubes
    .flatMap((t) => Array.from({ length: t.count }, () => t.colour))
    .slice(0, 8);
  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full">
      <line
        x1="4"
        y1="42"
        x2="116"
        y2="42"
        stroke="var(--hairline)"
        strokeWidth="1"
      />
      {flat.map((c, i) => (
        <g key={i}>
          <rect
            x={8 + i * 13}
            y="10"
            width="8"
            height="30"
            fill="none"
            stroke="var(--hairline)"
          />
          <motion.rect
            x={8 + i * 13}
            width="8"
            fill={c}
            opacity="0.7"
            initial={{ y: 40, height: 0 }}
            animate={{ y: 24, height: 16 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: "easeOut" }}
          />
        </g>
      ))}
    </svg>
  );
}

/* ---------- 05 critical callback ---------- */

export function CriticalPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [callbacks, setCallbacks] = useState<
    Record<string, { contactId: string; confirmed: boolean; note: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    phone: "",
    priority: "1",
  });

  const loadCriticals = async () => {
    try {
      const [res, contactRes] = await Promise.all([
        fetchLabCriticalValuesApi(),
        fetchLabCriticalContactsApi(),
      ]);
      if (res.success) setRows(res.criticalValues);
      setContacts(contactRes.contacts || []);
    } catch (e) {
      toast.error("Failed to load critical values");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCriticals();
    const refresh = window.setInterval(loadCriticals, 60_000);
    const socket = getSocket();
    if (socket) {
      socket.on("lab_report_validated", loadCriticals);
      socket.on("lab_critical_callback_recorded", loadCriticals);
      return () => {
        window.clearInterval(refresh);
        socket.off("lab_report_validated", loadCriticals);
        socket.off("lab_critical_callback_recorded", loadCriticals);
      };
    }
    return () => window.clearInterval(refresh);
  }, []);

  const recordCallback = async (id: string) => {
    const value = callbacks[id];
    if (!value?.contactId || !value.confirmed) {
      toast.error(
        "Select an escalation contact and confirm the read-back first.",
      );
      return;
    }
    setSaving(id);
    try {
      const report = rows.find((row) => row._id === id);
      await recordLabCriticalCallbackApi(
        id,
        value.contactId,
        true,
        report?.escalationLevel || 1,
        value.note,
      );
      toast.success("Critical-result callback recorded.");
      await loadCriticals();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to record callback.",
      );
    } finally {
      setSaving(null);
    }
  };

  const saveContact = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveLabCriticalContactApi({
        ...contactForm,
        priority: Number(contactForm.priority),
      });
      setContactForm({ name: "", role: "", phone: "", priority: "1" });
      toast.success("Escalation contact saved.");
      await loadCriticals();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to save contact.");
    }
  };

  return (
    <section>
      <PanelHeader
        index="05 / closed loop"
        title="Critical-value callback"
        note="15-minute callback target. Overdue results show escalation level and prioritized contacts configured below."
        actions={
          <ActionButton tone="solid">
            {rows.filter((r) => !r.criticalCallback?.readBackConfirmed).length}{" "}
            open
          </ActionButton>
        }
      />

      <div
        className="grid gap-px lg:grid-cols-3"
        style={{ background: "var(--hairline)" }}
      >
        {loading ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-3">
            Loading critical values...
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-background p-8 text-center text-muted-foreground lg:col-span-3">
            No pending critical values.
          </div>
        ) : (
          rows.map((c) => {
            const patientName = c.patient?.name || "Unknown Patient";
            const accession =
              c.order?.accessionNumber || c.order?._id?.slice(-8) || "N/A";

            return (
              <div key={c._id} className="bg-background p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-label text-accent/80">{accession}</p>
                  {!c.criticalCallback?.readBackConfirmed && (
                    <LiveDot tone="bad" />
                  )}
                </div>
                <p className="mt-1 font-mono text-lg font-bold">
                  {patientName}
                </p>
                <p className="mono-label text-muted-foreground">
                  {c.order?.testName}
                </p>

                <div className="hairline mt-4 p-4">
                  <p className="mono-label text-muted-foreground">Findings</p>
                  <p className="text-destructive mt-1 font-mono text-base font-bold">
                    {c.findings || "See report"}
                  </p>
                  <p className="mono-label text-muted-foreground mt-1">
                    detected{" "}
                    {new Date(c.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                  <p
                    className={`mt-2 text-sm font-semibold ${c.overdue ? "text-destructive" : "text-amber-700"}`}
                  >
                    {c.overdue
                      ? `OVERDUE ${c.overdueMinutes} min · escalation level ${c.escalationLevel}`
                      : `Callback due ${new Date(c.criticalDueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`}
                  </p>
                  {c.patient?.phone && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Patient contact: {c.patient.phone}
                    </p>
                  )}
                </div>

                {c.criticalCallback?.readBackConfirmed ? (
                  <p className="mono-label text-brass mt-4">
                    Called{" "}
                    {c.criticalCallback.contact?.name ||
                      c.criticalCallback.clinician}{" "}
                    at {new Date(c.criticalCallback.calledAt).toLocaleString()}{" "}
                    · read-back confirmed
                    {c.criticalCallback.note
                      ? ` · ${c.criticalCallback.note}`
                      : ""}
                  </p>
                ) : (
                  <div className="mt-4">
                    <label
                      className="mb-1 block text-xs font-medium"
                      htmlFor={`critical-contact-${c._id}`}
                    >
                      Escalation contact
                    </label>
                    <select
                      id={`critical-contact-${c._id}`}
                      value={callbacks[c._id]?.contactId || ""}
                      onChange={(e) =>
                        setCallbacks((previous) => ({
                          ...previous,
                          [c._id]: {
                            contactId: e.target.value,
                            confirmed: previous[c._id]?.confirmed || false,
                            note: previous[c._id]?.note || "",
                          },
                        }))
                      }
                      className="hairline mono-label w-full rounded-sm bg-background px-3 py-2"
                    >
                      <option value="">Choose contact</option>
                      {contacts.map((contact) => (
                        <option key={contact._id} value={contact._id}>
                          L{contact.priority} · {contact.name} · {contact.role}{" "}
                          · {contact.phone}
                        </option>
                      ))}
                    </select>
                    <textarea
                      aria-label="Critical callback note"
                      value={callbacks[c._id]?.note || ""}
                      onChange={(e) =>
                        setCallbacks((previous) => ({
                          ...previous,
                          [c._id]: {
                            contactId: previous[c._id]?.contactId || "",
                            confirmed: previous[c._id]?.confirmed || false,
                            note: e.target.value,
                          },
                        }))
                      }
                      placeholder="Call outcome and escalation note"
                      rows={2}
                      className="hairline mono-label mt-2 w-full rounded-sm bg-background px-3 py-2"
                    />
                    <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={callbacks[c._id]?.confirmed || false}
                        onChange={(e) =>
                          setCallbacks((previous) => ({
                            ...previous,
                            [c._id]: {
                              contactId: previous[c._id]?.contactId || "",
                              confirmed: e.target.checked,
                              note: previous[c._id]?.note || "",
                            },
                          }))
                        }
                      />
                      I confirmed the result by read-back with this clinician.
                    </label>
                    <div className="mt-2 flex gap-2">
                      <ActionButton
                        tone="solid"
                        disabled={saving === c._id}
                        onClick={() => recordCallback(c._id)}
                      >
                        <PhoneCall className="mr-1 inline size-3" /> Mark called
                      </ActionButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-5 sm:px-8">
        <Card>
          <p className="mono-label text-muted-foreground">
            Current pending critical results
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {[
              [
                "Awaiting callback",
                rows.filter((r) => !r.criticalCallback?.readBackConfirmed)
                  .length,
              ],
              [
                "Callback documented",
                rows.filter((r) => r.criticalCallback?.readBackConfirmed)
                  .length,
              ],
              ["Open critical results", rows.length],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-2xl font-bold">{v}</p>
                <p className="mono-label text-muted-foreground">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <form
        onSubmit={saveContact}
        className="mx-5 mb-5 rounded-xl border border-border bg-background p-4 sm:mx-8"
      >
        <h3 className="mb-1 font-semibold">Critical-result contact list</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Priority 1 is called first. Staff place calls; this list supports
          escalation and callback documentation.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            required
            aria-label="Contact name"
            value={contactForm.name}
            onChange={(e) =>
              setContactForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="Name"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            required
            aria-label="Contact role"
            value={contactForm.role}
            onChange={(e) =>
              setContactForm((p) => ({ ...p, role: e.target.value }))
            }
            placeholder="Role / team"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            required
            aria-label="Contact phone"
            value={contactForm.phone}
            onChange={(e) =>
              setContactForm((p) => ({ ...p, phone: e.target.value }))
            }
            placeholder="Phone"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            required
            aria-label="Escalation priority"
            type="number"
            min="1"
            max="20"
            value={contactForm.priority}
            onChange={(e) =>
              setContactForm((p) => ({ ...p, priority: e.target.value }))
            }
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <ActionButton type="submit" tone="solid">
            Add contact
          </ActionButton>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {contacts.map((contact) => (
            <li
              key={contact._id}
              className="rounded-full bg-muted/50 px-3 py-1.5 text-xs"
            >
              L{contact.priority} · {contact.name} · {contact.role} ·{" "}
              {contact.phone}
            </li>
          ))}
        </ul>
      </form>
    </section>
  );
}
