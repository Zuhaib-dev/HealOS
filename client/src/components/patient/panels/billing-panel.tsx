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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { fetchPatientDashboardApi, PatientDashboardData } from "@/lib/api/patient";
import { getSocket } from "@/lib/socket";
import { usePatientDashboard } from "@/hooks/use-patient-dashboard";
import { PaymentCelebration } from "../payment-celebration";
import {
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
} from "@/lib/api/payment";

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
  return (
    <span className={`mono-label px-2 py-1 ${map[tone]}`}>{children}</span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="mono-label text-muted-foreground px-4 py-3 text-left font-normal">
      {children}
    </th>
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

function invoicePaidAmount(invoice: PatientDashboardData["invoices"][number]) {
  const recorded = Math.max(
    invoice.paidAmount || 0,
    invoice.appointment?.paidAmount || 0,
  );
  if (invoice.status === "PAID")
    return Math.max(
      recorded,
      invoice.totalAmount - (invoice.insuranceCoverage || 0),
    );
  return Math.max(0, recorded);
}

function invoiceBalanceDue(invoice: PatientDashboardData["invoices"][number]) {
  if (invoice.status === "CANCELLED") return 0;
  return Math.max(
    0,
    invoice.totalAmount -
      (invoice.insuranceCoverage || 0) -
      invoicePaidAmount(invoice),
  );
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
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="h-10 w-full"
    >
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
  const [paymentCelebration, setPaymentCelebration] = useState(false);

  const handleOnlinePay = async (id: string) => {
    try {
      setProcessing(id);
      const checkoutReady = await loadRazorpayScript();
      if (!checkoutReady) throw new Error("Payment checkout could not load");
      // 1. Create Order
      const orderRes = await createRazorpayOrderApi({
        invoiceId: id,
      });
      if (!orderRes.success) throw new Error("Failed to create Razorpay order");
      if (orderRes.paymentApplied) {
        await refetch();
        if (!orderRes.order) {
          setPaymentCelebration(true);
          toast.success(
            orderRes.message || "Your previous payment has been confirmed.",
          );
          setProcessing(null);
          return;
        }
        toast.info(
          orderRes.message || "Previous payment recorded. Pay the remaining balance.",
        );
      }
      if (!orderRes.order || !orderRes.keyId) {
        throw new Error(orderRes.message || "No online payment order was created.");
      }

      // 2. Open Razorpay
      const options = {
        key: orderRes.keyId,
        amount: orderRes.order.amount,
        currency: "INR",
        name: "HealOS",
        description: "Invoice Payment",
        order_id: orderRes.order.id,
        modal: {
          ondismiss: () => setProcessing(null),
        },
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            await verifyRazorpayPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: id,
            });
            setPaymentCelebration(true);
            toast.success("Payment successful!");
            refetch();
          } catch (err: any) {
            toast.error(
              err.response?.data?.message || "Payment verification failed",
            );
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
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate payment",
      );
      setProcessing(null);
    }
  };

  const invoiceRows = data?.invoices || [];
  const dueInvoices = invoiceRows.filter(
    (invoice) =>
      invoice.status !== "CANCELLED" && invoiceBalanceDue(invoice) > 0,
  );
  const outstandingAmount = dueInvoices.reduce(
    (sum, invoice) => sum + invoiceBalanceDue(invoice),
    0,
  );
  const currentYear = new Date().getFullYear();
  const paidThisYear = invoiceRows.reduce((sum, invoice) => {
    if (invoice.paymentHistory?.length) {
      return (
        sum +
        invoice.paymentHistory
          .filter(
            (payment) =>
              payment.method !== "INSURANCE" &&
              new Date(payment.paidAt).getFullYear() === currentYear,
          )
          .reduce((paid, payment) => paid + payment.amount, 0)
      );
    }
    const paidDate = invoice.paidAt;
    return paidDate && new Date(paidDate).getFullYear() === currentYear
      ? sum + invoicePaidAmount(invoice)
      : sum;
  }, 0);
  const insuredAmount = invoiceRows.reduce(
    (sum, invoice) => sum + (invoice.insuranceCoverage || 0),
    0,
  );

  return (
    <section>
      <PanelHeader
        index="06 / billing"
        title="Bills &amp; insurance"
        note="Every invoice with what your insurer covered and what is left for you to pay."
        actions={
          <ActionButton
            tone="solid"
            disabled={outstandingAmount === 0}
            onClick={() =>
              document
                .getElementById("patient-invoice-list")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {outstandingAmount > 0
              ? `Review balance · ₹${outstandingAmount}`
              : "All bills settled"}
          </ActionButton>
        }
      />

      <div
        className="grid gap-px sm:grid-cols-3"
        style={{ background: "var(--hairline)" }}
      >
        {[
          {
            label: "Outstanding",
            value: `₹${outstandingAmount}`,
            note: `${dueInvoices.length} invoice(s) with a balance`,
          },
          {
            label: "With insurer",
            value: `₹${insuredAmount}`,
            note: "Insurance coverage recorded",
          },
          {
            label: "Paid this year",
            value: `₹${paidThisYear}`,
            note: "Payments recorded this year",
          },
        ].map((s) => (
          <div key={s.label} className="bg-background p-5">
            <p className="mono-label text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-tight">
              {s.value}
            </p>
            <p className="mono-label text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      <div id="patient-invoice-list" className="hairline-t scroll-mt-6">
        <div className="space-y-3 p-4 lg:hidden">
          {invoiceRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              No invoices yet.
            </p>
          ) : (
            invoiceRows.map((invoice) => (
              <article
                key={invoice._id}
                className="min-w-0 rounded-xl border border-border/60 bg-card p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mono-label truncate font-semibold">
                      INV-{invoice._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Pill
                    tone={
                      invoice.status === "CANCELLED"
                        ? "mute"
                        : invoiceBalanceDue(invoice) === 0
                          ? "ok"
                          : "warn"
                    }
                  >
                    {invoice.status === "CANCELLED"
                      ? "CANCELLED"
                      : invoiceBalanceDue(invoice) === 0
                        ? "PAID"
                        : invoicePaidAmount(invoice) > 0
                          ? "PARTIAL"
                          : invoice.status}
                  </Pill>
                </div>
                <p className="mt-4 text-sm font-medium">
                  {invoice.items[0]?.description || "Service"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="mt-1 font-mono font-semibold">
                      ₹{invoice.totalAmount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="mt-1 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      ₹{invoicePaidAmount(invoice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due</p>
                    <p className="mt-1 font-mono font-semibold">
                      ₹{invoiceBalanceDue(invoice)}
                    </p>
                  </div>
                </div>
                <details className="mt-3 rounded-lg border border-border/50 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Receipt details
                  </summary>
                  <div className="mt-3 space-y-2 text-xs">
                    {invoice.items.map((item, index) => (
                      <div
                        key={`${item.description}-${index}`}
                        className="flex justify-between gap-3"
                      >
                        <span>{item.description}</span>
                        <span className="shrink-0">₹{item.amount}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border/50 pt-2">
                      <span>Invoice total</span>
                      <span>₹{invoice.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Paid so far</span>
                      <span>₹{invoicePaidAmount(invoice)}</span>
                    </div>
                    {invoice.paymentHistory?.length ? (
                      <div className="border-t border-border/50 pt-2">
                        <p className="mb-2 text-muted-foreground">
                          Payment activity
                        </p>
                        {invoice.paymentHistory.map((payment, index) => (
                          <div
                            key={`${payment.paidAt}-${index}`}
                            className="flex justify-between gap-3 py-1"
                          >
                            <span>
                              {payment.method} · {payment.source === "RAZORPAY" ? "Online" : "Counter"}
                            </span>
                            <span className="shrink-0">
                              ₹{payment.amount} · {new Date(payment.paidAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(invoice.insuranceCoverage || 0) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Insurance coverage</span>
                        <span>₹{invoice.insuranceCoverage}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border/50 pt-2 font-semibold">
                      <span>Balance due</span>
                      <span>₹{invoiceBalanceDue(invoice)}</span>
                    </div>
                  </div>
                </details>
                {invoice.status !== "CANCELLED" &&
                  invoiceBalanceDue(invoice) > 0 && (
                    <ActionButton
                      tone="solid"
                      className="mt-3 w-full justify-center"
                      onClick={() => handleOnlinePay(invoice._id)}
                      disabled={processing === invoice._id}
                    >
                      {processing === invoice._id
                        ? "Processing…"
                        : `Pay balance · ₹${invoiceBalanceDue(invoice)}`}
                    </ActionButton>
                  )}
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px]">
            <thead className="hairline-b">
              <tr>
                <Th>Invoice</Th>
                <Th>Date</Th>
                <Th>Item</Th>
                <Th>Total</Th>
                <Th>Paid</Th>
                <Th>Balance</Th>
                <Th>State</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((b) => (
                <tr key={b._id} className="hairline-b hover:bg-foreground/2">
                  <Td>
                    <span className="mono-label">
                      {b._id.slice(-6).toUpperCase()}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </Td>
                  <Td>{b.items[0]?.description || "Service"}</Td>
                  <Td>
                    <span className="mono-label">₹{b.totalAmount}</span>
                  </Td>
                  <Td>
                    <span className="mono-label text-emerald-700 dark:text-emerald-400">
                      ₹{invoicePaidAmount(b)}
                    </span>
                  </Td>
                  <Td>
                    <span className="mono-label font-semibold">
                      ₹{invoiceBalanceDue(b)}
                    </span>
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        invoiceBalanceDue(b) === 0
                          ? "ok"
                          : invoicePaidAmount(b) > 0
                            ? "warn"
                            : "warn"
                      }
                    >
                      {b.status === "CANCELLED"
                        ? "CANCELLED"
                        : invoiceBalanceDue(b) === 0
                          ? "PAID"
                          : invoicePaidAmount(b) > 0
                            ? "PARTIAL"
                            : b.status}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <ActionButton>Receipt</ActionButton>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0">
                          <DialogHeader className="sr-only">
                            <DialogTitle>
                              Patient Receipt INV-
                              {b._id.slice(-8).toUpperCase()}
                            </DialogTitle>
                            <DialogDescription>
                              Hospital billing invoice receipt
                            </DialogDescription>
                          </DialogHeader>
                          <div
                            className="relative bg-card text-card-foreground p-6 pt-10 font-mono shadow-2xl rounded-sm overflow-hidden"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at top, transparent 4px, var(--card) 5px)",
                              backgroundSize: "12px 10px",
                              backgroundPosition: "top center",
                              backgroundRepeat: "repeat-x",
                            }}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 h-3 w-full"
                              style={{
                                backgroundImage:
                                  "radial-gradient(circle at bottom, transparent 4px, var(--card) 5px)",
                                backgroundSize: "12px 10px",
                                backgroundPosition: "bottom center",
                                backgroundRepeat: "repeat-x",
                              }}
                            />

                            <div className="text-center mb-6 space-y-1">
                              <h2 className="text-xl font-bold tracking-widest uppercase">
                                HealOS Hospital
                              </h2>
                              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                                Official Receipt
                              </p>
                              <div className="text-xs pt-2">
                                INV-{b._id.slice(-8).toUpperCase()}
                              </div>
                            </div>

                            <div className="space-y-4 text-sm relative z-10 mb-4">
                              <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                                <span className="text-muted-foreground uppercase text-xs">
                                  Date
                                </span>
                                <span>
                                  {new Date(b.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>

                              <div className="flex justify-between items-start border-b border-dashed border-border/60 pb-3">
                                <span className="text-muted-foreground uppercase text-xs">
                                  Patient
                                </span>
                                <div className="text-right">
                                  <span className="font-bold">
                                    {user?.name || "Patient"}
                                  </span>
                                  {user?.phone && (
                                    <span className="block mt-0.5">
                                      {user.phone}
                                    </span>
                                  )}
                                  {user?.email && (
                                    <span className="block text-xs mt-0.5">
                                      {user.email}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                                <span className="text-muted-foreground uppercase text-xs">
                                  Status
                                </span>
                                <span className="font-bold uppercase tracking-wider">
                                  {b.status || "PENDING"}
                                </span>
                              </div>

                              <div className="flex justify-between items-center border-b border-dashed border-border/60 pb-3">
                                <span className="text-muted-foreground uppercase text-xs">
                                  Method
                                </span>
                                <span className="uppercase">
                                  {(b as any).paymentMethod ||
                                    (b as any).type ||
                                    "Online"}
                                </span>
                              </div>

                              {b.items && b.items.length > 0 && (
                                <div className="py-2">
                                  <span className="text-muted-foreground uppercase text-xs mb-3 block">
                                    Items
                                  </span>
                                  <div className="space-y-2">
                                    {b.items.map((item: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-start gap-4"
                                      >
                                        <span className="leading-tight">
                                          {item.description}
                                        </span>
                                        <span>
                                          ₹{item.amount.toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="border-t-2 border-dashed border-border pt-4 mt-2 pb-6 relative z-10">
                              <div className="flex justify-between items-center">
                                <span className="uppercase font-bold tracking-widest text-sm">
                                  Invoice total
                                </span>
                                <span className="text-lg font-bold tracking-tight">
                                  ₹{(b.totalAmount || 0).toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                                <span>Paid so far</span>
                                <span>
                                  ₹{invoicePaidAmount(b).toLocaleString()}
                                </span>
                              </div>
                              {b.paymentHistory?.length ? (
                                <div className="mt-3 space-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                                  <p className="font-semibold text-foreground">
                                    Payment activity
                                  </p>
                                  {b.paymentHistory.map((payment, index) => (
                                    <div
                                      key={`${payment.paidAt}-${index}`}
                                      className="flex justify-between gap-3"
                                    >
                                      <span>
                                        {payment.method} · {payment.source === "RAZORPAY" ? "Online" : "Counter"}
                                      </span>
                                      <span className="shrink-0">
                                        ₹{payment.amount.toLocaleString()} · {new Date(payment.paidAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {(b.insuranceCoverage || 0) > 0 && (
                                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                                  <span>Insurance coverage</span>
                                  <span>
                                    ₹
                                    {(
                                      b.insuranceCoverage || 0
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="mt-2 flex justify-between border-t border-border/50 pt-2 font-bold">
                                <span>Balance due</span>
                                <span>
                                  ₹{invoiceBalanceDue(b).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="relative z-10 pb-3 pt-2 text-center text-xs text-muted-foreground">
                              <p>Keep this receipt for your records.</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {b.status !== "CANCELLED" && invoiceBalanceDue(b) > 0 && (
                        <>
                          <ActionButton
                            tone="solid"
                            onClick={() => handleOnlinePay(b._id)}
                            disabled={processing === b._id}
                          >
                            {processing === b._id
                              ? "Processing..."
                              : "Pay Online"}
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
      </div>
      <PaymentCelebration
        active={paymentCelebration}
        onComplete={() => setPaymentCelebration(false)}
      />
    </section>
  );
}
