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
import { useAuthStore } from "@/store/use-auth-store";
import {
  applyForClinicianRoleApi,
  fetchMyOnboardingStatusApi,
  ProfessionalProfileData,
} from "@/lib/api/onboarding";
import { toast } from "sonner";
import {
  Stethoscope,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Award,
  BookOpen,
  Building2,
  ArrowRight,
} from "lucide-react";

export default function ClinicianOnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, user, openAuthModal } = useAuthStore();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfessionalProfileData | null>(null);

  // Form State
  const [requestedRole, setRequestedRole] = useState<"DOCTOR" | "RADIOLOGIST">("DOCTOR");
  const [degree, setDegree] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [documentUrlInput, setDocumentUrlInput] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user) {
      openAuthModal("login");
      return;
    }

    const loadStatus = async () => {
      try {
        const res = await fetchMyOnboardingStatusApi();
        if (res.success && res.profile) {
          setProfile(res.profile);
        }
      } catch (err) {
        console.error("Failed to load onboarding status", err);
      } finally {
        setLoadingStatus(false);
      }
    };

    loadStatus();
  }, [isAuthenticated, user, openAuthModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!degree || !specialization || !licenseNumber) {
      toast.error("Please fill in all required medical qualification fields.");
      return;
    }

    setSubmitting(true);
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
        setProfile(res.profile);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-12">
        {/* Page Title & Breadcrumb */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mono-label mb-3 px-3 py-1">
            <Stethoscope className="size-3.5 mr-1.5 inline" /> Clinician Verification Portal
          </Badge>
          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
            Professional Role Onboarding
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mt-2">
            Submit your medical credentials, medical license, and specialization to unlock Doctor or Radiologist access.
          </p>
        </div>

        {loadingStatus ? (
          <div className="plate p-12 text-center border-border/60">
            <div className="mono-label text-muted-foreground animate-pulse text-xs">
              Loading credential verification records...
            </div>
          </div>
        ) : profile && (profile.status === "PENDING" || profile.status === "UNDER_REVIEW") ? (
          /* STATUS SCREEN: PENDING / UNDER REVIEW */
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
                Status: {profile.status === "PENDING" ? "PENDING ADMIN REVIEW" : "UNDER REVIEW"}
              </Badge>
              <h2 className="font-mono text-2xl font-bold mt-3">
                Application Under Verification
              </h2>
              <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
                Your medical application for <strong>{profile.requestedRole}</strong> status has been received and is currently being audited by the Chief Medical Officer.
              </p>
            </div>

            <div className="bg-muted/40 p-4 rounded-lg hairline text-left space-y-2 font-mono text-xs max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Role:</span>
                <span className="font-semibold text-foreground">{profile.requestedRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qualification Degree:</span>
                <span className="font-semibold text-foreground">{profile.degree}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Specialization:</span>
                <span className="font-semibold text-foreground">{profile.specialization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medical License #:</span>
                <span className="font-semibold text-foreground">{profile.licenseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Experience:</span>
                <span className="font-semibold text-foreground">{profile.experienceYears} Years</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => router.push("/patient")}
                className="mono-label text-xs"
              >
                Return to Patient Portal
              </Button>
            </div>
          </motion.div>
        ) : profile && profile.status === "APPROVED" ? (
          /* STATUS SCREEN: APPROVED */
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
                Clinician Credentials Approved!
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your medical role has been upgraded to <strong>{user.role}</strong>. You now have access to clinician EHR tools and clinical consoles.
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
          /* FORM SCREEN: APPLY OR RE-APPLY (If Rejected) */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="plate p-8 border-border/70 max-w-2xl mx-auto"
          >
            {profile && profile.status === "REJECTED" && (
              <div className="bg-destructive/10 border-destructive/30 border p-4 rounded-lg mb-8 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-mono font-bold text-sm">
                  <AlertTriangle className="size-4 shrink-0" />
                  Application Rejected by Admin
                </div>
                <p className="text-xs text-foreground font-mono">
                  <strong>Rejection Reason:</strong> {profile.rejectionReason || "Credentials require further validation."}
                </p>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Please update your degree, medical license, or experience details below to re-submit.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <span className="text-[11px] opacity-80 mt-0.5">EHR, Patient Consultations & Prescriptions</span>
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
                    <span className="text-[11px] opacity-80 mt-0.5">DICOM Imaging, X-Ray & MRI Diagnostics</span>
                  </button>
                </div>
              </div>

              {/* Medical Degree */}
              <div className="space-y-2">
                <Label htmlFor="onb-degree" className="mono-label text-xs">
                  Medical Degree / Qualification
                </Label>
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
                  <Label htmlFor="onb-spec" className="mono-label text-xs">
                    Specialization Area
                  </Label>
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
                  <Label htmlFor="onb-exp" className="mono-label text-xs">
                    Years of Clinical Experience
                  </Label>
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

              {/* Medical License Number */}
              <div className="space-y-2">
                <Label htmlFor="onb-license" className="mono-label text-xs">
                  Medical Council License / Registration Number
                </Label>
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

              {/* Supporting Document URL */}
              <div className="space-y-2">
                <Label htmlFor="onb-doc" className="mono-label text-xs">
                  Supporting Credential Document / Certificate Link (Optional)
                </Label>
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
                disabled={submitting}
                className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
              >
                {submitting ? "Submitting Application..." : "Submit Application for Admin Audit →"}
              </Button>
            </form>
          </motion.div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
