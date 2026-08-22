"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useAuthStore } from "@/store/use-auth-store";
import { registerUserApi, verifyOtpApi, resendOtpApi, updatePhoneApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { Lock, Mail, User, ArrowRight, ShieldCheck, KeyRound, Phone, CheckCircle2 } from "lucide-react";

type RegisterStep = "register" | "otp" | "phone";

export default function RegisterClient() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const [step, setStep] = useState<RegisterStep>("register");
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");

  // OTP Timer
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleRoleRedirect = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN": router.push("/admin"); break;
      case "DOCTOR": router.push("/doctor"); break;
      case "RADIOLOGIST": router.push("/radiology"); break;
      case "RECEPTIONIST": router.push("/reception"); break;
      case "PHARMACIST": router.push("/pharmacy"); break;
      case "NURSE": router.push("/nurse"); break;
      case "EMERGENCY_DOCTOR": router.push("/emergency"); break;
      case "LAB_TECHNICIAN": router.push("/lab"); break;
      case "PATIENT": router.push("/patient"); break;
      case "USER": default: router.push("/"); break;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUserApi({ name, email, password });
      if (res.success) {
        toast.success("Account created! Check email for OTP.");
        setResendTimer(60);
        setStep("otp");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter 6 digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtpApi({ email, otp });
      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token);
        toast.success("Email verified!");
        setStep("phone"); // Proceed to optional phone step
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await resendOtpApi(email);
      if (res.success) {
        toast.success("New OTP sent!");
        setResendTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(phone)) {
        toast.error("Please enter a valid phone number");
        return;
      }
      try {
        await updatePhoneApi(phone);
        toast.success("Phone saved!");
      } catch (err) {
        console.error("Failed to save phone", err);
      }
    }
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      handleRoleRedirect(currentUser.role);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {step === "register" && "Create Account"}
          {step === "otp" && "Verify Email"}
          {step === "phone" && "Almost Done!"}
        </h1>
        <p className="mono-label mt-2 text-xs text-muted-foreground">
          {step === "register" && "Join the unified healthcare operating system"}
          {step === "otp" && `We sent a 6-digit code to ${email}`}
          {step === "phone" && "Add a contact number for your profile (optional)"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "register" && (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleRegister}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="mono-label text-xs">Full Name</Label>
              <div className="relative">
                <User className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Sarah Connor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-11 font-sans text-sm rounded-xl border-border/50 bg-muted/20 focus-visible:bg-background focus-visible:ring-emerald-500/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="mono-label text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@healos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 font-sans text-sm rounded-xl border-border/50 bg-muted/20 focus-visible:bg-background focus-visible:ring-emerald-500/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="mono-label text-xs">Password</Label>
              <div className="relative">
                <Lock className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 font-sans text-sm rounded-xl border-border/50 bg-muted/20 focus-visible:bg-background focus-visible:ring-emerald-500/50"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground mono-label w-full py-4 rounded-xl text-xs font-semibold shadow-md transition-all hover:bg-primary/90 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Creating account..." : "Continue"}
              {!loading && <ArrowRight className="size-3.5" />}
            </motion.button>

            <div className="mono-label text-muted-foreground text-center text-xs pt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors">
                Sign in here
              </Link>
            </div>
          </motion.form>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-6"
          >
            <div className="flex justify-center py-6">
              <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full">
                <ShieldCheck className="size-8" />
              </div>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-6 flex flex-col items-center">
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={otp} onChange={(val: string) => setOtp(val)}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-11 h-12 text-lg rounded-md border-border/50" />
                  <InputOTPSlot index={1} className="w-11 h-12 text-lg rounded-md border-border/50" />
                  <InputOTPSlot index={2} className="w-11 h-12 text-lg rounded-md border-border/50" />
                  <InputOTPSlot index={3} className="w-11 h-12 text-lg rounded-md border-border/50" />
                  <InputOTPSlot index={4} className="w-11 h-12 text-lg rounded-md border-border/50" />
                  <InputOTPSlot index={5} className="w-11 h-12 text-lg rounded-md border-border/50" />
                </InputOTPGroup>
              </InputOTP>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || otp.length < 6}
                className="bg-primary text-primary-foreground mono-label w-full py-4 rounded-xl text-xs font-semibold shadow-md transition-all hover:bg-primary/90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify Email"}
                {!loading && <KeyRound className="size-3.5" />}
              </motion.button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={handleResendOtp}
                className="mono-label text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {canResend ? "Resend Verification Code" : `Resend available in ${resendTimer}s`}
              </button>
            </div>
          </motion.div>
        )}

        {step === "phone" && (
          <motion.form
            key="phone"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handlePhoneSubmit}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="phone" className="mono-label text-xs">Phone Number</Label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-11 font-sans text-sm rounded-xl border-border/50 bg-muted/20 focus-visible:bg-background focus-visible:ring-emerald-500/50"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground mono-label w-full py-4 rounded-xl text-xs font-semibold shadow-md transition-all hover:bg-primary/90 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? "Saving..." : "Save & Continue"}
              {!loading && <CheckCircle2 className="size-3.5" />}
            </motion.button>
            
            <button
              type="button"
              onClick={() => handlePhoneSubmit({ preventDefault: () => {} } as any)}
              className="mono-label w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2 py-2"
            >
              Skip for now
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
