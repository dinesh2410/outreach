"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchAllCoupons, fetchCouponRedemptions } from "@/lib/firestore";
import { isAdmin } from "@/lib/admins";
import type { CouponCode, CouponRedemption } from "@/lib/types";
import {
  Key,
  Plus,
  RefreshCcw,
  AlertCircle,
  Check,
  X,
  Loader2,
  Copy,
} from "@/components/shared/Icon";
import { useToast } from "@/components/shared/ToastProvider";

export default function AdminCouponsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { push } = useToast();
  const [coupons, setCoupons] = useState<CouponCode[] | null>(null);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth?next=/admin/coupons"); return; }
    if (!isAdmin(user.email)) { router.replace("/dashboard"); }
  }, [user, loading, router]);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const [c, r] = await Promise.all([fetchAllCoupons(), fetchCouponRedemptions()]);
      setCoupons(c);
      setRedemptions(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin(user?.email)) load();
  }, [user]);

  if (loading || !user || !isAdmin(user.email)) return null;

  const totalRedeemed = coupons?.reduce((s, c) => s + c.redemptions, 0) ?? 0;
  const activeCoupons = coupons?.filter((c) => c.active).length ?? 0;

  return (
    <AppShell
      eyebrow="Admin · Coupon management"
      title="Coupons"
      description="Create and manage discount and beta access coupon codes."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors"
          >
            <Plus size={13} />
            Create coupon
          </button>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-deep text-ink text-[13px] font-medium hover:bg-ink hover:text-white transition-colors disabled:opacity-60"
          >
            <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      {error && (
        <div className="card-soft p-5 mb-4 flex items-start gap-3 border border-rose-200/50">
          <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-ink">Could not load coupons</p>
            <p className="text-[13px] text-ink-muted mt-1">{error}</p>
            <p className="text-[12px] text-ink-faint mt-2">
              You may need to update Firestore rules to allow admin reads on the <code className="px-1 py-0.5 bg-line-soft rounded">coupons</code> and <code className="px-1 py-0.5 bg-line-soft rounded">couponRedemptions</code> collections.
            </p>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateCouponForm
          adminEmail={user.email}
          onCreated={() => { setShowCreate(false); load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {!coupons ? (
        <div className="card-soft p-10 text-center text-ink-faint text-[14px]">Loading coupons…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatTile label="Total coupons" value={String(coupons.length)} tile="tile-blue" />
            <StatTile label="Active" value={String(activeCoupons)} tile="tile-mint" />
            <StatTile label="Total redeemed" value={String(totalRedeemed)} tile="tile-lilac" />
            <StatTile label="Redemption records" value={String(redemptions.length)} tile="tile-peach" />
          </div>

          {/* Coupon list */}
          <section className="card-soft overflow-hidden mb-4">
            <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
              <h2 className="text-[15px] font-semibold text-ink">All coupons</h2>
              <span className="text-[12px] text-ink-faint">{coupons.length} total</span>
            </header>

            {coupons.length === 0 ? (
              <div className="px-6 py-8 text-center text-ink-faint text-[13px]">
                No coupons created yet. Click "Create coupon" to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-ink-faint border-b border-line-soft">
                      <th className="px-6 py-3 font-medium">Code</th>
                      <th className="px-6 py-3 font-medium">Plan</th>
                      <th className="px-6 py-3 font-medium">Duration</th>
                      <th className="px-6 py-3 font-medium text-center">Redeemed</th>
                      <th className="px-6 py-3 font-medium text-center">Status</th>
                      <th className="px-6 py-3 font-medium">Note</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <CouponRow key={c.id} coupon={c} onCopy={(code) => { navigator.clipboard.writeText(code); push("Copied!", "success"); }} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent redemptions */}
          {redemptions.length > 0 && (
            <section className="card-soft overflow-hidden">
              <header className="flex items-center justify-between px-6 h-14 border-b border-line-soft">
                <h2 className="text-[15px] font-semibold text-ink">Recent redemptions</h2>
                <span className="text-[12px] text-ink-faint">{redemptions.length} total</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-ink-faint border-b border-line-soft">
                      <th className="px-6 py-3 font-medium">Coupon</th>
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Plan</th>
                      <th className="px-6 py-3 font-medium">Duration</th>
                      <th className="px-6 py-3 font-medium">Redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-line-soft last:border-0 hover:bg-blue-50/30">
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 font-mono text-[12px] font-semibold text-ink">
                            {r.couponId}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-ink-muted truncate max-w-[240px]" title={r.userEmail}>
                          {r.userEmail || r.userId.slice(0, 10)}
                        </td>
                        <td className="px-6 py-3">
                          <PlanBadge plan={r.plan} />
                        </td>
                        <td className="px-6 py-3 text-ink-muted">
                          {r.durationDays > 0 ? `${r.durationDays} days` : "Forever"}
                        </td>
                        <td className="px-6 py-3 text-ink-muted whitespace-nowrap">
                          {formatDate(r.redeemedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}

function CouponRow({ coupon: c, onCopy }: { coupon: CouponCode; onCopy: (code: string) => void }) {
  const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
  const isFull = c.maxRedemptions > 0 && c.redemptions >= c.maxRedemptions;

  return (
    <tr className="border-b border-line-soft last:border-0 hover:bg-blue-50/30">
      <td className="px-6 py-3">
        <button
          onClick={() => onCopy(c.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors font-mono text-[12px] font-semibold text-ink"
        >
          {c.id}
          <Copy size={11} className="text-ink-faint" />
        </button>
      </td>
      <td className="px-6 py-3">
        <PlanBadge plan={c.plan} />
      </td>
      <td className="px-6 py-3 text-ink-muted">
        {c.durationDays > 0 ? `${c.durationDays} days` : "Forever"}
      </td>
      <td className="px-6 py-3 text-center">
        <span className="tabular-nums font-semibold" style={{ color: "#0B3D7A" }}>
          {c.redemptions}
        </span>
        <span className="text-ink-faint">/{c.maxRedemptions || "∞"}</span>
      </td>
      <td className="px-6 py-3 text-center">
        {!c.active ? (
          <StatusBadge label="Disabled" color="gray" />
        ) : isExpired ? (
          <StatusBadge label="Expired" color="red" />
        ) : isFull ? (
          <StatusBadge label="Limit reached" color="amber" />
        ) : (
          <StatusBadge label="Active" color="green" />
        )}
      </td>
      <td className="px-6 py-3 text-ink-muted truncate max-w-[200px]" title={c.note}>
        {c.note || "—"}
      </td>
      <td className="px-6 py-3 text-ink-muted whitespace-nowrap">
        {formatDate(c.createdAt)}
      </td>
    </tr>
  );
}

function CreateCouponForm({
  adminEmail,
  onCreated,
  onCancel,
}: {
  adminEmail: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { push } = useToast();
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<"pro" | "max">("pro");
  const [durationDays, setDurationDays] = useState(30);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          plan,
          durationDays,
          maxRedemptions,
          note: note.trim(),
          adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        push(data.error ?? "Failed to create coupon");
        return;
      }
      push(`Coupon "${data.coupon.id}" created!`, "success");
      onCreated();
    } catch {
      push("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-soft p-6 mb-4 border-2 border-blue-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl tile-blue flex items-center justify-center">
            <Plus size={16} strokeWidth={1.85} />
          </div>
          <h3 className="text-[16px] font-semibold text-ink">Create new coupon</h3>
        </div>
        <button onClick={onCancel} className="text-ink-faint hover:text-ink transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Coupon code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. BETA2024"
            required
            minLength={4}
            className="w-full px-4 py-2.5 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint uppercase tracking-wider"
          />
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Plan</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPlan("pro")}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                plan === "pro" ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300" : "bg-cream-deep text-ink-muted hover:text-ink"
              }`}
            >
              Pro
            </button>
            <button
              type="button"
              onClick={() => setPlan("max")}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                plan === "max" ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "bg-cream-deep text-ink-muted hover:text-ink"
              }`}
            >
              Max
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Duration (days)</label>
          <input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            className="w-full px-4 py-2.5 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink tabular-nums"
          />
          <p className="text-[11px] text-ink-faint mt-1">0 = forever</p>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Max redemptions</label>
          <input
            type="number"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="w-full px-4 py-2.5 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink tabular-nums"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[12px] font-medium text-ink-muted mb-1.5">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Beta testers batch 1"
            className="w-full px-4 py-2.5 rounded-xl bg-cream-deep border border-transparent focus:border-ink-faint outline-none text-[14px] text-ink placeholder:text-ink-faint"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-full text-[13px] font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Check size={13} />
                Create coupon
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function StatTile({ label, value, tile }: { label: string; value: string; tile: string }) {
  return (
    <div className="card-soft p-5">
      <p className="eyebrow text-[11px] tracking-[0.15em] mb-2">{label}</p>
      <span
        className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums"
        style={{ color: "#0B3D7A" }}
      >
        {value}
      </span>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; text: string }> = {
    pro: { bg: "bg-emerald-50", text: "text-emerald-700" },
    max: { bg: "bg-blue-50", text: "text-blue-700" },
  };
  const s = styles[plan] ?? { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ label, color }: { label: string; color: "green" | "red" | "amber" | "gray" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-700",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${styles[color]}`}>
      {label}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
