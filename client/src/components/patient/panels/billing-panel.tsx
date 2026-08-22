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
import { createRazorpayOrderApi, verifyRazorpayPaymentApi } from "@/lib/api/payment";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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

function stateTone(s: string) {
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

/* ---------- 06 billing ---------- */

export function BillingPanel() {
  const { data, isLoading, refetch } = usePatientDashboard();

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const { user } = useAuthStore();
  const [processing, setProcessing] = useState<string | null>(null);

  const handleOnlinePay = async (id: string, amount: number) => {
    try {
      setProcessing(id);
      // 1. Create Order
      const orderRes = await createRazorpayOrderApi({ amount, receipt: id });
      if (!orderRes.success) throw new Error("Failed to create Razorpay order");

      // 2. Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_V0P16tZ8KXX30y",
        amount: orderRes.order.amount,
        currency: "INR",
        name: "HealOS",
        description: "Invoice Payment",
        order_id: orderRes.order.id,
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            await verifyRazorpayPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: id,
            });
            toast.success("Payment successful!");
            refetch();
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Payment verification failed");
          } finally {
            setProcessing(null);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#10b981",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        toast.error("Payment failed. Please try again.");
        setProcessing(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment");
      setProcessing(null);
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
                      <>
                        <ActionButton 
                          tone="solid" 
                          onClick={() => handleOnlinePay(b._id, b.totalAmount)}
                          disabled={processing === b._id}
                        >
                          {processing === b._id ? "Processing..." : "Pay Online"}
                        </ActionButton>
                      </>
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
