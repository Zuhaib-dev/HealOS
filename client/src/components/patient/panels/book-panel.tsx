import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  CreditCard,
  Video,
  MapPin,
  FileText,
  ChevronRight,
  ChevronLeft,
  Star,
  Activity,
  BriefcaseMedical
} from "lucide-react";
import { format } from "date-fns";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAvailableDoctorsApi,
  bookAppointmentApi,
  DoctorListItem,
  AppointmentRecord,
} from "@/lib/api/appointment";
import { createRazorpayOrderApi, verifyRazorpayPaymentApi } from "@/lib/api/payment";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import Image from "next/image";

const departments = [
  { id: "med", label: "General Medicine" },
  { id: "cardio", label: "Cardiology" },
  { id: "neuro", label: "Neurology" },
  { id: "ortho", label: "Orthopedics" },
  { id: "paed", label: "Pediatrics" },
];

const slotTimes = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30"
];

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

export function BookPanel() {
  const { user } = useAuthStore();
  const [dept, setDept] = useState(departments[0]!);
  const [doctorsList, setDoctorsList] = useState<DoctorListItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string | null>(null);
  const [mode, setMode] = useState<"IN_PERSON" | "TELECONSULT">("IN_PERSON");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedRecord, setBookedRecord] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetchAvailableDoctorsApi();
        if (res.success && res.doctors.length > 0) {
          setDoctorsList(res.doctors);
        }
      } catch (err) {
        console.error("Failed to load available doctors", err);
      }
    };
    loadDoctors();
    loadRazorpayScript();
  }, []);

  const filteredDoctors = doctorsList.filter((d) => !dept || d.specialization === dept.label || dept.label === "General Medicine");

  // Auto-select first doctor when department changes
  useEffect(() => {
    if (filteredDoctors.length > 0 && !filteredDoctors.find(d => d._id === selectedDoctorId)) {
      setSelectedDoctorId(filteredDoctors[0]!._id);
    }
  }, [dept, filteredDoctors, selectedDoctorId]);


  const handleBook = async () => {
    if (!date || !time || !selectedDoctorId || !reason) {
      toast.error("Please fill all required fields (Date, Time, Doctor, Reason).");
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === "ONLINE") {
        // 1. Create Razorpay Order
        const orderRes = await createRazorpayOrderApi({ amount: 400 });
        if (!orderRes.success) throw new Error("Failed to create order");

        // 2. Open Razorpay Checkout
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_V0P16tZ8KXX30y",
          amount: orderRes.order.amount,
          currency: "INR",
          name: "HealOS",
          description: "Consultation Fee",
          order_id: orderRes.order.id,
          handler: async function (response: any) {
            try {
              // 3. Book Appointment after payment
              const res = await bookAppointmentApi({
                doctorId: selectedDoctorId,
                department: dept.label,
                date: format(date, "yyyy-MM-dd"),
                timeSlot: time,
                reason,
                type: mode,
                paymentMethod,
              });

              if (res.success && res.appointment) {
                // 4. Verify Payment
                await verifyRazorpayPaymentApi({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  appointmentId: res.appointment._id,
                });
                
                toast.success("Payment successful & Appointment booked!");
                setBookedRecord(res.appointment);
              }
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Booking failed after payment. Contact support.");
            } finally {
              setSubmitting(false);
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: "#10b981", // Emerald 500
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          toast.error("Payment failed. Please try again.");
          setSubmitting(false);
        });
        rzp.open();
      } else {
        // CASH Booking
        const res = await bookAppointmentApi({
          doctorId: selectedDoctorId,
          department: dept.label,
          date: format(date, "yyyy-MM-dd"),
          timeSlot: time,
          reason,
          type: mode,
          paymentMethod,
        });

        if (res.success && res.appointment) {
          toast.success("Appointment request submitted successfully!");
          setBookedRecord(res.appointment);
        }
        setSubmitting(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to process booking");
      setSubmitting(false);
    }
  };

  const selectedDoctorObj = doctorsList.find((d) => d._id === selectedDoctorId);

  return (
    <section className="pb-12">
      <PanelHeader
        index="02 / new visit"
        title="Book an appointment"
        note="Pick a department, clinician, and free slot. You'll receive a confirmation and preparation instructions."
      />

      {bookedRecord ? (
        <div className="p-4 sm:p-8">
          <Card className="max-w-xl border-emerald-500/20 bg-emerald-500/5 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-500 rounded-full p-2 mt-1">
                  <Check className="text-white size-5" />
                </div>
                <div>
                  <h3 className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    Appointment Confirmed
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Your appointment for <strong className="text-foreground">{bookedRecord.department}</strong> with{" "}
                    <strong className="text-foreground">Dr. {bookedRecord.doctor.name}</strong> has been scheduled for{" "}
                    <strong className="text-foreground">{bookedRecord.date}</strong> at{" "}
                    <strong className="text-foreground">{bookedRecord.timeSlot}</strong>.
                  </p>
                  <div className="mt-4 inline-flex gap-2 items-center text-xs font-mono bg-background/50 px-3 py-1.5 rounded border border-border/50">
                    <span className="text-amber-500 font-bold uppercase">{bookedRecord.status}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-muted-foreground">{bookedRecord.type}</span>
                  </div>
                  <div className="mt-6">
                    <ActionButton
                      tone="solid"
                      onClick={() => {
                        setBookedRecord(null);
                        setTime(null);
                        setReason("");
                      }}
                    >
                      Book another visit
                    </ActionButton>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
          {/* Top Section: Departments (Scrollable) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Select Department</h2>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory hide-scrollbar">
              {departments.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDept(d)}
                  className={`snap-start shrink-0 min-w-35 px-4 py-4 rounded-xl border transition-all text-left flex flex-col gap-2 ${
                    dept.id === d.id
                      ? "border-primary bg-primary text-primary-foreground shadow-md -translate-y-1"
                      : "border-border/60 bg-card hover:bg-muted hover:border-border"
                  }`}
                >
                  <BriefcaseMedical className={`size-5 ${dept.id === d.id ? "text-primary-foreground" : "text-primary"}`} />
                  <span className="font-semibold text-sm leading-tight">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clinicians Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Select Clinician</h2>
            </div>
            
            {filteredDoctors.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl border-border/60">
                <p className="text-muted-foreground text-sm">No clinicians available for {dept.label} right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDoctors.map((doc) => (
                  <button
                    key={doc._id}
                    type="button"
                    onClick={() => setSelectedDoctorId(doc._id)}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left group ${
                      selectedDoctorId === doc._id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                        : "border-border/60 bg-card hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="size-14 rounded-full bg-muted border border-border/50 shrink-0 overflow-hidden relative">
                      {doc.avatarUrl ? (
                        <Image src={doc.avatarUrl} alt={doc.name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-bold">
                          {doc.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className={`font-bold truncate text-sm ${selectedDoctorId === doc._id ? "text-primary" : "text-foreground"}`}>
                          Dr. {doc.name}
                        </h3>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="size-3 fill-amber-500" />
                          <span className="text-[10px] font-bold">4.9</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{doc.specialization}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {doc.degree ? "10+ Yrs" : "8 Yrs"}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="size-3" /> ₹400
                        </span>
                      </div>
                    </div>
                    <div className={`shrink-0 mt-3 size-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedDoctorId === doc._id ? "bg-primary border-primary text-primary-foreground" : "border-border/60 text-transparent"
                    }`}>
                      <Check className="size-3" strokeWidth={3} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
            {/* Left Column: Preferences */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video className="size-4 text-primary" />
                    Visit Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                      Visit Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["IN_PERSON", "TELECONSULT"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`text-xs px-3 py-3 rounded-lg border transition-all font-medium flex items-center justify-center gap-2 ${
                            mode === m
                              ? "bg-foreground text-background border-foreground shadow-sm"
                              : "bg-background text-foreground hover:bg-muted border-border/60"
                          }`}
                        >
                          {m === "IN_PERSON" ? <MapPin className="size-3.5" /> : <Video className="size-3.5" />}
                          {m === "IN_PERSON" ? "In Person" : "Video"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["ONLINE", "CASH"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPaymentMethod(p)}
                          className={`text-xs px-3 py-3 rounded-lg border transition-all font-medium flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === p
                              ? "bg-foreground text-background border-foreground shadow-sm"
                              : "bg-background text-foreground hover:bg-muted border-border/60"
                          }`}
                        >
                          <span>{p === "ONLINE" ? "Pay Online" : "Pay at Desk"}</span>
                          <span className={paymentMethod === p ? "text-background/70 font-mono text-[10px]" : "text-muted-foreground font-mono text-[10px]"}>
                            ₹400
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Date, Time, Reason */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="shadow-sm border-border/60 overflow-hidden">
                <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="size-4 text-primary" />
                    Schedule Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                    {/* Calendar Widget */}
                    <div className="p-6 flex flex-col items-center sm:items-start">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 block w-full text-center sm:text-left">
                        Select Date
                      </label>
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-xl border shadow-sm mx-auto sm:mx-0 p-3 bg-card"
                      />
                    </div>

                    {/* Time Slots & Reason */}
                    <div className="p-6 flex flex-col h-full">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Clock className="size-3.5" />
                        Select Time Slot
                      </label>
                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {slotTimes.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTime(t)}
                            className={`font-mono text-[11px] px-2 py-2.5 rounded-lg border transition-all ${
                              time === t
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-foreground hover:bg-muted border-border/70 hover:border-primary/40"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="size-3.5" />
                        Visit Reason
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Briefly describe symptoms..."
                        className="w-full resize-none bg-background border border-border/70 p-3 text-sm outline-none rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
                
                {/* Action Footer */}
                <div className="border-t border-border/40 bg-muted/30 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full flex items-center gap-4 bg-background p-3 rounded-lg border border-border/60">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <CalendarIcon className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                          Booking Summary
                        </p>
                        <p className="text-sm font-medium truncate text-foreground mt-0.5">
                          {date ? format(date, "MMM do") : "No Date"} {time ? `at ${time}` : ""} 
                          <span className="text-muted-foreground mx-1.5">•</span> 
                          {selectedDoctorObj ? `Dr. ${selectedDoctorObj.name}` : "No Doctor"}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      disabled={!time || !date || !selectedDoctorId || !reason || submitting}
                      onClick={handleBook}
                      className={`shrink-0 w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                        time && date && reason && selectedDoctorId && !submitting
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                          : "bg-muted text-muted-foreground cursor-not-allowed border border-border/60"
                      }`}
                    >
                      {submitting ? "Processing..." : paymentMethod === "ONLINE" ? "Pay & Book" : "Confirm Booking"}
                      {!submitting && <ChevronRight className="size-4" />}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
