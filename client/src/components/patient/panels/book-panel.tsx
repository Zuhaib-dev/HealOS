import { useEffect, useState } from "react";
import { motion } from "motion/react";
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
import { toast } from "sonner";
import { departments, slotTimes } from "../patient-data";

export function BookPanel() {
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
          setSelectedDoctorId(res.doctors[0]!._id);
        }
      } catch (err) {
        console.error("Failed to load available doctors", err);
      }
    };
    loadDoctors();
  }, []);

  const handleBook = async () => {
    if (!date || !time || !selectedDoctorId || !reason) {
      toast.error("Please fill all required fields (Date, Time, Doctor, Reason).");
      return;
    }

    setSubmitting(true);
    try {
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to book appointment");
    } finally {
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Flow Details */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="size-4 text-primary" />
                    Specialty & Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Department
                    </label>
                    <div className="grid gap-2">
                      {departments.slice(0, 4).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDept(d)}
                          className={`text-sm px-3 py-2 text-left rounded-md border transition-all ${
                            dept.id === d.id
                              ? "border-primary bg-primary/10 text-foreground font-medium"
                              : "border-transparent hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Clinician
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full appearance-none bg-background border border-border/70 text-sm rounded-md pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-medium"
                      >
                        {doctorsList.map((c) => (
                          <option key={c._id} value={c._id}>
                            Dr. {c.name} ({c.specialization})
                          </option>
                        ))}
                      </select>
                      <User className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video className="size-4 text-primary" />
                    Visit Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Visit Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["IN_PERSON", "TELECONSULT"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`text-xs px-3 py-2.5 rounded-md border transition-all font-medium flex items-center justify-center gap-2 ${
                            mode === m
                              ? "bg-foreground text-background border-foreground"
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
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ONLINE", "CASH"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPaymentMethod(p)}
                          className={`text-xs px-3 py-2.5 rounded-md border transition-all font-medium flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === p
                              ? "bg-foreground text-background border-foreground"
                              : "bg-background text-foreground hover:bg-muted border-border/60"
                          }`}
                        >
                          <span>{p === "ONLINE" ? "Pay Online" : "Pay at Desk"}</span>
                          <span className={paymentMethod === p ? "text-background/70 font-mono" : "text-muted-foreground font-mono"}>
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
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="size-4 text-primary" />
                    Date & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Calendar Widget */}
                  <div className="flex flex-col items-center sm:items-start border-b md:border-b-0 md:border-r border-border/40 pb-6 md:pb-0 md:pr-6">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 block w-full text-center sm:text-left">
                      Select Date
                    </label>
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border shadow-sm mx-auto sm:mx-0 p-3 bg-card"
                    />
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Clock className="size-3.5" />
                      Select Time Slot
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
                      {slotTimes.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className={`font-mono text-xs px-3 py-2.5 rounded-md border transition-all ${
                            time === t
                              ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-background"
                              : "bg-background text-foreground hover:bg-muted border-border/70 hover:border-primary/40"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Visit Details
                  </CardTitle>
                  <CardDescription>
                    Provide context for your doctor before the consultation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Briefly describe your symptoms (e.g., chest pain, fever, continuous headache for 2 days)..."
                    className="w-full resize-none bg-background border border-border/70 p-4 text-sm outline-none rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />

                  {/* Summary Footer */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/40 p-4 rounded-lg border border-border/50">
                    <div className="flex-1 min-w-0 w-full">
                      <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
                        Booking Summary
                      </p>
                      <p className="text-sm font-medium truncate text-foreground">
                        {date ? format(date, "MMM do, yyyy") : "No Date"} {time ? `at ${time}` : ""} 
                        <span className="text-muted-foreground mx-2">•</span> 
                        {selectedDoctorObj ? `Dr. ${selectedDoctorObj.name}` : "No Doctor"}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      disabled={!time || !date || !selectedDoctorId || !reason || submitting}
                      onClick={handleBook}
                      className={`shrink-0 w-full sm:w-auto px-6 py-3 rounded-md font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                        time && date && reason && !submitting
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0"
                          : "bg-muted text-muted-foreground cursor-not-allowed border border-border/60"
                      }`}
                    >
                      {submitting ? "Processing..." : "Confirm Booking"}
                      {!submitting && <Check className="size-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
