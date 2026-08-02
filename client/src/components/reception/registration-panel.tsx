"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserPlus, Check, IdCard } from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, StatGrid } from "@/components/workspace/ui";
import { registerPatientApi } from "@/lib/api/reception";
import { toast } from "sonner";

const deskStats = [
  { label: "Registrations today", value: "182", note: "41 new · 141 repeat" },
  { label: "Tokens waiting", value: "23", note: "avg wait 14 min" },
  { label: "Counter collections", value: "₹4.82 L", note: "cash + card + UPI" },
  { label: "Insurance captured", value: "96.4%", note: "target 95%" },
];

import { fetchAvailableDoctorsApi } from "@/lib/api/appointment";

export function RegistrationPanel() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    abhaNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    department: "",
    payer: "self",
    policyNumber: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [issued, setIssued] = useState<any>(null); // To store response data
  const [departments, setDepartments] = useState<string[]>(["General medicine"]);

  useEffect(() => {
    fetchAvailableDoctorsApi().then(res => {
      if (res.success && res.doctors.length > 0) {
        const depts = Array.from(new Set(res.doctors.map(d => d.department)));
        setDepartments(depts);
        setForm(f => ({ ...f, department: depts[0] }));
      }
    }).catch(console.error);
  }, []);

  const field = (k: keyof typeof form, label: string, placeholder = "") => (
    <label className="mono-label text-muted-foreground block">
      {label}
      <input
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        placeholder={placeholder}
        className="hairline text-foreground mt-1 w-full bg-transparent px-3 py-2 text-sm outline-none"
      />
    </label>
  );

  const handleRegister = async () => {
    if (!form.firstName || !form.phone) {
      toast.error("Please fill required fields (First Name, Phone)");
      return;
    }
    setLoading(true);
    try {
      const res = await registerPatientApi(form);
      if (res.status === "success") {
        setIssued(res.data);
        toast.success("Patient registered and token issued!");
        setForm({
          firstName: "",
          lastName: "",
          phone: "",
          abhaNumber: "",
          dateOfBirth: "",
          gender: "",
          address: "",
          department: departments[0]!,
          payer: "self",
          policyNumber: "",
        });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <PanelHeader
        index="01 / front desk"
        title="Patient registration"
        note="New and repeat registration with ABHA linkage, payer capture and instant OPD token issue."
        actions={<ActionButton tone="solid">Scan existing card</ActionButton>}
      />

      <StatGrid stats={deskStats} />

      <div className="hairline-t grid gap-px lg:grid-cols-[1.3fr_1fr]" style={{ background: "var(--hairline)" }}>
        <div className="bg-background p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", "First Name", "e.g. Priya")}
            {field("lastName", "Last Name", "e.g. Nair")}
            {field("phone", "Mobile", "+91")}
            {field("dateOfBirth", "Date of birth", "YYYY-MM-DD")}
            {field("gender", "Sex", "Female / Male / Other")}
            {field("abhaNumber", "ABHA number", "14-digit ABHA")}
            {field("policyNumber", "Policy / TPA number", "optional")}
          </div>
          {field("address", "Address")}

          <p className="mono-label text-muted-foreground mt-5">Department</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {departments.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm({ ...form, department: d })}
                className={`mono-label px-3 py-2 ${form.department === d ? "bg-foreground text-background" : "hairline"}`}
              >
                {d}
              </button>
            ))}
          </div>

          <p className="mono-label text-muted-foreground mt-5">Payer</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["self", "insurance", "corporate", "scheme"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, payer: p })}
                className={`mono-label px-3 py-2 ${form.payer === p ? "bg-foreground text-background" : "hairline"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <ActionButton tone="solid" onClick={handleRegister}>
              <UserPlus className="mr-1 inline size-3" />
              {loading ? "Registering..." : "Register & issue token"}
            </ActionButton>
            <ActionButton>Verify ABHA (OTP)</ActionButton>
          </div>
        </div>

        <div className="bg-background p-5 sm:p-8">
          <p className="mono-label text-muted-foreground">Registration slip</p>
          {issued ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hairline mt-3 p-5">
              <p className="mono-label text-brass">
                <Check className="mr-1 inline size-3" />
                Registered · {issued.patient._id.slice(-6)}
              </p>
              <p className="mt-4 font-mono text-4xl font-bold">{issued.token}</p>
              <p className="mono-label text-muted-foreground mt-1">
                {issued.appointment.department} · payer {issued.invoice.payer}
              </p>
              <p className="mono-label text-muted-foreground mt-4">
                {issued.patient.firstName} {issued.patient.lastName} · {issued.patient.phone || "no mobile"}
              </p>
              {issued.patient.abhaNumber && (
                <p className="mono-label text-brass mt-2">
                  <IdCard className="mr-1 inline size-3" />
                  ABHA linked
                </p>
              )}
            </motion.div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              Complete the form and issue a token — the slip prints here with MRN, queue number and payer.
            </p>
          )}

          <div className="mt-6">
            <Card>
              <p className="mono-label text-muted-foreground">Consent &amp; identity</p>
              <ul className="mono-label mt-3 space-y-2">
                <li>Photo ID verified at counter</li>
                <li>Data-sharing consent captured (ABDM)</li>
                <li>Insurance eligibility checked live with TPA</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
