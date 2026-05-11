"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
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
    <AppShell
      eyebrow="Account · Settings"
      title="Tune your workspace"
      description="Profile details, defaults for the generator, and a one-click export of everything you've saved."
    >
      <div className="max-w-2xl space-y-4">
        {/* Profile */}
        <section className="card-soft p-7">
          <h2 className="text-[16px] font-semibold text-ink mb-5">Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink-muted mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-muted mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-ink-muted mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-full bg-ink text-white text-[14px] font-medium hover:bg-night-soft transition-colors"
            >
              Save changes
            </button>
          </form>
        </section>

        {/* Preferences */}
        <section className="card-soft p-7">
          <h2 className="text-[16px] font-semibold text-ink mb-5">Preferences</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-ink">Default platform</p>
                <p className="text-[12px] text-ink-muted mt-0.5">
                  Pre-select this platform in the generator
                </p>
              </div>
              <div className="flex gap-1 bg-cream-deep rounded-full p-1 shrink-0">
                {(["android", "ios"] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateUser({ defaultPlatform: p })}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                      user.defaultPlatform === p
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {p === "android" ? "Android" : "iOS"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-ink">
                  Email notifications
                </p>
                <p className="text-[12px] text-ink-muted mt-0.5">
                  Get notified about new features and tools
                </p>
              </div>
              <button
                onClick={() =>
                  updateUser({
                    emailNotifications: !user.emailNotifications,
                  })
                }
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  user.emailNotifications ? "" : "bg-line"
                }`}
                style={user.emailNotifications ? { backgroundColor: "#2563EB" } : undefined}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    user.emailNotifications ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="card-soft p-7">
          <h2 className="text-[16px] font-semibold text-ink mb-5">Your data</h2>
          <p className="text-[13px] text-ink-muted mb-5">
            Download every saved variant as a single JSON file — keep a copy or move it elsewhere.
          </p>
          <button
            onClick={handleExport}
            className="px-5 py-3 rounded-full border border-ink text-[14px] font-medium text-ink hover:bg-ink hover:text-white transition-colors"
          >
            Export all generations
          </button>
        </section>
      </div>
    </AppShell>
  );
}
