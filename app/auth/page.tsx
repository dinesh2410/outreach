"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { Sparkles, Star } from "@/components/shared/Icon";

type Mode = "signin" | "signup";

// Only let internal paths through — block external URLs from being passed via ?next
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const [mode, setMode] = useState<Mode>("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const toast = useToast();
  const { user, signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) router.push(next);
  }, [user, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(firstName, lastName, email, password);
      }
      router.push(next);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push(next);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Left band — brand + value prop */}
      <aside
        className="hidden lg:flex flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ backgroundColor: "#D7E5FB" }}
      >
        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="eyebrow mb-5">Post-build · Made for makers</p>
          <h2 className="text-[44px] xl:text-[52px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
            Ship listings your app actually deserves.
          </h2>
          <p className="mt-6 text-[16px] text-ink leading-relaxed max-w-md">
            Generate store-ready descriptions, audit your listing, and stop fighting
            the blank page. Free for your first listing — no credit card needed.
          </p>

          <div className="mt-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-ink/10">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
              style={{ backgroundColor: "#0B3D7A" }}
            >
              O
            </div>
            <span className="text-[14px] font-semibold text-ink">4.8</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={13} fill="#0B3D7A" stroke="#0B3D7A" />
              ))}
            </div>
            <span className="text-[13px] text-ink-muted ml-1">Loved by 8,000+ makers</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[12px] text-ink-muted">
            &copy; 2026 ReachFront · Made for indie makers.
          </p>
        </div>
      </aside>

      {/* Right column — form */}
      <main className="flex items-center justify-center px-6 py-12 lg:py-10 bg-white">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: "#F2ECFE" }}>
            <Sparkles size={13} style={{ color: "#5B3FB8" }} />
            <span className="text-[12px] font-medium" style={{ color: "#5B3FB8" }}>
              {mode === "signin" ? "Welcome back" : "Start free"}
            </span>
          </div>

          <h1 className="text-[36px] lg:text-[44px] font-semibold text-ink leading-[1.05] tracking-[-0.02em]">
            {mode === "signin" ? "Sign back in." : "Create your account."}
          </h1>
          <p className="mt-3 text-[15px] text-ink-muted">
            {mode === "signin"
              ? "Pick up where you left off — your history is right where you parked it."
              : "Generate your first keyword-optimized listing in under a minute."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="mt-8 w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-line rounded-full text-ink text-[14px] font-medium hover:bg-cream-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] text-ink-faint uppercase tracking-wider">or with email</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Alex" required />
                <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Chen" required />
              </div>
            )}

            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="alex@example.com" required />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              required
              minLength={mode === "signup" ? 8 : undefined}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-ink text-white text-[15px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? mode === "signin" ? "Signing in…" : "Creating account…"
                : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-ink-muted">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold hover:underline"
                  style={{ color: "#0B3D7A" }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold hover:underline"
                  style={{ color: "#0B3D7A" }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="mt-6 text-center text-[11px] text-ink-faint">
            <Link href="/" className="hover:text-ink transition-colors">← Back to home</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-muted mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint transition-colors"
      />
    </div>
  );
}
