"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarClock,
  Clock,
  Check,
  X,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Building2,
  UserCheck,
} from "lucide-react";
import { PanelHeader } from "@/components/admin/admin-shell";
import { fetchBookingsApi, RadiologyBookingRecord } from "@/lib/api/radiology";
import { toast } from "sonner";

export function BookingPanel() {
  const [bookings, setBookings] = useState<RadiologyBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Quick Booking Modal State
  const [bookingSlot, setBookingSlot] = useState<RadiologyBookingRecord | null>(
    null,
  );
  const [modalPatient, setModalPatient] = useState("");
  const [modalStudy, setModalStudy] = useState("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchBookingsApi();
      if (res.status === "success") {
        setBookings(res.data.bookings || []);
      }
    } catch {
      toast.error("Failed to load imaging slot schedule");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rooms = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.room) set.add(b.room);
    });
    return Array.from(set);
  }, [bookings]);

  const openSlotCount = useMemo(
    () => bookings.filter((b) => b.state === "open").length,
    [bookings],
  );
  const bookedCount = useMemo(
    () => bookings.filter((b) => b.state === "booked").length,
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (roomFilter !== "ALL" && b.room !== roomFilter) return false;
      if (stateFilter !== "ALL" && b.state !== stateFilter) return false;

      if (!q) return true;
      const text =
        `${b.patientName || ""} ${b.study || ""} ${b.room || ""} ${b.time || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [bookings, roomFilter, stateFilter, search]);

  const handleOpenBooking = (slot: RadiologyBookingRecord) => {
    setBookingSlot(slot);
    setModalPatient(
      slot.patientName && slot.patientName !== "—" ? slot.patientName : "",
    );
    setModalStudy(
      slot.study && slot.study !== "Open Slot"
        ? slot.study
        : "CT Thorax / Abdomen",
    );
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot || !modalPatient.trim()) return;

    setBookings((prev) =>
      prev.map((b) =>
        b._id === bookingSlot._id ||
        (b.time === bookingSlot.time && b.room === bookingSlot.room)
          ? {
              ...b,
              state: "booked",
              patientName: modalPatient.trim(),
              study: modalStudy.trim(),
            }
          : b,
      ),
    );
    toast.success(
      `Slot booked for ${modalPatient} at ${bookingSlot.time} (${bookingSlot.room})`,
    );
    setBookingSlot(null);
  };

  return (
    <section className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PanelHeader
        index="07 / imaging schedule"
        title="Radiology Suite Slot Booking"
        note="Room-by-room slot ladder with real-time scanner capacity, maintenance windows, and patient procedure scheduling."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              aria-label="Refresh slots"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted/50 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* Metric Cards Bar */}
      <div className="p-4 sm:px-6 bg-card/40 border-b border-border/60">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                Available Open Slots
              </p>
              <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {openSlotCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <CalendarClock className="size-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">
                Scheduled Procedures
              </p>
              <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
                {bookedCount}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/70 bg-card flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground font-bold">
                Active Scanner Suites
              </p>
              <p className="font-mono text-2xl font-bold text-foreground mt-0.5">
                {rooms.length} Suites
              </p>
            </div>
            <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Rooms filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoomFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              roomFilter === "ALL"
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            All Suites ({bookings.length})
          </button>
          {rooms.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoomFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                roomFilter === r
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-background border border-border/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            id="slot-booking-search"
            aria-label="Search patient, study, or time"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, study, time..."
            className="w-full bg-background border border-border/80 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </div>

      {/* Slot Ladder List */}
      <div className="flex-1 p-4 sm:p-6 bg-muted/15 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="size-8 animate-spin text-primary mb-3" />
            <p className="font-mono text-sm">Loading appointment ladder...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-card rounded-2xl border border-border/70 p-8">
            <CalendarClock className="size-12 mb-3 opacity-30 text-primary" />
            <p className="font-bold text-foreground text-base">
              No Matching Slots
            </p>
          </div>
        ) : (
          filtered.map((s, i) => {
            const isOpen = s.state === "open";
            const isBooked = s.state === "booked";
            const isBlocked = s.state === "blocked";

            return (
              <div
                key={`${s.time}-${s.room}-${i}`}
                className="bg-card rounded-xl border border-border/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 shrink-0">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {s.time}
                    </span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      Today
                    </span>
                  </div>

                  <div className="h-8 w-px bg-border/60 hidden sm:block" />

                  <div className="w-28 shrink-0">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                      {s.room}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold text-xs sm:text-sm truncate ${
                        isOpen
                          ? "text-muted-foreground italic"
                          : "text-foreground"
                      }`}
                    >
                      {s.study || "Available Scanning Slot"}
                    </p>
                    {s.patientName && s.patientName !== "—" && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Patient:{" "}
                        <strong className="text-foreground">
                          {s.patientName}
                        </strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isOpen
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : isBooked
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {s.state}
                  </span>

                  {!isBlocked && (
                    <button
                      type="button"
                      onClick={() => handleOpenBooking(s)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                        isOpen
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {isOpen ? "Book Slot" : "Reschedule"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                <div>
                  <h3 className="font-mono text-base font-bold text-foreground">
                    Reserve Imaging Slot
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bookingSlot.time} · {bookingSlot.room}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingSlot(null)}
                  className="size-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Patient Full Name
                  </label>
                  <input
                    required
                    value={modalPatient}
                    onChange={(e) => setModalPatient(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Examination Study
                  </label>
                  <input
                    required
                    value={modalStudy}
                    onChange={(e) => setModalStudy(e.target.value)}
                    placeholder="e.g. CT Chest with Contrast"
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setBookingSlot(null)}
                    className="px-4 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90"
                  >
                    Confirm Appointment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
