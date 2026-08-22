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
import { forgotPasswordApi, loginUserApi, resendOtpApi, resetPasswordApi, verifyOtpApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { signIn as nextAuthSignIn } from "next-auth/react";

type LoginStep = "signin" | "otp" | "forgot" | "reset";

export default function LoginClient() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  
  const [step, setStep] = useState<LoginStep>("signin");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  // OTP Timer
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((step === "otp" || step === "reset") && resendTimer > 0) {
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await loginUserApi({ email, password });
      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token);
        toast.success(`Welcome back, ${res.user.name}!`);
        handleRoleRedirect(res.user.role);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to sign in";
      const isUnverified = err.response?.data?.requiresVerification;
      if (isUnverified) {
        toast.info("Email not verified. OTP sent.");
        setResendTimer(60);
        setStep("otp");
      } else {
        toast.error(msg);
      }
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
        toast.success("Verified successfully!");
        handleRoleRedirect(res.user.role);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      if (res.success) {
        toast.success("Reset code sent if the account exists.");
        setOtp("");
        setResetPassword("");
        setResendTimer(60);
        setStep("reset");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter 6 digit code");
      return;
    }
    if (resetPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordApi({ email, otp, password: resetPassword });
      if (res.success) {
        toast.success("Password reset. Sign in with your new password.");
        setPassword("");
        setOtp("");
        setResetPassword("");
        setStep("signin");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await forgotPasswordApi(email);
      if (res.success) {
        toast.success("New reset code sent!");
        setResendTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await nextAuthSignIn("google", { callbackUrl: "/" });
    } catch (err) {
      toast.error("Google sign in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {step === "signin" && "Sign In"}
          {step === "otp" && "Verify Email"}
          {step === "forgot" && "Reset Password"}
          {step === "reset" && "Enter Reset Code"}
        </h1>
        <p className="mono-label mt-2 text-xs text-muted-foreground">
          {step === "signin" && "Welcome back to your clinical workspace"}
          {step === "otp" && `We sent a 6-digit code to ${email}`}
          {step === "forgot" && "We'll send a 6-digit reset code to your email"}
          {step === "reset" && `We sent a reset code to ${email}`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "signin" && (
          <motion.form
            key="signin"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleSignIn}
            className="space-y-5"
          >
            <Button
              type="button"
              variant="outline"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="group hairline hover:bg-muted/50 mono-label w-full py-6 text-xs font-semibold flex items-center justify-center gap-3 transition-all rounded-xl"
            >
              <svg className="size-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </Button>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-border/60 border-t w-full" />
              <span className="bg-background text-muted-foreground mono-label px-3 text-[10px] uppercase absolute">
                or continue with email
              </span>
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
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="mono-label text-xs">Password</Label>
                <button
                  type="button"
                  onClick={() => setStep("forgot")}
                  className="mono-label text-[10px] text-emerald-600 hover:text-emerald-500"
                >
                  Forgot password?
                </button>
              </div>
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
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight className="size-3.5" />}
            </motion.button>

            <div className="mono-label text-muted-foreground text-center text-xs pt-4">
              Don't have an account?{" "}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-500 font-semibold transition-colors">
                Register here
              </Link>
            </div>
          </motion.form>
        )}

        {step === "forgot" && (
          <motion.form
            key="forgot"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onSubmit={handleForgotPassword}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="mono-label text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="doctor@healos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending code..." : "Send Reset Code"}
              {!loading && <ArrowRight className="size-3.5" />}
            </motion.button>

            <button
              type="button"
              onClick={() => setStep("signin")}
              className="mono-label w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2 py-2"
            >
              Back to sign in
            </button>
          </motion.form>
        )}

        {step === "reset" && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="space-y-6"
          >
            <div className="flex justify-center py-6">
              <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full">
                <KeyRound className="size-8" />
              </div>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-6 flex flex-col items-center">
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

              <div className="space-y-2 w-full">
                <Label htmlFor="reset-password" className="mono-label text-xs">New Password</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute left-3.5 top-3.5 size-4" />
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="pl-10 h-11 font-sans text-sm rounded-xl border-border/50 bg-muted/20 focus-visible:bg-background focus-visible:ring-emerald-500/50"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || otp.length < 6 || resetPassword.length < 6}
                className="bg-primary text-primary-foreground mono-label w-full py-4 rounded-xl text-xs font-semibold shadow-md transition-all hover:bg-primary/90 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Resetting..." : "Reset Password"}
                {!loading && <KeyRound className="size-3.5" />}
              </motion.button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={handleResendResetCode}
                className="mono-label text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {canResend ? "Resend Reset Code" : `Resend available in ${resendTimer}s`}
              </button>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setStep("signin")}
                  className="mono-label text-[10px] text-muted-foreground/60 hover:text-foreground uppercase tracking-wider"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          </motion.div>
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
                {loading ? "Verifying..." : "Verify & Continue"}
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
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setStep("signin")}
                  className="mono-label text-[10px] text-muted-foreground/60 hover:text-foreground uppercase tracking-wider"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
