"use client";

/* Hallmark · macrostructure: Form Split · genre: modern-minimal
 * states: hover, focus, error
 * contrast: pass
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, Check, AlertCircle, Loader2 } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card } from "@/components/workspace/ui";
import { registerPatientApi } from "@/lib/api/reception";
import { fetchAvailableDoctorsApi } from "@/lib/api/appointment";
import { toast } from "sonner";

/* ---------- primitives ---------- */

const FloatingInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  error,
  type = "text",
  id,
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  error?: string,
  type?: string,
  id?: string,
}) => {
  const inputId = id || `reg-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  return (
    <div className="relative group">
      <label htmlFor={inputId} className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block group-focus-within:text-primary transition-colors">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className={`w-full bg-background border ${error ? "border-rose-500/50" : "border-border/60"} rounded-xl px-4 py-3 text-sm text-foreground outline-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 transition-all duration-300 focus:border-primary/50 focus:ring-4 focus:ring-primary/10`}
        />
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500"
            >
              <AlertCircle className="size-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {error && (
          <motion.p 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-rose-500 text-[10px] mt-1.5 font-medium ml-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export function RegistrationPanel() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    department: "",
    payer: "self",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<any>(null);
  const [departments, setDepartments] = useState<string[]>([
    "General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"
  ]);

  useEffect(() => {
    fetchAvailableDoctorsApi().then(res => {
      if (res.success && res.doctors.length > 0) {
        const depts = Array.from(new Set(res.doctors.map(d => d.specialization)));
        setDepartments(depts.length > 0 ? depts : ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Neurology"]);
        setForm(f => ({ ...f, department: depts[0] || "General Medicine" }));
      }
    }).catch(console.error);
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\+?[\d\s-]{10,}$/.test(form.phone)) newErrors.phone = "Invalid phone number";
    if (!form.gender) newErrors.gender = "Sex is required";
    if (!form.department) newErrors.department = "Select a department";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) {
      toast.error("Please fix the errors in the form.");
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await registerPatientApi(form);
      if (res.status === "success") {
        setIssued(res.data);
        toast.success("Patient registered and token issued!");
        setForm({
          firstName: "",
          lastName: "",
          phone: "",
          dateOfBirth: "",
          gender: "",
          address: "",
          department: departments[0]!,
          payer: "self",
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-24 lg:pb-0 min-h-[calc(100vh-4rem)] flex flex-col">
      <PanelHeader
        index="01 / front desk"
        title="New Registration"
        note="Register new walk-in patients and instantly issue OPD tokens."
      />

      <div className="flex-1 grid lg:grid-cols-[1.5fr_1fr] bg-background">
        
        {/* Left Column: Form */}
        <div className="p-4 sm:p-6 lg:p-10 border-r border-border/60 overflow-y-auto">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold tracking-tight mb-6">Patient Details</h2>
            
            <div className="grid gap-5 sm:grid-cols-2 mb-8">
              <FloatingInput 
                label="First Name" 
                value={form.firstName} 
                onChange={(val) => {
                  setForm({ ...form, firstName: val });
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: "" }));
                }}
                placeholder="e.g. Priya"
                error={errors.firstName}
              />
              <FloatingInput 
                label="Last Name" 
                value={form.lastName} 
                onChange={(val) => {
                  setForm({ ...form, lastName: val });
                  if (errors.lastName) setErrors(prev => ({ ...prev, lastName: "" }));
                }}
                placeholder="e.g. Nair"
              />
              <FloatingInput 
                label="Mobile Phone" 
                value={form.phone} 
                onChange={(val) => {
                  setForm({ ...form, phone: val });
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                }}
                placeholder="+91"
                error={errors.phone}
              />
              <FloatingInput 
                label="Date of Birth" 
                type="date"
                value={form.dateOfBirth} 
                onChange={(val) => setForm({ ...form, dateOfBirth: val })} 
              />
              <div className="sm:col-span-2">
                <FloatingInput 
                  label="Address" 
                  value={form.address} 
                  onChange={(val) => {
                    setForm({ ...form, address: val });
                    if (errors.address) setErrors(prev => ({ ...prev, address: "" }));
                  }}
                  placeholder="Full address (optional)"
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">
                Sex assigned at birth <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {["Female", "Male"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, gender: g });
                      setErrors(prev => ({ ...prev, gender: "" }));
                    }}
                    className={`px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                      form.gender === g 
                        ? "bg-primary border-primary text-primary-foreground shadow-md scale-105" 
                        : "bg-background border-border/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-rose-500 text-[10px] mt-2 font-medium ml-1">{errors.gender}</p>}
            </div>

            <div className="mb-8">
              <label className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">
                Target Department <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm({ ...form, department: d })}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                      form.department === d 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-background border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <label className="mono-label text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-3 block">
                Payer
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "self", label: "Self Pay" },
                  { id: "insurance", label: "Insurance / TPA" },
                  { id: "corporate", label: "Corporate" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, payer: p.id })}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 border ${
                      form.payer === p.id 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600" 
                        : "bg-background border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <ActionButton tone="solid" onClick={handleRegister} className="w-full sm:w-auto px-8 py-6 text-sm">
              {loading ? (
                <><Loader2 className="mr-2 inline size-4 animate-spin" /> Registering...</>
              ) : (
                <><UserPlus className="mr-2 inline size-4" /> Issue Token & Register</>
              )}
            </ActionButton>
            
          </div>
        </div>

        {/* Right Column: Slip & Status */}
        <div className="p-4 sm:p-6 lg:p-10 bg-card/20 flex flex-col">
          <h2 className="font-display text-xl font-bold tracking-tight mb-6 text-muted-foreground">Registration Slip</h2>
          
          {issued ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="bg-background border border-border/60 rounded-3xl p-8 shadow-sm relative overflow-hidden"
            >
              {/* Slip background decoration */}
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <UserPlus className="size-32" />
              </div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full mb-6">
                  <Check className="size-3" strokeWidth={3} />
                  Registered
                </div>
                
                <p className="mono-label text-xs text-muted-foreground uppercase tracking-wider mb-1">OPD Token</p>
                <p className="font-mono text-6xl font-bold tracking-tighter text-foreground mb-6">
                  {issued.token}
                </p>
                
                <div className="space-y-4 border-t border-border/60 pt-6">
                  <div>
                    <p className="mono-label text-[10px] text-muted-foreground uppercase">Patient Name</p>
                    <p className="font-semibold mt-0.5">{issued.patient.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mono-label text-[10px] text-muted-foreground uppercase">MRN ID</p>
                      <p className="font-mono text-sm mt-0.5">{issued.patient._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="mono-label text-[10px] text-muted-foreground uppercase">Department</p>
                      <p className="font-mono text-sm mt-0.5">{issued.appointment.department}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-3xl p-8 text-center bg-background/50">
              <UserPlus className="size-10 text-muted-foreground/30 mb-4" />
              <p className="font-medium text-foreground">Waiting for registration...</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-62.5">
                Complete the form on the left. The patient slip will print here automatically.
              </p>
            </div>
          )}

          <div className="mt-auto pt-8">
            <Card className="bg-background/80 border-border/40">
              <p className="mono-label text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Identity Guidelines</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                  <span>Verify photo ID at the counter before completing registration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="size-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                  <span>Ask for mobile number confirmation to link past records.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

      </div>
    </section>
  );
}
