"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { HealOSLogo } from "@/components/brand/heal-os-logo";
import { useAuthStore } from "@/store/use-auth-store";
import {
  loginUserApi,
  registerUserApi,
  verifyOtpApi,
  resendOtpApi,
  updatePhoneApi,
} from "@/lib/api/auth";
import { toast } from "sonner";
import { Lock, Mail, User, Phone, ArrowRight, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import { signIn as nextAuthSignIn } from "next-auth/react";

type AuthMode = "signin" | "register" | "otp" | "phone";

export function AuthModal() {
  const router = useRouter();
  const { isAuthModalOpen, authModalTab, closeAuthModal, setAuth } = useAuthStore();
  
  const [mode, setMode] = useState<AuthMode>("signin");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [phone, setPhone] = useState("");

  // OTP Timer
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Sync mode when modal opens or tab changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalTab === "register" ? "register" : "signin");
    }
  }, [isAuthModalOpen, authModalTab]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "otp" && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [mode, resendTimer]);

  const handleRoleRedirect = (role: string) => {
    switch (role) {
      case "ADMIN":
        router.push("/admin");
        break;
      case "DOCTOR":
        router.push("/doctor");
        break;
      case "RADIOLOGIST":
        router.push("/radiology");
        break;
      case "patient":
      case "PATIENT":
      case "USER":
      default:
        router.push("/patient");
        break;
    }
  };

  // 1. Sign In Submission
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
        closeAuthModal();
        handleRoleRedirect(res.user.role);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to sign in";
      const isUnverified = err.response?.data?.requiresVerification;

      if (isUnverified) {
        toast.info("Your email is not verified yet. We sent a 6-digit OTP code.");
        setResendTimer(60);
        setMode("otp");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Registration Submission
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
        toast.success("Account created! Check your email for the 6-digit OTP.");
        setResendTimer(60);
        setMode("otp");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // 3. OTP Verification Submission
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter all 6 digits of the OTP code");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpApi({ email, otp });
      if (res.success && res.token && res.user) {
        setAuth(res.user, res.token);
        toast.success("Email verified successfully!");
        setMode("phone"); // Proceed to optional phone step
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP code");
    } finally {
      setLoading(false);
    }
  };

  // 4. Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    try {
      const res = await resendOtpApi(email);
      if (res.success) {
        toast.success("New OTP code sent to your email!");
        setResendTimer(60);
        setCanResend(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // 5. Phone Step Completion
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      try {
        await updatePhoneApi(phone);
        toast.success("Phone number saved!");
      } catch (err) {
        console.error("Failed to save phone", err);
      }
    }
    closeAuthModal();
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      handleRoleRedirect(currentUser.role);
    }
  };

  // Google Sign In trigger
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
    <Dialog open={isAuthModalOpen} onOpenChange={(open: boolean) => !open && closeAuthModal()}>
      <DialogContent className="border-border/60 plate max-w-md p-0 overflow-hidden sm:rounded-xl">
        {/* Header Header Banner */}
        <div className="bg-muted/40 hairline-b p-6 text-center relative">
          <div className="mx-auto flex justify-center mb-3">
            <HealOSLogo size={36} />
          </div>
          <DialogTitle className="font-mono text-xl font-bold tracking-tight">
            {mode === "signin" && "Sign In to HealOS"}
            {mode === "register" && "Create your HealOS Account"}
            {mode === "otp" && "Verify your Email"}
            {mode === "phone" && "Welcome to HealOS!"}
          </DialogTitle>
          <DialogDescription className="mono-label text-muted-foreground mt-1 text-xs">
            {mode === "signin" && "Access your clinical workspace or patient portal"}
            {mode === "register" && "Join the unified healthcare operating system"}
            {mode === "otp" && `We sent a 6-digit code to ${email}`}
            {mode === "phone" && "Add your contact phone number to complete setup"}
          </DialogDescription>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* MODE 1: SIGN IN */}
            {mode === "signin" && (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                  className="hairline hover:bg-muted/50 mono-label w-full py-5 text-xs font-semibold flex items-center justify-center gap-3 transition-all"
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {googleLoading ? "Connecting to Google..." : "Continue with Google"}
                </Button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-border/60 border-t w-full" />
                  <span className="bg-card text-muted-foreground mono-label px-3 text-[10px] uppercase absolute">
                    or continue with email
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="mono-label text-xs">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="doctor@healos.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 font-sans text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="mono-label text-xs">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 font-sans text-sm"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
                >
                  {loading ? "Signing in..." : "Sign In →"}
                </Button>

                <div className="mono-label text-muted-foreground text-center text-xs pt-2">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-brass hover:underline font-semibold"
                  >
                    Register here
                  </button>
                </div>
              </motion.form>
            )}

            {/* MODE 2: REGISTER */}
            {mode === "register" && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="mono-label text-xs">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Dr. Sarah Jenkins"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 font-sans text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="mono-label text-xs">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="sarah@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 font-sans text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="mono-label text-xs">
                    Password (min 6 characters)
                  </Label>
                  <div className="relative">
                    <Lock className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 font-sans text-sm"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
                >
                  {loading ? "Creating Account..." : "Register & Get OTP →"}
                </Button>

                <div className="mono-label text-muted-foreground text-center text-xs pt-2">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="text-brass hover:underline font-semibold"
                  >
                    Sign In
                  </button>
                </div>
              </motion.form>
            )}

            {/* MODE 3: 6-DIGIT OTP VERIFICATION */}
            {mode === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="space-y-6 text-center"
              >
                <div className="bg-primary/10 border-primary/20 border p-4 rounded-lg flex items-center justify-center gap-3">
                  <KeyRound className="text-primary size-5" />
                  <p className="text-xs text-foreground font-mono">
                    Enter the 6-digit code sent to <strong>{email}</strong>
                  </p>
                </div>

                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={otp} onChange={(val: string) => setOtp(val)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="button"
                  disabled={loading || otp.length !== 6}
                  onClick={() => handleVerifyOtp()}
                  className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold"
                >
                  {loading ? "Verifying..." : "Verify Code & Activate →"}
                </Button>

                <div className="flex items-center justify-between text-xs font-mono pt-2">
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-muted-foreground hover:text-foreground underline"
                  >
                    Change email
                  </button>

                  <button
                    type="button"
                    disabled={!canResend || loading}
                    onClick={handleResendOtp}
                    className={`${
                      canResend ? "text-brass hover:underline cursor-pointer" : "text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {canResend ? "Resend OTP" : `Resend in ${resendTimer}s`}
                  </button>
                </div>
              </motion.div>
            )}

            {/* MODE 4: OPTIONAL PHONE NUMBER STEP */}
            {mode === "phone" && (
              <motion.form
                key="phone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handlePhoneSubmit}
                className="space-y-5"
              >
                <div className="bg-success/10 border-success/30 border p-3 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="text-success size-5 shrink-0" />
                  <p className="text-xs text-foreground font-mono">
                    Account verified! Add your phone number for emergency alerts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-input" className="mono-label text-xs">
                    Phone Number (Optional)
                  </Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute left-3 top-3 size-4" />
                    <Input
                      id="phone-input"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 font-sans text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground mono-label hover:opacity-90 w-full py-5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  Complete Setup <ArrowRight className="size-4" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
