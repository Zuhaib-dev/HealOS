"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PhoneCall,
  Check,
  X,
  TriangleAlert,
  Clock,
  ShieldAlert,
  UserPlus,
  RefreshCw,
  Search,
  Phone,
  CheckCircle2,
  AlertOctagon,
  Users,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { Card, LiveDot } from "@/components/workspace/ui";
import {
  fetchLabCriticalValuesApi,
  recordLabCriticalCallbackApi,
  fetchLabCriticalContactsApi,
  saveLabCriticalContactApi,
} from "@/lib/api/lab";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";

export function CriticalPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [filter, setFilter] = useState<"OPEN" | "DOCUMENTED" | "ALL">("OPEN");
  const [search, setSearch] = useState("");

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

  const loadCriticals = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [res, contactRes] = await Promise.all([
        fetchLabCriticalValuesApi(),
        fetchLabCriticalContactsApi(),
      ]);
      if (res.success) setRows(res.criticalValues || []);
      setContacts(contactRes.contacts || []);
    } catch {
      toast.error("Failed to load critical values");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCriticals();
    const refresh = window.setInterval(() => loadCriticals(true), 60_000);
    const socket = getSocket();
    if (socket) {
      const reload = () => loadCriticals(true);
      socket.on("lab_report_validated", reload);
      socket.on("lab_critical_callback_recorded", reload);
      return () => {
        window.clearInterval(refresh);
        socket.off("lab_report_validated", reload);
        socket.off("lab_critical_callback_recorded", reload);
      };
    }
    return () => window.clearInterval(refresh);
  }, []);

  const recordCallback = async (id: string) => {
    const value = callbacks[id];
    if (!value?.contactId || !value.confirmed) {
      toast.error(
        "Select a clinician contact and confirm the verbal read-back.",
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
      toast.success(
        "Critical read-back logged! Validation lock is now released.",
      );
      await loadCriticals(true);
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
      setIsContactFormOpen(false);
      toast.success("Escalation contact registered.");
      await loadCriticals(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to save contact.");
    }
  };

  const openCount = useMemo(
    () => rows.filter((r) => !r.criticalCallback?.readBackConfirmed).length,
    [rows],
  );
  const documentedCount = useMemo(
    () => rows.filter((r) => r.criticalCallback?.readBackConfirmed).length,
    [rows],
  );

  const visible = rows.filter((c) => {
    const isConfirmed = Boolean(c.criticalCallback?.readBackConfirmed);
    if (filter === "OPEN" && isConfirmed) return false;
    if (filter === "DOCUMENTED" && !isConfirmed) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const text =
        `${c.patient?.name || c.emergencyCase?.patientName || ""} ${c.emergencyCase?.caseId || ""} ${c.order?.testName || ""} ${c.order?.accessionNumber || ""} ${c.findings || ""}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="05 / panic safety loop"
        title="Critical-Value Callbacks"
        note="15-minute mandatory closed-loop notification. Report panic values immediately to attending physicians and document verbal read-back."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadCriticals(true)}
              disabled={isRefreshing}
              aria-label="Refresh critical values"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsContactFormOpen((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors shadow-2xs"
            >
              <Users className="size-3.5" />
              <span>Escalation Contacts ({contacts.length})</span>
            </button>
          </div>
        }
      />

      {/* Escalation Contact Directory Drawer */}
      <AnimatePresence>
        {isContactFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 sm:px-6 bg-card border-b border-border/70 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold text-foreground">
                  Clinical Escalation Directory
                </h3>
                <p className="text-xs text-muted-foreground">
                  Priority 1 is contacted first. If unreachable within 5
                  minutes, escalate to Priority 2 or Attending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsContactFormOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={saveContact}
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input
                required
                aria-label="Contact name"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Clinician / Nurse Name"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
              <input
                required
                aria-label="Contact role"
                value={contactForm.role}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, role: e.target.value }))
                }
                placeholder="Role (e.g. ICU Charge Nurse, ER Attending)"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
              <input
                required
                aria-label="Contact phone"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="Direct Phone / Extension"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
              <input
                required
                aria-label="Escalation priority"
                type="number"
                min="1"
                max="10"
                value={contactForm.priority}
                onChange={(e) =>
                  setContactForm((p) => ({ ...p, priority: e.target.value }))
                }
                placeholder="Priority (1-10)"
                className="rounded-lg border border-border/80 bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90"
              >
                Add Clinician Contact
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {contacts.map((contact) => (
                <div
                  key={contact._id}
                  className="px-3 py-1.5 rounded-lg border border-border/70 bg-background text-xs flex items-center gap-2"
                >
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold">
                    L{contact.priority}
                  </span>
                  <span className="font-semibold text-foreground">
                    {contact.name}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {contact.role} · {contact.phone}
                  </span>
                  <a
                    href={`tel:${contact.phone}`}
                    className="size-5 rounded flex items-center justify-center text-primary hover:bg-primary/10"
                    title={`Call ${contact.name}`}
                  >
                    <Phone className="size-3" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-rose-600 dark:text-rose-400 font-bold">
                Awaiting Urgent Callback
              </p>
              <p className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {openCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="size-5 animate-pulse" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                Read-Back Documented
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {documentedCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">
                Total Critical Orders
              </p>
              <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
                {rows.length}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <ShieldAlert className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("OPEN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "OPEN"
                ? "bg-rose-600 text-white font-semibold shadow-xs"
                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
            }`}
          >
            Urgent Open ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("DOCUMENTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "DOCUMENTED"
                ? "bg-emerald-600 text-white font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            Documented ({documentedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === "ALL"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Critical ({rows.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="critical-search"
            aria-label="Search critical reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, accession, finding..."
            className="w-full bg-background border border-border/80 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* Critical Items Cards */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">Loading panic callbacks...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
            <CheckCircle2 className="size-12 mb-3 text-emerald-600 opacity-60" />
            <p className="font-bold text-foreground text-base">
              {filter === "OPEN"
                ? "No Outstanding Critical Callbacks"
                : "No Critical Records Found"}
            </p>
            <p className="text-xs max-w-sm mt-1">
              All critical lab findings have had physician read-backs documented
              in accordance with hospital policy.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((c) => {
              const isConfirmed = Boolean(
                c.criticalCallback?.readBackConfirmed,
              );
              const patientName =
                c.patient?.name ||
                c.emergencyCase?.patientName ||
                "Unknown Patient";
              const accession =
                c.order?.accessionNumber || c.order?._id?.slice(-8) || "N/A";
              const selectedContactId = callbacks[c._id]?.contactId;
              const selectedContact = contacts.find(
                (contact) => contact._id === selectedContactId,
              );

              return (
                <div
                  key={c._id}
                  className={`bg-card rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                    !isConfirmed
                      ? "border-rose-500/50 ring-1 ring-rose-500/20"
                      : "border-border/80 hover:border-primary/40"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                          {accession}
                        </span>
                        <h3 className="font-mono text-lg font-bold text-foreground mt-1">
                          {patientName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {c.order?.testName}
                        </p>
                      </div>

                      {!isConfirmed && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                          <TriangleAlert className="size-3" /> ACTION REQUIRED
                        </span>
                      )}
                    </div>

                    {/* Panic Findings Box */}
                    <div className="my-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <p className="text-[10px] uppercase font-mono tracking-wider font-bold text-rose-700 dark:text-rose-300">
                        Critical Lab Finding
                      </p>
                      <p className="text-rose-600 dark:text-rose-400 font-mono text-lg font-bold mt-1">
                        {c.findings || "See structured results or report"}
                      </p>

                      <div className="mt-3 pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Detected:{" "}
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        <span
                          className={`font-semibold font-mono ${
                            c.overdue
                              ? "text-destructive font-bold"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {c.overdue
                            ? `OVERDUE ${c.overdueMinutes || 0}m · L${c.escalationLevel || 1}`
                            : `Due ${new Date(c.criticalDueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                        </span>
                      </div>
                    </div>

                    {c.patient?.phone && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Patient Emergency Phone:{" "}
                        <span className="font-mono">{c.patient.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Callback Execution or Confirmation Display */}
                  <div>
                    {isConfirmed ? (
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                        <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4" /> Verbal Read-Back
                          Confirmed
                        </p>
                        <p className="text-muted-foreground">
                          Spoke with{" "}
                          <strong className="text-foreground">
                            {c.criticalCallback.contact?.name ||
                              c.criticalCallback.clinician ||
                              "Clinician"}
                          </strong>{" "}
                          at{" "}
                          {new Date(c.criticalCallback.calledAt).toLocaleString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                        {c.criticalCallback.note && (
                          <p className="text-muted-foreground italic mt-1">
                            &quot;{c.criticalCallback.note}&quot;
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/80">
                        <div>
                          <label
                            htmlFor={`critical-contact-${c._id}`}
                            className="text-xs font-semibold text-foreground block mb-1"
                          >
                            Select Escalation Contact
                          </label>
                          <div className="flex gap-2">
                            <select
                              id={`critical-contact-${c._id}`}
                              value={callbacks[c._id]?.contactId || ""}
                              onChange={(e) =>
                                setCallbacks((prev) => ({
                                  ...prev,
                                  [c._id]: {
                                    contactId: e.target.value,
                                    confirmed: prev[c._id]?.confirmed || false,
                                    note: prev[c._id]?.note || "",
                                  },
                                }))
                              }
                              className="flex-1 bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                            >
                              <option value="">
                                Choose Physician / Nurse...
                              </option>
                              {contacts.map((contact) => (
                                <option key={contact._id} value={contact._id}>
                                  L{contact.priority} · {contact.name} (
                                  {contact.role}) · {contact.phone}
                                </option>
                              ))}
                            </select>

                            {selectedContact?.phone && (
                              <a
                                href={`tel:${selectedContact.phone}`}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                title={`Dial ${selectedContact.name}`}
                              >
                                <PhoneCall className="size-3.5" />
                                <span>Call</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <textarea
                          aria-label="Callback outcome and notes"
                          value={callbacks[c._id]?.note || ""}
                          onChange={(e) =>
                            setCallbacks((prev) => ({
                              ...prev,
                              [c._id]: {
                                contactId: prev[c._id]?.contactId || "",
                                confirmed: prev[c._id]?.confirmed || false,
                                note: e.target.value,
                              },
                            }))
                          }
                          placeholder="Document read-back confirmation and clinician acknowledgment note..."
                          rows={2}
                          className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                        />

                        <label className="flex items-start gap-2 text-xs text-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={callbacks[c._id]?.confirmed || false}
                            onChange={(e) =>
                              setCallbacks((prev) => ({
                                ...prev,
                                [c._id]: {
                                  contactId: prev[c._id]?.contactId || "",
                                  confirmed: e.target.checked,
                                  note: prev[c._id]?.note || "",
                                },
                              }))
                            }
                            className="mt-0.5 rounded"
                          />
                          <span>
                            I verify that this critical lab value was read back
                            and verified by the clinician named above.
                          </span>
                        </label>

                        <button
                          type="button"
                          disabled={
                            saving === c._id ||
                            !callbacks[c._id]?.contactId ||
                            !callbacks[c._id]?.confirmed
                          }
                          onClick={() => recordCallback(c._id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {saving === c._id ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              <span>Recording Read-Back...</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-3.5" />
                              <span>Log Completed Read-Back</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
