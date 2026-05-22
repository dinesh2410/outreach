"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useAuth } from "@/lib/auth";
import { fetchAllUsers } from "@/lib/firestore";
import { isAdmin } from "@/lib/admins";
import type { User } from "@/lib/types";
import {
  Users,
  RefreshCcw,
  AlertCircle,
  Search,
  Check,
  Clock,
} from "@/components/shared/Icon";

type UserWithCreatedAt = User & { createdAt?: string };

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithCreatedAt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/auth?next=/admin/users"); return; }
    if (!isAdmin(user.email)) { router.replace("/dashboard"); }
  }, [user, loading, router]);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const all = await fetchAllUsers();
      setUsers(all as UserWithCreatedAt[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin(user?.email)) load();
  }, [user]);

  if (loading || !user || !isAdmin(user.email)) return null;

  const filtered = users?.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.plan.toLowerCase().includes(q)
    );
  });

  const planCounts = users
    ? {
        free: users.filter((u) => u.plan === "free").length,
        trial: users.filter((u) => u.plan === "trial").length,
        pro: users.filter((u) => u.plan === "pro").length,
        max: users.filter((u) => u.plan === "max").length,
      }
    : null;

  return (
    <AppShell
      eyebrow="Admin · User management"
      title="Users"
      description="All registered users, their plans, and account details."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-[13px] font-medium hover:bg-night-soft transition-colors disabled:opacity-60"
        >
          <RefreshCcw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      }
    >
      {error && (
        <div className="card-soft p-5 mb-4 flex items-start gap-3 border border-rose-200/50">
          <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[14px] font-medium text-ink">Could not load users</p>
            <p className="text-[13px] text-ink-muted mt-1">{error}</p>
            <p className="text-[12px] text-ink-faint mt-2">
              You may need to update Firestore rules to allow admin reads on the <code className="px-1 py-0.5 bg-line-soft rounded">users</code> collection.
            </p>
          </div>
        </div>
      )}

      {!users ? (
        <div className="card-soft p-10 text-center text-ink-faint text-[14px]">Loading users…</div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <StatTile label="Total users" value={users.length} tile="tile-blue" />
            <StatTile label="Free" value={planCounts!.free} tile="tile-cream" />
            <StatTile label="Trial" value={planCounts!.trial} tile="tile-lilac" />
            <StatTile label="Pro" value={planCounts!.pro} tile="tile-mint" />
            <StatTile label="Max" value={planCounts!.max} tile="tile-peach" />
          </div>

          {/* Search */}
          <div className="card-soft overflow-hidden">
            <div className="flex items-center gap-3 px-6 h-14 border-b border-line-soft">
              <Search size={14} className="text-ink-faint shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or plan…"
                className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
              <span className="text-[12px] text-ink-faint shrink-0">
                {filtered?.length ?? 0} user{(filtered?.length ?? 0) === 1 ? "" : "s"}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-ink-faint border-b border-line-soft">
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                    <th className="px-6 py-3 font-medium">Expires</th>
                    <th className="px-6 py-3 font-medium">Coupon</th>
                    <th className="px-6 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((u) => (
                    <tr key={u.id} className="border-b border-line-soft last:border-0 hover:bg-blue-50/30">
                      <td className="px-6 py-3 text-ink font-medium whitespace-nowrap">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-6 py-3 text-ink-muted truncate max-w-[260px]" title={u.email}>
                        {u.email}
                      </td>
                      <td className="px-6 py-3">
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td className="px-6 py-3 text-ink-muted whitespace-nowrap">
                        {u.planExpiresAt ? formatDate(u.planExpiresAt) : "—"}
                      </td>
                      <td className="px-6 py-3 text-ink-muted">
                        {u.couponCode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
                            {u.couponCode}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-3 text-ink-muted whitespace-nowrap">
                        {u.createdAt ? formatDate(u.createdAt) : "—"}
                      </td>
                    </tr>
                  ))}
                  {filtered?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-ink-faint">
                        No users match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function StatTile({ label, value, tile }: { label: string; value: number; tile: string }) {
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
    free: { bg: "bg-gray-100", text: "text-gray-600" },
    trial: { bg: "bg-purple-50", text: "text-purple-700" },
    pro: { bg: "bg-emerald-50", text: "text-emerald-700" },
    max: { bg: "bg-blue-50", text: "text-blue-700" },
  };
  const s = styles[plan] ?? styles.free;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${s.bg} ${s.text}`}>
      {plan}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
