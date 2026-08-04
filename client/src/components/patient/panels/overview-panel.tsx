import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  TriangleAlert,
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Scale,
  Users,
  AlertCircle,
  Stethoscope,
  ShieldCheck
} from "lucide-react";
import { ActionButton, PanelHeader } from "@/components/admin/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPatientProfileApi, PatientProfileData } from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/use-auth-store";
import {
  patient,
  vitals,
  careTeam,
} from "../patient-data";

/** Animated trend line — drawn, never an image. */
function Trend({ series, color }: { series: number[], color?: string }) {
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
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full mt-2">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color || "var(--color-primary)"}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeInOut" }}
      />
    </svg>
  );
}

export function OverviewPanel() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchPatientProfileApi()
      .then((res) => {
        if (isMounted && res.success) {
          setProfile(res.profile);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const userName = user?.name || "Patient";
  const userFirstName = userName.split(" ")[0];
  const userRole = user?.role || "PATIENT";
  const allergiesList = profile?.allergies?.length ? profile.allergies : ["No known drug allergies"];
  const bloodGroup = profile?.bloodGroup || "O+";

  const getVitalIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case "blood pressure": return <HeartPulse className="size-4 text-rose-500" />;
      case "heart rate": return <Activity className="size-4 text-amber-500" />;
      case "glucose": return <Droplets className="size-4 text-cyan-500" />;
      case "temperature": return <Thermometer className="size-4 text-orange-500" />;
      case "weight": return <Scale className="size-4 text-indigo-500" />;
      default: return <Activity className="size-4 text-primary" />;
    }
  };

  const getVitalColor = (label: string) => {
    switch (label.toLowerCase()) {
      case "blood pressure": return "#f43f5e";
      case "heart rate": return "#f59e0b";
      case "glucose": return "#06b6d4";
      case "temperature": return "#f97316";
      case "weight": return "#6366f1";
      default: return "var(--color-primary)";
    }
  };

  return (
    <section className="pb-12">
      <PanelHeader
        index="01 / my health"
        title={`Hello, ${userFirstName}`}
        note={`Role: ${userRole} · Email: ${user?.email || "N/A"} · Blood Group: ${bloodGroup}`}
        actions={
          <ActionButton tone="solid">
            <ShieldCheck className="size-4 mr-2" />
            Verified Health Account
          </ActionButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Vitals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {vitals.slice(0, 4).map((v) => (
            <Card key={v.label} className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {v.label}
                  </span>
                  <div className="p-1.5 rounded-md bg-muted/50 border border-border/40">
                    {getVitalIcon(v.label)}
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                    {v.value}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium">{v.unit}</span>
                </div>
                <Trend series={v.series} color={getVitalColor(v.label)} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3">
                  {v.note}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alerts & Care Team */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-500" />
                  Health Alerts & Allergies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Known Allergies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allergiesList.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-2.5 py-1.5 rounded-md text-xs font-semibold">
                          <TriangleAlert className="size-3.5" />
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Active Conditions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {patient.conditions.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1.5 rounded-md text-xs font-semibold">
                          <Activity className="size-3.5" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/60 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div>
                  <h3 className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {userName}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Phone: {user?.phone || profile?.emergencyPhone || "Not set"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Emergency Contact: {profile?.emergencyContactName || "Not set"}
                  </p>
                </div>
                
                <div className="text-center sm:text-right bg-background p-4 rounded-xl border border-border/40 shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Blood Type
                  </p>
                  <p className="font-mono text-3xl font-bold text-rose-500">
                    {bloodGroup}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="shadow-sm border-border/60">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  My Care Team
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {careTeam.map((c) => (
                    <div key={c.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="bg-primary/10 border border-primary/20 text-primary font-bold grid size-10 rounded-full shrink-0 place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {c.name
                          .replace("Dr. ", "")
                          .replace("Sr. ", "")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate font-medium mt-0.5 flex items-center gap-1.5">
                          <Stethoscope className="size-3" />
                          {c.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
}
