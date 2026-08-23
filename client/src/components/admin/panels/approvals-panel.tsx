"use client";

import { useCallback, useState, useEffect } from "react";
import { ProfessionalProfileData, fetchPendingOnboardingRequestsApi, approveOnboardingRequestApi, rejectOnboardingRequestApi } from "@/lib/api/onboarding";
import { toast } from "sonner";
import { Check, X, ClipboardCheck } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- shared primitives ---------- */

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as { response?: { data?: { message?: string } } };
  return maybeError.response?.data?.message || fallback;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground bg-muted/40 px-5 py-4 text-left font-semibold border-b border-border/60 backdrop-blur-md sticky top-0">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-sm ${className}`}>{children}</td>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-5 sm:mx-8 mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">{children}</table>
      </div>
    </div>
  );
}


/* ---------- 02 approvals ---------- */

export function ApprovalsPanel() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ProfessionalProfileData[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPendingOnboardingRequestsApi();
      if (res.success && res.profiles) {
        setRequests(res.profiles);
      }
    } catch (err) {
      console.error("Failed to load pending onboarding requests", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  useAdminRealtime(["approvals", "staff", "users"], loadRequests);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      const res = await approveOnboardingRequestApi(id);
      if (res.success) {
        toast.success(res.message || "Clinician request approved! Role upgraded.");
        await loadRequests();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to approve request"));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Enter rejection reason for this applicant:");
    if (!reason || reason.trim().length < 5) {
      toast.error("Please enter a valid rejection reason (at least 5 characters).");
      return;
    }

    try {
      setActionId(id);
      const res = await rejectOnboardingRequestApi(id, reason);
      if (res.success) {
        toast.success("Application rejected with reason");
        await loadRequests();
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to reject request"));
    } finally {
      setActionId(null);
    }
  };

  return (
    <section>
      <PanelHeader
        index="02 / APPROVALS"
        title="Credential queue"
        note="Verify licences and grant scoped access before a clinician touches a record."
        actions={<ActionButton>Verification policy</ActionButton>}
      />
      <TablePanel>
        <thead className="hairline-b">
          <tr>
            <Th>Request</Th>
            <Th>Applicant</Th>
            <Th>Licence</Th>
            <Th>Submitted</Th>
            <Th>Decision</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="p-12 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading credential queue...
              </td>
            </tr>
          ) : requests.length > 0 ? (
            requests.map((reqItem) => {
                const userObj = typeof reqItem.user === "object" ? reqItem.user : null;
                const applicantName = userObj?.name || "Applicant";
                const applicantEmail = userObj?.email || "";
                const isBusy = actionId === reqItem._id;

                return (
                  <tr key={reqItem._id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                    <Td>
                      <span className="font-mono text-muted-foreground">{reqItem._id.slice(-6).toUpperCase()}</span>
                    </Td>
                    <Td>
                      <p className="font-medium group-hover:text-primary transition-colors">{applicantName}</p>
                      <p className="mono-label text-muted-foreground">{reqItem.requestedRole} · {reqItem.degree}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{applicantEmail}</p>
                    </Td>
                    <Td>
                      <span className="mono-label font-bold text-primary">{reqItem.licenseNumber}</span>
                      <p className="text-[11px] text-muted-foreground">{reqItem.specialization} ({reqItem.experienceYears}y exp)</p>
                    </Td>
                    <Td>
                      <span className="mono-label text-muted-foreground">{new Date(reqItem.createdAt).toLocaleDateString()}</span>
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(reqItem._id)}
                          className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-3 py-1.5 hover:opacity-75 hover:-translate-y-0.5 cursor-pointer rounded-md transition-all disabled:opacity-50"
                        >
                          <Check className="size-3" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReject(reqItem._id)}
                          className="hairline mono-label text-destructive bg-destructive/10 border-destructive/30 flex items-center gap-1.5 px-3 py-1.5 hover:opacity-75 hover:-translate-y-0.5 cursor-pointer rounded-md transition-all disabled:opacity-50"
                        >
                          <X className="size-3" /> Reject
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })
          ) : (
            <tr>
              <td colSpan={5} className="p-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="bg-muted/40 p-4 rounded-full border border-dashed border-border/60">
                    <ClipboardCheck className="size-6 text-muted-foreground/60" />
                  </div>
                  <p className="mono-label text-muted-foreground">No pending credential requests.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
