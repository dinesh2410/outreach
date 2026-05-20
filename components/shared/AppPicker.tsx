"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { proxiedIcon } from "@/lib/icon-proxy";
import type { MyApp } from "@/lib/types";
import { Apple, Smartphone, ChevronDown, Plus } from "@/components/shared/Icon";

// Reusable picker for "Your applications". Renders a button that opens a
// popover listing the user's saved apps. Click an app → onSelect fires with
// the full MyApp record. When the user has no saved apps, the popover shows
// a CTA pointing at /apps.
//
// Designed to drop into any URL/app input slot across the workspace tools.
export function AppPicker({
  onSelect,
  buttonLabel = "Pick from your apps",
  align = "left",
}: {
  onSelect: (app: MyApp) => void;
  buttonLabel?: string;
  align?: "left" | "right";
}) {
  const { myApps } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-line text-[13px] font-medium text-ink-muted hover:text-ink hover:border-ink-faint transition-colors bg-surface"
      >
        <Smartphone size={13} strokeWidth={1.85} />
        {buttonLabel}
        {myApps.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent tabular-nums">
            {myApps.length}
          </span>
        )}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`absolute z-40 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl bg-surface border border-line shadow-xl p-2 ${
              align === "right" ? "right-0" : "left-0"
            }`}
            role="menu"
          >
            {myApps.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-[13px] font-medium text-ink mb-1">No saved apps yet</p>
                <p className="text-[12px] text-ink-muted mb-4">
                  Save an app once and you can pick it here every time.
                </p>
                <Link
                  href="/apps"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-white text-[12px] font-medium hover:bg-night-soft transition-colors"
                >
                  <Plus size={12} />
                  Add an app
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {myApps.map((app) => (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(app);
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-deep text-left transition-colors"
                      >
                        <AppIcon app={app} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-ink truncate">{app.name}</p>
                          <p className="text-[11px] text-ink-faint truncate inline-flex items-center gap-1">
                            {app.source === "ios" ? <Apple size={9} /> : <Smartphone size={9} />}
                            {app.source === "ios" ? "App Store" : "Play Store"}
                            {app.developer ? ` · ${app.developer}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 pt-2 border-t border-line-soft">
                  <Link
                    href="/apps"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-ink-muted hover:text-ink hover:bg-cream-deep transition-colors"
                  >
                    <Plus size={12} />
                    Manage your apps
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AppIcon({ app }: { app: MyApp }) {
  const iconSrc = proxiedIcon(app.iconUrl);
  if (iconSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconSrc}
        alt={app.name}
        className="w-9 h-9 rounded-xl shrink-0 bg-cream-deep object-cover"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl tile-blue flex items-center justify-center shrink-0 font-bold text-[12px]">
      {(app.name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}
