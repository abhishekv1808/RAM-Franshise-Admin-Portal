"use client";

import { Suspense, useState, type ElementType } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Building2,
  Users,
  CreditCard,
  MapPin,
  TrendingUp,
  Coins,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

/* Icons orbiting the brand mark on the showcase panel. */
const ORBIT: { Icon: ElementType; top: string; left: string; color: string }[] = [
  { Icon: Building2, top: "9%", left: "50%", color: "text-brand-navy" },
  { Icon: Users, top: "29%", left: "15%", color: "text-blue-600" },
  { Icon: CreditCard, top: "26%", left: "85%", color: "text-emerald-600" },
  { Icon: MapPin, top: "73%", left: "17%", color: "text-rose-500" },
  { Icon: TrendingUp, top: "91%", left: "55%", color: "text-violet-600" },
  { Icon: Coins, top: "69%", left: "84%", color: "text-brand-gold" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showForgot, setShowForgot] = useState(false);

  const queryError = searchParams.get("error");
  const initialError =
    queryError === "no-access"
      ? "This account doesn't have admin access. Contact the super admin."
      : queryError === "invite-invalid"
        ? "That invite link is invalid or has expired. Ask the super admin to resend it."
        : queryError === "suspended"
          ? "Your franchise access has been suspended. Contact head office."
          : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    // Middleware reads the role and routes to /dashboard or /franchise.
    const redirect = searchParams.get("redirect") || "/";
    router.replace(redirect);
    router.refresh();
  }

  const errorMessage = serverError ?? initialError;

  return (
    <div className="w-full max-w-sm">
      {/* Icon mark + heading */}
      <div className="mb-7 text-center">
        <div className="relative mx-auto mb-5 w-fit">
          <div
            className="absolute -inset-5 -z-10 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(#1b3a6b14 1px, transparent 1px), linear-gradient(90deg, #1b3a6b14 1px, transparent 1px)",
              backgroundSize: "18px 18px",
              maskImage: "radial-gradient(circle at center, black, transparent 72%)",
              WebkitMaskImage: "radial-gradient(circle at center, black, transparent 72%)",
            }}
          />
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-[#2d5495] text-white shadow-[0_8px_24px_rgba(27,58,107,0.35)]">
            <LogIn className="h-6 w-6" />
          </span>
        </div>
        <h1 className="font-heading text-[22px] font-bold tracking-tight text-foreground">
          Login to your account!
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Enter your registered email address and password to login!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errorMessage && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-2.5 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="eg. you@rightassetsmanagement.com"
              aria-invalid={!!errors.email}
              className="h-11 pl-10"
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              aria-invalid={!!errors.password}
              className="h-11 pl-10 pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {/* Remember + forgot */}
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-brand-navy"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowForgot((v) => !v)}
            className="text-[13px] font-semibold text-brand-navy transition-colors hover:text-brand-navy/70"
          >
            Forgot Password?
          </button>
        </div>

        {showForgot && (
          <p className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Accounts are provisioned by Head Office. Contact your super admin to receive a new
            set-password link.
          </p>
        )}

        <Button
          type="submit"
          className={cn(
            "h-11 w-full bg-brand-navy text-[15px] font-semibold text-white",
            "shadow-[0_2px_12px_rgba(27,58,107,0.25)] transition-all duration-150",
            "hover:bg-brand-navy/90 hover:shadow-[0_4px_18px_rgba(27,58,107,0.32)] active:scale-[0.99]",
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(27,58,107,0.16)]">
        {/* ── Form panel ── */}
        <div className="relative flex w-full flex-col px-6 py-8 sm:px-12 lg:w-[52%]">
          {/* Brand top-left */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border/60">
              <Image
                src="/images/logo.png"
                alt="Right Assets Management"
                width={36}
                height={36}
                priority
                className="h-full w-full object-contain p-0.5"
              />
            </span>
            <span className="font-heading text-sm font-bold tracking-tight text-brand-navy">
              RAM<span className="text-brand-gold"> Admin</span>
            </span>
          </div>

          {/* Centered form */}
          <div className="flex flex-1 items-center justify-center py-10">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        {/* ── Showcase panel (desktop) ── */}
        <div className="hidden p-3 lg:block lg:w-[48%]">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] bg-gradient-to-br from-[#eaf1fe] via-[#e3edfc] to-[#d9e5fb] p-9">
            {/* soft glows */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/50 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-brand-navy/[0.06] blur-3xl" />

            <h2 className="relative text-center font-heading text-[26px] font-extrabold tracking-tight text-brand-navy">
              Manage Smarter <span className="text-[#2d5495]">Everywhere</span>
            </h2>

            {/* Orbital illustration */}
            <div className="relative my-auto mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center">
              {/* rings */}
              <div className="absolute h-[40%] w-[40%] rounded-full border border-brand-navy/10" />
              <div className="absolute h-[68%] w-[68%] rounded-full border border-brand-navy/[0.08]" />
              <div className="absolute h-[96%] w-[96%] rounded-full border border-brand-navy/[0.06]" />

              {/* orbiting chips */}
              {ORBIT.map(({ Icon, top, left, color }, i) => (
                <span
                  key={i}
                  style={{ top, left }}
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white shadow-[0_6px_20px_rgba(27,58,107,0.13)] ring-1 ring-black/[0.03]"
                >
                  <Icon className={cn("h-5 w-5", color)} />
                </span>
              ))}

              {/* center brand mark */}
              <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[18px] bg-white shadow-[0_12px_40px_rgba(27,58,107,0.22)] ring-1 ring-black/[0.04]">
                <Image
                  src="/images/logo.png"
                  alt="Right Assets Management"
                  width={80}
                  height={80}
                  priority
                  className="h-full w-full object-contain p-2.5"
                />
              </span>
            </div>

            {/* caption */}
            <p className="relative mx-auto max-w-sm text-center text-sm leading-relaxed text-slate-500">
              Manage <strong className="font-semibold text-slate-700">franchises, leads, payments</strong>{" "}
              and commissions from one secure command center.
            </p>

            {/* carousel dots */}
            <div className="relative mt-5 flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-6 rounded-full bg-brand-navy" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-navy/25" />
              <span className="h-1.5 w-1.5 rounded-full bg-brand-navy/25" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
