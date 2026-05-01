"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { useAuth } from "@/lib/auth";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { signIn, signUp } = useAuth();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signin") {
      signIn(email, password);
    } else {
      signUp(firstName, lastName, email, password);
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-8">
          <Logo className="justify-center mb-6" />
          <h1 className="text-2xl font-semibold text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-ink-muted mt-2">
            {mode === "signin"
              ? "Sign in to access your dashboard"
              : "Start generating better listings in under a minute"}
          </p>
        </div>

        <div className="bg-surface rounded-3xl border border-line p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
                    placeholder="Chen"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
                placeholder="alex@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-surface px-3 text-ink-faint">or</span>
            </div>
          </div>

          <button className="mt-4 w-full py-3 bg-cream text-ink font-medium rounded-xl border border-line hover:border-ink-faint transition-colors text-sm">
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-accent font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-accent font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
