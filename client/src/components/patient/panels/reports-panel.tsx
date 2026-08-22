"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Check,
  Download,
  Eye,
  FileText,
  Share2,
  TriangleAlert,
  Video,
  MapPin,
  X,
  Send,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import {
  fetchAvailableDoctorsApi,
  bookAppointmentApi,
  fetchPatientAppointmentsApi,
  updateAppointmentStatusApi,
  DoctorListItem,
  AppointmentRecord,
} from "@/lib/api/appointment";
import {
  fetchPatientProfileApi,
  updatePatientProfileApi,
  PatientProfileData,
} from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";
import { fetchPatientDashboardApi, PatientDashboardData, payInvoiceApi } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";

/* ---------- primitives ---------- */

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const map = {
    ok: "bg-accent/12 text-brass",
    warn: "bg-foreground/[0.06] text-foreground",
    bad: "bg-destructive/12 text-destructive",
    mute: "bg-foreground/[0.04] text-muted-foreground",
  } as const;
  return <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">{children}</th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3.5 align-middle text-sm">{children}</td>;
}

/** Animated trend line — drawn, never an image. */
function Trend({ series }: { series: number[] }) {
  const max = Math.max(...series);
  const min = Math.min(...series);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = 30 - ((v - min) / Math.max(0.001, max - min)) * 24 - 3;
      return `${x},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full">
      <motion.polyline
        points={pts}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

/* ---------- 04 reports ---------- */

export function ReportsPanel() {
  const [q, setQ] = useState("");
  const { data, isLoading, refetch } = usePatientDashboard();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25 MB limit");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (uploadTitle.trim()) {
        formData.append("title", uploadTitle.trim());
      }

      const token = useAuthStore.getState().token;
      const res = await fetch("http://localhost:5001/api/v1/patient/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.status === "success") {
        toast.success("Document uploaded successfully");
        refetch();
      } else {
        throw new Error(json.message || "Failed to upload document");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during upload");
    } finally {
      setIsUploading(false);
      setUploadTitle("");
      e.target.value = ""; // Reset input
    }
  };

  const orders = data?.diagnosticOrders || [];
  const reports = data?.diagnosticReports || [];

  const allRecords = [
    ...orders.map(o => ({
      id: o._id,
      name: o.testName,
      kind: o.testType,
      dept: o.doctor?.name ? `Dr. ${o.doctor.name}` : "Doctor",
      date: new Date(o.createdAt).toLocaleDateString(),
      status: o.status === "REPORTED" ? "ready" : "pending",
      flagged: false,
      pages: 0,
      size: "",
      fileUrl: null
    })),
    ...reports.map(r => ({
      id: r._id,
      name: r.title || "Uploaded Report",
      kind: "REPORT",
      dept: r.uploadedBy?.name ? r.uploadedBy.name : "Lab",
      date: new Date(r.createdAt).toLocaleDateString(),
      status: "ready",
      flagged: false, // We could add logic for flags later
      pages: 1,
      size: "PDF",
      fileUrl: r.fileUrl || null
    }))
  ];

  const rows = allRecords.filter((r) =>
    `${r.name} ${r.kind} ${r.dept}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <section>
      <PanelHeader
        index="04 / records"
        title="Reports &amp; records"
        note="Lab and imaging reports, clinic letters, prescriptions and invoices — view, download or share with an outside doctor."
        actions={<ActionButton tone="solid">Download all as ZIP</ActionButton>}
      />

      <div className="hairline-b flex flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter reports"
          className="hairline mono-label placeholder:text-muted-foreground w-full max-w-sm bg-transparent px-3 py-2.5 outline-none"
        />
        <span className="mono-label text-muted-foreground">
          {rows.length} records found
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-215">
          <thead className="hairline-b">
            <tr>
              <Th>Document</Th>
              <Th>Type</Th>
              <Th>Department</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hairline-b hover:bg-foreground/2">
                <Td>
                  <span className="flex items-center gap-2">
                    <FileText className="text-accent size-3.5 shrink-0" />
                    <span className="font-mono text-sm">{r.name}</span>
                    {r.flagged && <Pill tone="bad">abnormal</Pill>}
                  </span>
                  {r.pages > 0 && (
                    <p className="mono-label text-muted-foreground mt-1">
                      {r.pages} pages · {r.size}
                    </p>
                  )}
                </Td>
                <Td>
                  <span className="mono-label text-muted-foreground">{r.kind}</span>
                </Td>
                <Td>
                  <span className="mono-label">{r.dept}</span>
                </Td>
                <Td>
                  <span className="mono-label">{r.date}</span>
                </Td>
                <Td>
                  <Pill
                    tone={r.status === "ready" ? "ok" : "warn"}
                  >
                    {r.status}
                  </Pill>
                </Td>
                <Td>
                  <div className="text-muted-foreground flex items-center gap-3">
                    {r.fileUrl ? (
                      <>
                        <a href={`http://localhost:5001${r.fileUrl}`} target="_blank" rel="noopener noreferrer" aria-label="View" className="hover:text-foreground">
                          <Eye className="size-3.5" />
                        </a>
                        <a href={`http://localhost:5001${r.fileUrl}`} download aria-label="Download" className="hover:text-foreground">
                          <Download className="size-3.5" />
                        </a>
                      </>
                    ) : (
                      <>
                        <button type="button" aria-label="View" className="hover:text-foreground opacity-50 cursor-not-allowed">
                          <Eye className="size-3.5" />
                        </button>
                        <button type="button" aria-label="Download" className="hover:text-foreground opacity-50 cursor-not-allowed">
                          <Download className="size-3.5" />
                        </button>
                      </>
                    )}
                    <button type="button" aria-label="Share" className="hover:text-foreground">
                      <Share2 className="size-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hairline-t p-5 sm:p-8">
        <div className="hairline flex flex-wrap items-center gap-4 p-5">
          <UploadCloud className="text-accent size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Bring your own documents</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Outside reports, old prescriptions or insurance papers — add them so your team sees
              them before the visit. PDF or photo, up to 25 MB.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Report name (optional)" 
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              disabled={isUploading}
              className="hairline mono-label placeholder:text-muted-foreground bg-transparent px-3 py-2 outline-none w-48 text-xs"
            />
            <label className={`relative overflow-hidden cursor-pointer flex items-center justify-center px-4 py-2 bg-foreground text-background font-bold text-xs uppercase tracking-wider rounded-lg transition-all ${isUploading ? "opacity-70 cursor-wait" : "hover:bg-foreground/90"}`}>
              {isUploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.dcm"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
