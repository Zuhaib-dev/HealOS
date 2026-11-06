"use client";

/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V4
 * genre: modern-minimal · macrostructure: Split Studio
 * theme: Emerald Prestige · enrichment: none · nav: PatientShell · footer: none
 * audience: patients · use: reserve a visit by paying the advance
 * designed-as-app: HealOS Clinical Instrument
 */

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Video,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Search,
} from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { formatTime12Hour, formatTimeRange } from "@/lib/time-format";
import { PatientHeader } from "@/components/patient/patient-header";
import {
  fetchAvailableDoctorsApi,
  bookAppointmentApi,
  cancelAppointmentApi,
  DoctorListItem,
  AppointmentRecord,
  fetchDoctorAvailabilityApi,
} from "@/lib/api/appointment";
import {
  createRazorpayOrderApi,
  verifyRazorpayPaymentApi,
} from "@/lib/api/payment";
import { toast } from "sonner";
import { useAuthStore } from "@/store/use-auth-store";
import { getSocket } from "@/lib/socket";
import Image from "next/image";
import Link from "next/link";
import { PaymentCelebration } from "../payment-celebration";

const allDepartments = { id: "all", label: "All" };

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

function doctorLabel(name: string) {
  return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
}

export function BookPanel() {
  const { user } = useAuthStore();
  const [dept, setDept] = useState(allDepartments);
  const [query, setQuery] = useState("");
  const [doctorsList, setDoctorsList] = useState<DoctorListItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekAvailability, setWeekAvailability] = useState<
    Record<string, boolean>
  >({});
  const dateOptions = Array.from({ length: 7 }, (_, index) =>
    addDays(new Date(), weekOffset * 7 + index),
  );
  const [availability, setAvailability] = useState<{
    available: boolean;
    slotsRemaining: number;
    consultationFee?: number;
    advanceFee?: number;
    slotDurationMinutes?: number;
  } | null>(null);
  const [mode, setMode] = useState<"IN_PERSON" | "TELECONSULT">("IN_PERSON");
  const [paymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentCelebration, setPaymentCelebration] = useState(false);
  const [bookedRecord, setBookedRecord] = useState<AppointmentRecord | null>(
    null,
  );

  useEffect(() => {
    if (!date || !selectedDoctorId) {
      setAvailability(null);
      return;
    }
    setAvailability(null);
    fetchDoctorAvailabilityApi(selectedDoctorId, format(date, "yyyy-MM-dd"))
      .then(setAvailability)
      .catch(() => setAvailability({ available: false, slotsRemaining: 0 }));
  }, [date, selectedDoctorId]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    let cancelled = false;
    const dates = Array.from({ length: 7 }, (_, index) =>
      addDays(new Date(), weekOffset * 7 + index),
    );
    Promise.all(
      dates.map(async (day) => {
        const key = format(day, "yyyy-MM-dd");
        try {
          const result = await fetchDoctorAvailabilityApi(
            selectedDoctorId,
            key,
          );
          return [key, result.available] as const;
        } catch {
          return [key, false] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setWeekAvailability(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDoctorId, weekOffset]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = (event: { doctorId?: string }) => {
      if (
        date &&
        selectedDoctorId &&
        (!event?.doctorId || event.doctorId === selectedDoctorId)
      ) {
        fetchDoctorAvailabilityApi(selectedDoctorId, format(date, "yyyy-MM-dd"))
          .then(setAvailability)
          .catch(() => {});
        const visibleDates = Array.from({ length: 7 }, (_, index) =>
          addDays(new Date(), weekOffset * 7 + index),
        );
        Promise.all(
          visibleDates.map(async (day) => {
            const key = format(day, "yyyy-MM-dd");
            try {
              const result = await fetchDoctorAvailabilityApi(
                selectedDoctorId,
                key,
              );
              return [key, result.available] as const;
            } catch {
              return [key, false] as const;
            }
          }),
        ).then((entries) => setWeekAvailability(Object.fromEntries(entries)));
      }
    };
    socket.on("appointment_created", refresh);
    socket.on("appointment_updated", refresh);
    socket.on("appointment_slot_reserved", refresh);
    socket.on("appointment_slot_released", refresh);
    socket.on("doctor_availability_updated", refresh);
    return () => {
      socket.off("appointment_created", refresh);
      socket.off("appointment_updated", refresh);
      socket.off("appointment_slot_reserved", refresh);
      socket.off("appointment_slot_released", refresh);
      socket.off("doctor_availability_updated", refresh);
    };
  }, [date, selectedDoctorId, weekOffset]);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetchAvailableDoctorsApi();
        if (res.success && res.doctors.length > 0) {
          setDoctorsList(res.doctors);
        }
      } catch (err) {
        console.error("Failed to load available doctors", err);
      } finally {
        setDoctorsLoading(false);
      }
    };
    loadDoctors();
    loadRazorpayScript();
  }, []);

  const departments = useMemo(
    () => [
      allDepartments,
      ...Array.from(
        new Set(
          doctorsList
            .filter((doctor) => doctor.role === "DOCTOR")
            .map((doctor) => doctor.specialization.trim())
            .filter(Boolean),
        ),
      ).map((label) => ({
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label,
      })),
    ],
    [doctorsList],
  );

  const filteredDoctors = doctorsList.filter((doctor) => {
    if (doctor.role !== "DOCTOR") return false;
    if (
      dept.id !== "all" &&
      doctor.specialization.trim().toLowerCase() !==
        dept.label.trim().toLowerCase()
    )
      return false;
    if (!query.trim()) return true;
    const hay = `${doctor.name} ${doctor.specialization}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (
      selectedDoctorId &&
      !doctorsList.some(
        (d) =>
          d._id === selectedDoctorId &&
          (dept.id === "all" ||
            d.specialization.trim().toLowerCase() ===
              dept.label.trim().toLowerCase()),
      )
    ) {
      setSelectedDoctorId("");
      setAvailability(null);
    }
  }, [dept, doctorsList, selectedDoctorId]);

  const handleBook = async () => {
    if (
      !date ||
      !availability?.available ||
      !selectedDoctorId ||
      reason.trim().length < 3
    ) {
      toast.error(
        "Choose an available date and doctor, and enter a visit reason with at least 3 characters.",
      );
      return;
    }

    setSubmitting(true);
    try {
      if (paymentMethod === "ONLINE") {
        const razorpayReady = await loadRazorpayScript();
        if (!razorpayReady) throw new Error("Payment checkout could not load.");

        const reservation = await bookAppointmentApi({
          doctorId: selectedDoctorId,
          date: format(date, "yyyy-MM-dd"),
          reason: reason.trim(),
          type: mode,
          paymentMethod,
        });
        if (!reservation.success || !reservation.appointment)
          throw new Error("Could not reserve an appointment slot.");

        let orderRes;
        try {
          orderRes = await createRazorpayOrderApi({
            appointmentId: reservation.appointment._id,
          });
          if (!orderRes.success || !orderRes.order || !orderRes.keyId) {
            throw new Error(orderRes.message || "Failed to create order");
          }
        } catch (error) {
          await cancelAppointmentApi(reservation.appointment._id).catch(
            () => {},
          );
          throw error;
        }

        let paymentCaptured = false;
        const advancePaidAmount = orderRes.order.amount / 100;
        const options = {
          key: orderRes.keyId,
          amount: orderRes.order.amount,
          currency: "INR",
          name: "HealOS",
          description: `Appointment advance (total ₹${availability.consultationFee})`,
          order_id: orderRes.order.id,
          handler: async function (response: any) {
            paymentCaptured = true;
            try {
              await verifyRazorpayPaymentApi({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                appointmentId: reservation.appointment._id,
              });

              setPaymentCelebration(true);
              toast.success("Advance paid — your appointment is confirmed!");
              setBookedRecord({
                ...reservation.appointment,
                status: "CONFIRMED",
                paymentStatus:
                  advancePaidAmount >=
                  (availability.consultationFee ||
                    reservation.appointment.amount)
                    ? "PAID"
                    : "PENDING_CASH",
                paidAmount: advancePaidAmount,
              });
            } catch (err: any) {
              toast.error(
                err.response?.data?.message ||
                  "Booking failed after payment. Contact support.",
              );
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: async () => {
              if (!paymentCaptured)
                await cancelAppointmentApi(reservation.appointment._id).catch(
                  () => {},
                );
              setSubmitting(false);
            },
          },
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          theme: {
            color: "#10b981",
          },
        };
        try {
          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", function () {
            toast.error("Payment failed. Please try again.");
            void cancelAppointmentApi(reservation.appointment._id).catch(
              () => {},
            );
            setSubmitting(false);
          });
          rzp.open();
        } catch (error) {
          await cancelAppointmentApi(reservation.appointment._id).catch(
            () => {},
          );
          throw error;
        }
      } else {
        const res = await bookAppointmentApi({
          doctorId: selectedDoctorId,
          date: format(date, "yyyy-MM-dd"),
          reason: reason.trim(),
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
  const reasonOk = reason.trim().length >= 3;
  const canBook = Boolean(
    availability?.available &&
    date &&
    selectedDoctorId &&
    reasonOk &&
    !submitting,
  );
  const advance = availability?.advanceFee;
  const total = availability?.consultationFee;
  const balance =
    typeof advance === "number" && typeof total === "number"
      ? Math.max(0, total - advance)
      : null;

  const blockReason = !selectedDoctorId
    ? "Select a clinician first"
    : !date
      ? "Select a day"
      : availability && !availability.available
        ? "That day is full. Pick another."
        : !reasonOk
          ? "Add a visit reason (at least 3 characters)"
          : submitting
            ? "Opening payment…"
            : null;

  const pickDoctor = (id: string) => {
    setSelectedDoctorId(id);
    requestAnimationFrame(() => {
      document
        .getElementById("book-ticket")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const payButton = (
    <button
      type="button"
      disabled={!canBook}
      onClick={handleBook}
      className={`flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
        canBook
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "cursor-not-allowed border border-border/60 bg-muted text-muted-foreground"
      }`}
    >
      {submitting
        ? "Opening payment…"
        : advance != null
          ? `Pay ₹${advance} advance`
          : "Pay advance"}
      {!submitting ? <ChevronRight className="size-4" /> : null}
    </button>
  );

  return (
    <section className="pb-28 lg:pb-0">
      <PatientHeader
        title="Book a visit"
        note="Pick a clinician. Their open days appear beside them. Time is assigned after the advance."
      />

      {bookedRecord ? (
        <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
          <div className="flex flex-col justify-center border-b border-border/60 px-5 py-10 sm:px-10 lg:border-r lg:border-b-0">
            <p className="mono-label text-accent">Confirmed</p>
            <h2 className="mt-3 max-w-md font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {doctorLabel(bookedRecord.doctor.name)}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {format(
                new Date(`${bookedRecord.date}T12:00:00`),
                "EEEE, d MMMM yyyy",
              )}
              . Arrive by{" "}
              {formatTime12Hour(
                bookedRecord.arrivalTime || bookedRecord.timeSlot,
              )}
              . Visit{" "}
              {formatTimeRange(bookedRecord.timeSlot, bookedRecord.slotEndTime)}
              .
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Advance ₹
              {bookedRecord.advanceAmount ?? availability?.advanceFee ?? "—"}
              {typeof bookedRecord.amount === "number"
                ? ` · ₹${Math.max(
                    0,
                    bookedRecord.amount -
                      (bookedRecord.advanceAmount ??
                        availability?.advanceFee ??
                        0),
                  )} due at the clinic`
                : ""}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/patient/appointments"
                prefetch
                className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Open visits <ChevronRight className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setBookedRecord(null);
                  setReason("");
                }}
                className="border border-border/60 px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                Book another visit
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start justify-center bg-muted/20 px-5 py-12 sm:px-10">
            <p className="mono-label text-muted-foreground">Queue number</p>
            <p className="mt-2 font-display text-7xl font-bold tracking-tight text-accent sm:text-8xl">
              {bookedRecord.queueNumber
                ? String(bookedRecord.queueNumber).padStart(2, "0")
                : "—"}
            </p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Show this at check-in. Keep the visits screen handy on the day.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2">
          <div className="flex min-w-0 flex-col border-b border-border/60 lg:border-r lg:border-b-0">
            <div className="border-b border-border/60 px-4 py-4 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <label htmlFor="book-clinician-search" className="sr-only">
                  Search clinicians
                </label>
                <input
                  id="book-clinician-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or specialty"
                  className="w-full border border-border/60 bg-transparent py-2.5 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {departments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDept(d)}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                      dept.id === d.id
                        ? "bg-foreground text-background"
                        : "border border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-80 min-h-0 flex-1 overflow-y-auto lg:max-h-none">
              {doctorsLoading ? (
                <div className="space-y-px p-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse bg-foreground/4"
                    />
                  ))}
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium">No clinicians match</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another specialty or clear the search.
                  </p>
                </div>
              ) : (
                <ul>
                  {filteredDoctors.map((doc) => {
                    const selected = selectedDoctorId === doc._id;
                    return (
                      <li key={doc._id} className="border-b border-border/40">
                        <button
                          type="button"
                          onClick={() => pickDoctor(doc._id)}
                          className={`flex w-full min-w-0 items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6 ${
                            selected ? "bg-primary/8" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="relative size-12 shrink-0 overflow-hidden bg-muted">
                            {doc.avatarUrl ? (
                              <Image
                                src={doc.avatarUrl}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="grid h-full w-full place-items-center font-mono text-sm font-bold">
                                {doc.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">
                              {doctorLabel(doc.name)}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {doc.specialization}
                              {doc.experienceYears
                                ? ` · ${doc.experienceYears} yrs`
                                : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-sm font-semibold">
                              ₹{doc.consultationFee ?? "—"}
                            </p>
                            {selected ? (
                              <Check className="ml-auto mt-1 size-3.5 text-primary" />
                            ) : (
                              <p className="mono-label mt-1 text-[10px] text-muted-foreground">
                                Fee
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div
            id="book-ticket"
            className="flex min-w-0 flex-col bg-muted/15 scroll-mt-20"
          >
            {!selectedDoctorObj ? (
              <div className="flex flex-1 flex-col justify-center px-6 py-16 sm:px-10">
                <p className="font-display text-2xl font-bold tracking-tight">
                  Choose who you will see
                </p>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Open days, remaining appointments, and the advance amount
                  appear here after you select a clinician.
                </p>
              </div>
            ) : (
              <>
                <div className="border-b border-border/60 px-5 py-5 sm:px-8">
                  <p className="mono-label text-muted-foreground">
                    {selectedDoctorObj.specialization}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    {doctorLabel(selectedDoctorObj.name)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Consultation ₹{selectedDoctorObj.consultationFee ?? "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2">
                  {(["IN_PERSON", "TELECONSULT"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex items-center justify-center gap-2 border-b border-border/60 px-3 py-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring ${
                        mode === m
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-background/80"
                      } ${m === "TELECONSULT" ? "border-l border-border/60" : ""}`}
                    >
                      {m === "IN_PERSON" ? (
                        <MapPin className="size-3.5" />
                      ) : (
                        <Video className="size-3.5" />
                      )}
                      {m === "IN_PERSON" ? "In person" : "Video"}
                    </button>
                  ))}
                </div>

                <div className="px-5 py-5 sm:px-8">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="mono-label text-muted-foreground">Day</p>
                      <p className="mt-1 text-sm font-medium">
                        {date ? format(date, "EEEE, d MMMM") : "Select a day"}
                      </p>
                    </div>
                    <div className="flex">
                      <button
                        type="button"
                        aria-label="Previous week"
                        disabled={weekOffset === 0}
                        onClick={() =>
                          setWeekOffset((value) => Math.max(0, value - 1))
                        }
                        className="p-2 text-muted-foreground hover:bg-background disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next week"
                        onClick={() => setWeekOffset((value) => value + 1)}
                        className="p-2 text-muted-foreground hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {dateOptions.map((day) => {
                      const selected = Boolean(date && isSameDay(day, date));
                      const key = format(day, "yyyy-MM-dd");
                      const dayOpen = weekAvailability[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={dayOpen === false}
                          onClick={() => setDate(day)}
                          className={`flex min-w-0 flex-col items-center gap-1 border px-1 py-2.5 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/50 bg-background hover:border-primary/40"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-semibold uppercase ${
                              selected
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            }`}
                          >
                            {format(day, "EEEEE")}
                          </span>
                          <span className="font-mono text-sm font-bold">
                            {format(day, "d")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {!availability
                      ? "Checking remaining appointments…"
                      : availability.available
                        ? `${availability.slotsRemaining} appointment${
                            availability.slotsRemaining === 1 ? "" : "s"
                          } left this day. Exact time is assigned after you pay.`
                        : "No remaining appointments this day."}
                  </p>

                  <label
                    htmlFor="appointment-visit-reason"
                    className="mt-6 block text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    Why are you coming in?
                  </label>
                  <textarea
                    id="appointment-visit-reason"
                    aria-label="Visit reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Symptoms, follow-up, or what you need seen"
                    className="mt-2 w-full resize-none border border-border/60 bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="mt-auto hidden border-t border-border/60 px-5 py-5 sm:px-8 lg:block">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="mono-label text-muted-foreground">
                        Pay now
                      </p>
                      <p className="mt-1 font-mono text-lg font-bold">
                        ₹{advance ?? "—"}
                        {balance !== null ? (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            · ₹{balance} at clinic
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  {payButton}
                  {blockReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {blockReason}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Online advance only. Remaining balance is collected at the
                      clinic.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!bookedRecord && selectedDoctorObj ? (
        <div className="fixed right-0 bottom-16 left-0 z-40 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {doctorLabel(selectedDoctorObj.name)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {date ? format(date, "EEE d MMM") : "Pick a day"} · ₹
                {advance ?? "—"}
              </p>
            </div>
            <button
              type="button"
              disabled={!canBook}
              onClick={handleBook}
              className={`shrink-0 px-4 py-2.5 text-xs font-bold focus-visible:ring-2 focus-visible:ring-ring ${
                canBook
                  ? "bg-primary text-primary-foreground"
                  : "cursor-not-allowed border border-border/60 text-muted-foreground"
              }`}
            >
              {submitting ? "…" : "Pay"}
            </button>
          </div>
        </div>
      ) : null}

      <PaymentCelebration
        active={paymentCelebration}
        onComplete={() => setPaymentCelebration(false)}
      />
    </section>
  );
}
