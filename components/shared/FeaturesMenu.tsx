"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FEATURES } from "@/lib/features";

// Dropdown menu rendered inside the public nav.
// - Click the trigger to toggle, or hover the trigger area to open
// - Outside-click and Escape close it
// - Live features link straight to their pages (/generator, /score)
// - "Coming soon" features link to /features/[slug] stub pages

export function FeaturesMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Hover intent — small delay before closing avoids flicker when moving from trigger to menu
  const onEnter = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const onLeave = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const isFeatureRoute = pathname?.startsWith("/features") || pathname === "/generator" || pathname === "/score";

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-1 text-sm font-medium transition-colors ${
          isFeatureRoute ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        Features
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[420px] origin-top animate-fade-up"
          style={{ animationDelay: "0s" }}
        >
          <div className="rounded-2xl bg-surface/95 backdrop-blur-md border border-line-soft shadow-[0_12px_32px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] p-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.slug}
                  href={feature.href}
                  role="menuitem"
                  className="group flex items-start gap-3 p-3 rounded-xl hover:bg-cream-deep/60 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">
                        {feature.name}
                      </span>
                      {feature.status === "soon" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold uppercase tracking-wide">
                          Soon
                        </span>
                      )}
                      {feature.status === "live" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green/10 text-green uppercase tracking-wide">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                      {feature.tagline}
                    </p>
                  </div>
                </Link>
              );
            })}

            <div className="border-t border-line-soft mt-1 pt-1">
              <Link
                href="/features"
                role="menuitem"
                className="flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium text-ink-muted hover:text-ink hover:bg-cream-deep/60 transition-colors"
              >
                View all features
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
