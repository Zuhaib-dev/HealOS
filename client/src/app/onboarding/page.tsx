"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/use-auth-store";
import {
  applyForClinicianRoleApi,
  fetchMyOnboardingStatusApi,
  updatePatientProfileApi,
  fetchPatientProfileApi,
  ProfessionalProfileData,
  PatientProfileData,
} from "@/lib/api/onboarding";
import { toast } from "sonner";
import {
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Award,
  BookOpen,
  ArrowRight,
  Heart,
  Phone,
  Calendar,
  MapPin,
  Activity,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, user, openAuthModal, updateUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"patient" | "clinician">("patient");

  // Loading States
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submittingPatient, setSubmittingPatient] = useState(false);
  const [submittingClinician, setSubmittingClinician] = useState(false);

  // Clinician Application State
  const [clinicianProfile, setClinicianProfile] = useState<ProfessionalProfileData | null>(null);
  const [requestedRole, setRequestedRole] = useState<"DOCTOR" | "RADIOLOGIST">("DOCTOR");
  const [degree, setDegree] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [documentUrlInput, setDocumentUrlInput] = useState("");

  // Patient Profile State
  const [patientData, setPatientData] = useState<PatientProfileData>({
    dob: "",
    gender: "MALE",
    bloodGroup: "O+",
    emergencyPhone: "",
    emergencyContactName: "",
    allergies: [],
    medicalHistory: "",
    address: "",
    isComplete: false,
  });
  const [allergyInput, setAllergyInput] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user) {
      openAuthModal("login");
      return;
    }

    const loadData = async () => {
      try {
        setLoadingStatus(true);
        // Load Clinician Status
        const clinRes = await fetchMyOnboardingStatusApi();
        if (clinRes.success && clinRes.profile) {
          setClinicianProfile(clinRes.profile);
        }

        // Load Patient Profile
        const patRes = await fetchPatientProfileApi();
        if (patRes.success && patRes.profile) {
          setPatientData({
            ...patRes.profile,
            dob: patRes.profile.dob || "",
            gender: patRes.profile.gender || "MALE",
            bloodGroup: patRes.profile.bloodGroup || "O+",
            emergencyPhone: patRes.profile.emergencyPhone || user.phone || "",
            emergencyContactName: patRes.profile.emergencyContactName || "",
            allergies: patRes.profile.allergies || [],
            medicalHistory: patRes.profile.medicalHistory || "",
            address: patRes.profile.address || "",
          });
        } else if (user.phone) {
          setPatientData((prev) => ({ ...prev, emergencyPhone: user.phone || "" }));
        }
      } catch (err) {
        console.error("Failed to load onboarding status", err);
      } finally {
        setLoadingStatus(false);
      }
    };

    loadData();
  }, [isAuthenticated, user, openAuthModal]);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPatient(true);

    try {
      const res = await updatePatientProfileApi(patientData);
      if (res.success) {
        toast.success("Patient Health Profile saved successfully!");
        setPatientData(res.profile);
        updateUser({ phone: patientData.emergencyPhone });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update patient profile");
    } finally {
      setSubmittingPatient(false);
    }
  };

  const handleClinicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!degree || !specialization || !licenseNumber) {
      toast.error("Please fill in all required medical qualification fields.");
      return;
    }

    setSubmittingClinician(true);
    try {
      const res = await applyForClinicianRoleApi({
        requestedRole,
        degree,
        specialization,
        experienceYears: Number(experienceYears),
        licenseNumber,
        documentUrls: documentUrlInput ? [documentUrlInput] : [],
      });

      if (res.success) {
        toast.success("Clinician application submitted! Awaiting Admin verification.");
        setClinicianProfile(res.profile);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit application");
    } finally {
      setSubmittingClinician(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-12">
        {/* Header Title */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mono-label mb-3 px-3 py-1">
            <UserCheck className="size-3.5 mr-1.5 inline" /> HealOS Onboarding Center
          </Badge>
          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
            Account Profile & Credentials
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mt-2">
            Complete your personal health profile or apply for professional clinician privileges.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted/50 p-1.5 rounded-xl border border-border/70 inline-flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("patient")}
              className={`mono-label px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "patient"
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className="size-3.5 text-rose-500" />
              Patient Health Profile
              {patientData.isComplete && (
                <CheckCircle2 className="size-3.5 text-emerald-500 ml-1" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("clinician")}
              className={`mono-label px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "clinician"
                  ? "bg-card text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Stethoscope className="size-3.5 text-emerald-500" />
              Clinician / Doctor Application
              {clinicianProfile && (
                <Badge
                  variant="outline"
                  className={`mono-label text-[10px] ml-1.5 px-1.5 py-0 ${
                    clinicianProfile.status === "APPROVED"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : clinicianProfile.status === "REJECTED"
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {clinicianProfile.status}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {loadingStatus ? (
          <div className="plate p-12 text-center border-border/60">
            <div className="mono-label text-muted-foreground animate-pulse text-xs">
              Fetching profile & credential records...
            </div>
          </div>
        ) : activeTab === "patient" ? (
          /* TAB 1: PATIENT PROFILE FORM */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="plate p-8 border-border/70 max-w-2xl mx-auto space-y-6"
          >
            <div className="border-b border-border/60 pb-4">
              <h2 className="font-mono text-xl font-bold flex items-center gap-2">
                <Heart className="size-5 text-rose-500" /> Patient Medical & Emergency File
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                This information is shared only with treating physicians and emergency responders.
              </p>
            </div>

            <form onSubmit={handlePatientSubmit} className="space-y-6">
              {/* DOB & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pat-dob" className="mono-label text-xs">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="pat-dob"
                      type="date"
                      value={patientData.dob}
                      onChange={(e) => setPatientData((p) => ({ ...p, dob: e.target.value }))}
                      className="pl-9 font-sans text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pat-gender" className="mono-label text-xs">Gender</Label>
                  <select
                    id="pat-gender"
                    value={patientData.gender}
                    onChange={(e) => setPatientData((p) => ({ ...p, gender: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-sans focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Blood Group & Emergency Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pat-blood" className="mono-label text-xs">Blood Group</Label>
                  <select
                    id="pat-blood"
                    value={patientData.bloodGroup}
                    onChange={(e) => setPatientData((p) => ({ ...p, bloodGroup: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pat-ephone" className="mono-label text-xs">Emergency Phone Number</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="pat-ephone"
                      type="tel"
                      placeholder="+1 (555) 019-2834"
                      value={patientData.emergencyPhone}
                      onChange={(e) => setPatientData((p) => ({ ...p, emergencyPhone: e.target.value }))}
                      className="pl-9 font-mono text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="pat-ename" className="mono-label text-xs">Emergency Contact Name & Relationship</Label>
                <Input
                  id="pat-ename"
                  type="text"
                  placeholder="e.g. John Doe (Spouse / Guardian)"
                  value={patientData.emergencyContactName}
                  onChange={(e) => setPatientData((p) => ({ ...p, emergencyContactName: e.target.value }))}
                  className="font-sans text-sm"
                />
              </div>

              {/* Known Allergies */}
              <div className="space-y-2">
                <Label className="mono-label text-xs">Known Allergies (e.g. Penicillin, Latex, Peanuts)</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type an allergy and click Add"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (allergyInput.trim()) {
                          setPatientData((p) => ({ ...p, allergies: [...(p.allergies || []), allergyInput.trim()] }));
                          setAllergyInput("");
                        }
                      }
                    }}
                    className="font-sans text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (allergyInput.trim()) {
                        setPatientData((p) => ({ ...p, allergies: [...(p.allergies || []), allergyInput.trim()] }));
                        setAllergyInput("");
                      }
                    }}
                    className="mono-label text-xs shrink-0"
                  >
                    + Add
                  </Button>
                </div>

                {patientData.allergies && patientData.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {patientData.allergies.map((item, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1.5"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() =>
                            setPatientData((p) => ({
                              ...p,
                              allergies: (p.allergies || []).filter((_, i) => i !== idx),
                            }))
                          }
                          className="hover:text-destructive text-muted-foreground ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Medical History */}
              <div className="space-y-2">
                <Label htmlFor="pat-history" className="mono-label text-xs">Chronic Conditions / Medical History</Label>
                <Textarea
                  id="pat-history"
                  rows={3}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Previous Appendectomy in 2021"
                  value={patientData.medicalHistory}
                  onChange={(e) => setPatientData((p) => ({ ...p, medicalHistory: e.target.value }))}
                  className="font-sans text-sm"
                />
              </div>

              {/* Residential Address */}
              <div className="space-y-2">
                <Label htmlFor="pat-address" className="mono-label text-xs">Residential Address</Label>
                <div className="relative">
                  <MapPin className="text-muted-foreground absolute left-3 top-3 size-4" />
                  <Input
                    id="pat-address"
                    type="text"
                    placeholder="124 Healthcare Blvd, Suite 400, New York, NY"
                    value={patientData.address}
                    onChange={(e) => setPatientData((p) => ({ ...p, address: e.target.value }))}
                    className="pl-9 font-sans text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submittingPatient}
                className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
              >
                {submittingPatient ? "Saving Patient Record..." : "Save Patient Health Profile →"}
              </Button>
            </form>
          </motion.div>
        ) : (
          /* TAB 2: CLINICIAN APPLICATION FORM / STATUS */
          <div>
            {clinicianProfile && (clinicianProfile.status === "PENDING" || clinicianProfile.status === "UNDER_REVIEW") ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="plate p-8 border-border/70 text-center space-y-6 max-w-2xl mx-auto"
              >
                <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                  <Clock className="size-8 animate-spin-slow" />
                </div>

                <div>
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 mono-label px-3 py-1 text-xs">
                    Status: {clinicianProfile.status}
                  </Badge>
                  <h2 className="font-mono text-2xl font-bold mt-3">
                    Application Under Verification
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                    Your medical credentials for <strong>{clinicianProfile.requestedRole}</strong> status are currently being audited by Hospital Administration.
                  </p>
                </div>

                <div className="bg-muted/40 p-4 rounded-lg hairline text-left space-y-2 font-mono text-xs max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested Role:</span>
                    <span className="font-semibold text-foreground">{clinicianProfile.requestedRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Qualification Degree:</span>
                    <span className="font-semibold text-foreground">{clinicianProfile.degree}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Specialization:</span>
                    <span className="font-semibold text-foreground">{clinicianProfile.specialization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medical License #:</span>
                    <span className="font-semibold text-foreground">{clinicianProfile.licenseNumber}</span>
                  </div>
                </div>

                <Button variant="outline" onClick={() => router.push("/patient")} className="mono-label text-xs">
                  Return to Patient Portal
                </Button>
              </motion.div>
            ) : clinicianProfile && clinicianProfile.status === "APPROVED" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="plate p-8 border-emerald-500/30 text-center space-y-6 max-w-2xl mx-auto"
              >
                <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="size-8" />
                </div>

                <div>
                  <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 mono-label px-3 py-1 text-xs">
                    APPROVED & VERIFIED
                  </Badge>
                  <h2 className="font-mono text-2xl font-bold mt-3">
                    Clinician Status Active!
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Your medical role is <strong>{user.role}</strong>. You have full clinician system access.
                  </p>
                </div>

                <Button
                  onClick={() => router.push(user.role === "RADIOLOGIST" ? "/radiology" : "/doctor")}
                  className="bg-primary text-primary-foreground mono-label py-5 text-xs font-semibold px-6"
                >
                  Enter {user.role} Workspace <ArrowRight className="size-4 ml-2" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="plate p-8 border-border/70 max-w-2xl mx-auto"
              >
                {clinicianProfile && clinicianProfile.status === "REJECTED" && (
                  <div className="bg-destructive/10 border-destructive/30 border p-4 rounded-lg mb-8 space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-mono font-bold text-sm">
                      <AlertTriangle className="size-4 shrink-0" />
                      Application Rejected by Admin
                    </div>
                    <p className="text-xs text-foreground font-mono">
                      <strong>Rejection Reason:</strong> {clinicianProfile.rejectionReason || "Credentials require validation."}
                    </p>
                  </div>
                )}

                <form onSubmit={handleClinicianSubmit} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label className="mono-label text-xs">Requested Role</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setRequestedRole("DOCTOR")}
                        className={`p-4 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                          requestedRole === "DOCTOR"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <Stethoscope className="size-5 mb-2 text-primary" />
                        <span className="font-mono font-bold text-sm">Doctor / Clinician</span>
                        <span className="text-[11px] opacity-80 mt-0.5">EHR & Prescriptions</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRequestedRole("RADIOLOGIST")}
                        className={`p-4 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                          requestedRole === "RADIOLOGIST"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <Award className="size-5 mb-2 text-primary" />
                        <span className="font-mono font-bold text-sm">Radiologist</span>
                        <span className="text-[11px] opacity-80 mt-0.5">DICOM & Imaging Diagnostics</span>
                      </button>
                    </div>
                  </div>

                  {/* Qualification */}
                  <div className="space-y-2">
                    <Label htmlFor="onb-degree" className="mono-label text-xs">Medical Degree / Qualification</Label>
                    <div className="relative">
                      <BookOpen className="text-muted-foreground absolute left-3 top-3 size-4" />
                      <Input
                        id="onb-degree"
                        type="text"
                        placeholder="e.g. MBBS, MD (Internal Medicine), DMRD"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        className="pl-9 font-sans text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Specialization & Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="onb-spec" className="mono-label text-xs">Specialization Area</Label>
                      <Input
                        id="onb-spec"
                        type="text"
                        placeholder="e.g. Cardiology, Neurology, Radiology"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="font-sans text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="onb-exp" className="mono-label text-xs">Years of Clinical Experience</Label>
                      <Input
                        id="onb-exp"
                        type="number"
                        min={0}
                        max={50}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Number(e.target.value))}
                        className="font-sans text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Medical License */}
                  <div className="space-y-2">
                    <Label htmlFor="onb-license" className="mono-label text-xs">Medical Council License Number</Label>
                    <div className="relative">
                      <ShieldCheck className="text-muted-foreground absolute left-3 top-3 size-4" />
                      <Input
                        id="onb-license"
                        type="text"
                        placeholder="e.g. REG-MC-2024-9981"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="pl-9 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Supporting Document */}
                  <div className="space-y-2">
                    <Label htmlFor="onb-doc" className="mono-label text-xs">Supporting Credential Link (Optional)</Label>
                    <div className="relative">
                      <FileText className="text-muted-foreground absolute left-3 top-3 size-4" />
                      <Input
                        id="onb-doc"
                        type="url"
                        placeholder="https://ik.imagekit.io/your-cert.pdf"
                        value={documentUrlInput}
                        onChange={(e) => setDocumentUrlInput(e.target.value)}
                        className="pl-9 font-sans text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingClinician}
                    className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
                  >
                    {submittingClinician ? "Submitting Application..." : "Submit Application for Admin Audit →"}
                  </Button>
                </form>
              </motion.div>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
