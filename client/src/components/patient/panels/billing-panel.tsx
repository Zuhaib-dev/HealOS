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
import {
  patient,
  upcoming,
  history,
  departments,
  slotTimes,
  bookedTimes,
  reports,
  meds,
  bills,
  vitals,
  messages,
  careTeam,
  type Appointment,
} from "./patient-data";
import { fetchPatientDashboardApi, PatientDashboardData, payInvoiceApi } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";

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

function stateTone(s: Appointment["state"]) {
  if (s === "confirmed" || s === "completed") return "ok";
  if (s === "pending") return "warn";
  return "bad";
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

function AppointmentRow({ a, actions }: { a: Appointment; actions?: React.ReactNode }) {
  return (
    <div className="bg-background flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
      <div className="w-28 shrink-0">
        <p className="mono-label text-brass">{a.date}</p>
        <p className="mono-label text-muted-foreground">{a.time}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{a.reason}</p>
        <p className="mono-label text-muted-foreground mt-1">
          {a.dept} · {a.clinician}
        </p>
      </div>
      <span className="mono-label text-muted-foreground hidden items-center gap-1.5 sm:flex">
        {a.mode === "Video" ? <Video className="size-3" /> : <MapPin className="size-3" />}
        {a.room}
      </span>
      <Pill tone={stateTone(a.state)}>{a.state}</Pill>
      {actions}
    </div>
  );
}

/* ---------- 06 billing ---------- */

export function BillingPanel() {
  const [data, setData] = useState<PatientDashboardData | null>(null);

  const loadData = async () => {
    try {
      const res = await fetchPatientDashboardApi();
      if (res.status === "success") setData(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePay = async (id: string) => {
    try {
      const res = await payInvoiceApi(id);
      if (res.success) {
        toast.success("Payment successful!");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process payment");
    }
  };

  const invoiceRows = data?.invoices || [];
  const outstandingAmount = invoiceRows
    .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <section>
      <PanelHeader
        index="06 / billing"
        title="Bills &amp; insurance"
        note="Every invoice with what your insurer covered and what is left for you to pay."
        actions={<ActionButton tone="solid">Pay outstanding ₹{outstandingAmount}</ActionButton>}
      />

      <div className="grid gap-px sm:grid-cols-3" style={{ background: "var(--hairline)" }}>
        {[
          { label: "Outstanding", value: `₹${outstandingAmount}`, note: `${invoiceRows.filter(i => i.status !== "PAID" && i.status !== "CANCELLED").length} invoice(s) due` },
          { label: "With insurer", value: "₹0", note: "claim in review" },
          { label: "Paid this year", value: `₹${invoiceRows.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.totalAmount, 0)}`, note: `${invoiceRows.filter(i => i.status === "PAID").length} invoice(s)` },
        ].map((s) => (
          <div key={s.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
            <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="hairline-t overflow-x-auto">
        <table className="w-full min-w-205">
          <thead className="hairline-b">
            <tr>
              <Th>Invoice</Th>
              <Th>Date</Th>
              <Th>Item</Th>
              <Th>Total</Th>
              <Th>State</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invoiceRows.map((b) => (
              <tr key={b._id} className="hairline-b hover:bg-foreground/2">
                <Td>
                  <span className="mono-label">{b._id.slice(-6).toUpperCase()}</span>
                </Td>
                <Td>
                  <span className="mono-label">{new Date(b.createdAt).toLocaleDateString()}</span>
                </Td>
                <Td>{b.items[0]?.description || "Service"}</Td>
                <Td>
                  <span className="mono-label">₹{b.totalAmount}</span>
                </Td>
                <Td>
                  <Pill tone={b.status === "PAID" ? "ok" : b.status === "PENDING" ? "bad" : "warn"}>
                    {b.status}
                  </Pill>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <ActionButton>Receipt</ActionButton>
                    {b.status !== "PAID" && b.status !== "CANCELLED" && (
                      <ActionButton tone="solid" onClick={() => handlePay(b._id)}>
                        Pay Now
                      </ActionButton>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
