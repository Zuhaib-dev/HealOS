import { useEffect, useState } from "react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, UserCheck, BellRing, Lock, AlertTriangle, FileText } from "lucide-react";
import { fetchPatientProfileApi, updatePatientProfileApi } from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/use-auth-store";
import { toast } from "sonner";

export function ProfilePanel() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [bloodGroup, setBloodGroup] = useState<"A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-">("O+");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [allergies, setAllergies] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchPatientProfileApi()
      .then((res) => {
        if (res.success && res.profile) {
          if (res.profile.dob) setDob(res.profile.dob);
          if (res.profile.gender) setGender(res.profile.gender);
          if (res.profile.bloodGroup) setBloodGroup(res.profile.bloodGroup);
          if (res.profile.emergencyPhone) setEmergencyPhone(res.profile.emergencyPhone);
          if (res.profile.emergencyContactName) setEmergencyContactName(res.profile.emergencyContactName);
          if (res.profile.allergies) setAllergies(res.profile.allergies.join(", "));
          if (res.profile.address) setAddress(res.profile.address);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allergyArr = allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await updatePatientProfileApi({
        dob,
        gender,
        bloodGroup,
        emergencyPhone,
        emergencyContactName,
        allergies: allergyArr,
        address,
      });

      if (res.success) {
        toast.success("Profile updated successfully!");
        if (emergencyPhone && user) {
          updateUser({ phone: emergencyPhone });
        }
      }
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pb-12">
      <form onSubmit={handleSave}>
        <PanelHeader
          index="08 / profile"
          title="Personal Profile"
          note="Manage your contact details, emergency information, and account preferences securely."
          actions={
            <ActionButton tone="solid" type="submit" disabled={saving}>
              {saving ? "Saving Changes..." : "Save Changes"}
            </ActionButton>
          }
        />

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-8">
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal and medical identification details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
                  
                  {/* Read Only Fields */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg border border-border/40">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Full Name
                      </label>
                      <input
                        readOnly
                        value={user?.name || ""}
                        className="w-full bg-transparent text-sm font-medium outline-none text-foreground/70 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                        Email Address
                      </label>
                      <input
                        readOnly
                        value={user?.email || ""}
                        className="w-full bg-transparent text-sm font-medium outline-none text-foreground/70 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full appearance-none bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value as any)}
                      className="w-full appearance-none bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Emergency Contact Name
                    </label>
                    <input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Primary contact name"
                      className="w-full bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Emergency Phone Number
                    </label>
                    <input
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      Known Allergies (Comma Separated)
                    </label>
                    <input
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Dust Mites, Peanuts"
                      className="w-full bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                      Residential Address
                    </label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full residential address"
                      className="w-full resize-none bg-background border border-border/70 text-sm rounded-md px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Right Column: Status & Consent */}
            <div className="lg:col-span-4 space-y-6">
              
              <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4 border-b border-border/40">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    Account Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">
                        Role: {user?.role}
                      </p>
                      {user?.isEmailVerified && (
                        <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                      Status: {user?.isEmailVerified ? "Verified Identity" : "Pending Verification"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/60 bg-muted/10">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="size-4 text-muted-foreground" />
                    Consent & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { t: "Share records with assigned clinicians", on: true, icon: FileText },
                    { t: "SMS & Email reminders for visits", on: true, icon: BellRing },
                    { t: "HIPAA Compliant Data Encryption", on: true, icon: Lock },
                  ].map((c) => {
                    const Icon = c.icon as any;
                    return (
                      <div key={c.t} className="flex items-start gap-3 p-3 rounded-md bg-background border border-border/40">
                        <div className="mt-0.5">
                          <Icon className="size-4 text-primary/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground leading-tight">{c.t}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">
                            {c.on ? <span className="text-emerald-500">Active</span> : "Disabled"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
