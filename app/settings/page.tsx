"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/shared/AppNav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/shared/ToastProvider";
import { Platform } from "@/lib/types";

export default function SettingsPage() {
  const { user, updateUser, savedGenerations } = useAuth();
  const router = useRouter();
  const { push } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth");
      return;
    }
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
  }, [user, router]);

  if (!user) return null;

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateUser({ firstName, lastName, email });
    push("Profile updated", "success");
  }

  function handleExport() {
    const data = JSON.stringify(savedGenerations, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outreach-generations.json";
    a.click();
    URL.revokeObjectURL(url);
    push("Exported all generations", "success");
  }

  return (
    <>
      <AppNav />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold text-ink mb-8 animate-fade-up">
          Settings
        </h1>

        {/* Profile */}
        <div className="bg-surface rounded-3xl border border-line p-6 mb-6 animate-fade-up delay-100">
          <h2 className="font-semibold text-ink mb-4">Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1.5">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm"
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
                  className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-cream border border-line text-ink focus:outline-none focus:border-accent text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-deep transition-colors text-sm"
            >
              Save changes
            </button>
          </form>
        </div>

        {/* Preferences */}
        <div className="bg-surface rounded-3xl border border-line p-6 mb-6 animate-fade-up delay-200">
          <h2 className="font-semibold text-ink mb-4">Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">Default platform</p>
                <p className="text-xs text-ink-muted">
                  Pre-select this platform in the generator
                </p>
              </div>
              <div className="flex gap-1 bg-cream rounded-xl border border-line p-1">
                {(["android", "ios"] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateUser({ defaultPlatform: p })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      user.defaultPlatform === p
                        ? "bg-accent text-white"
                        : "text-ink-muted"
                    }`}
                  >
                    {p === "android" ? "Android" : "iOS"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">
                  Email notifications
                </p>
                <p className="text-xs text-ink-muted">
                  Get notified about new features and tools
                </p>
              </div>
              <button
                onClick={() =>
                  updateUser({
                    emailNotifications: !user.emailNotifications,
                  })
                }
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  user.emailNotifications ? "bg-accent" : "bg-line"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    user.emailNotifications ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bg-surface rounded-3xl border border-line p-6 animate-fade-up delay-300">
          <h2 className="font-semibold text-ink mb-4">Account</h2>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-cream text-ink font-medium rounded-xl border border-line hover:border-ink-faint transition-colors text-sm"
          >
            Export all generations
          </button>
        </div>
      </main>
    </>
  );
}
