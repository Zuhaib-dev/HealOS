import { useCallback, useState, useEffect } from "react";
import { ProfessionalProfileData, fetchPendingOnboardingRequestsApi, approveOnboardingRequestApi, rejectOnboardingRequestApi } from "@/lib/api/onboarding";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { ActionButton, PanelHeader } from "../admin-shell";
import { useAdminRealtime } from "../use-admin-realtime";

/* ---------- shared primitives ---------- */

function Th({ children }: { children: React.ReactNode }) {
  return <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "ok" | "warn" | "bad" | "mute" }) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function TablePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hairline-b overflow-x-auto">
      <table className="w-full min-w-180 border-collapse">{children}</table>
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
    loadRequests();
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve request");
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject request");
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
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground animate-pulse">
                Loading credential queue from MongoDB Atlas...
              </td>
            </tr>
          ) : requests.length > 0 ? (
            requests.map((reqItem) => {
                const userObj = typeof reqItem.user === "object" ? reqItem.user : null;
                const applicantName = userObj?.name || "Applicant";
                const applicantEmail = userObj?.email || "";
                const isBusy = actionId === reqItem._id;

                return (
                  <tr key={reqItem._id} className="hairline-b">
                    <Td>
                      <span className="mono-label text-muted-foreground">{reqItem._id.slice(-6).toUpperCase()}</span>
                    </Td>
                    <Td>
                      <p className="font-medium text-foreground">{applicantName}</p>
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
                          className="hairline mono-label bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75 cursor-pointer rounded"
                        >
                          <Check className="size-3" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReject(reqItem._id)}
                          className="hairline mono-label text-destructive bg-destructive/10 border-destructive/30 flex items-center gap-1.5 px-2.5 py-1.5 hover:opacity-75 cursor-pointer rounded"
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
              <td colSpan={5} className="p-8 text-center mono-label text-xs text-muted-foreground">
                No pending credential requests.
              </td>
            </tr>
          )}
        </tbody>
      </TablePanel>
    </section>
  );
}
