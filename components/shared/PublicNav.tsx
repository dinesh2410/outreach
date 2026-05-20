"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { FeaturesMenu } from "./FeaturesMenu";
import { useAuth } from "@/lib/auth";
import { Globe, LayoutDashboard, Menu, X } from "@/components/shared/Icon";
import { useState } from "react";
import { FEATURES } from "@/lib/features";

const NAV_LINKS = [
  { href: "/score", label: "Score Checker" },
  { href: "/about", label: "About" },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const isAuthed = !!user && !loading;

  return (
    <nav className="absolute top-0 left-0 right-0 z-40">
      <div className="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Logo />

          <div className="hidden lg:flex items-center gap-8">
            <FeaturesMenu />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15px] font-medium transition-colors ${
                  pathname === link.href
                    ? "text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-5">
          <button
            aria-label="Language"
            className="text-ink hover:opacity-70 transition-opacity"
          >
            <Globe size={20} strokeWidth={1.75} />
          </button>
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="btn-pill-dark gap-2 px-5 py-2.5 text-[15px]"
            >
              <LayoutDashboard size={15} strokeWidth={2} />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth"
                className="text-[15px] font-medium text-ink underline underline-offset-4 hover:opacity-70 transition-opacity"
              >
                Sign in
              </Link>
              <Link
                href="/auth"
                className="btn-pill-dark px-5 py-2.5 text-[15px]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 text-ink"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-white border-t border-line-soft px-6 py-5 space-y-4">
          <p className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1">
            Features
          </p>
          {FEATURES.map((f) => (
            <Link
              key={f.slug}
              href={f.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-ink-muted hover:text-ink"
            >
              <span>{f.name}</span>
              {f.status === "soon" && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gold/10 text-gold uppercase">
                  Soon
                </span>
              )}
            </Link>
          ))}

          <div className="pt-3 border-t border-line-soft" />

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block text-[15px] font-medium ${
                pathname === link.href ? "text-ink" : "text-ink-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-line-soft flex flex-col gap-3">
            {isAuthed ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-full bg-ink text-white text-[15px] font-medium text-center inline-flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={15} strokeWidth={2} />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-full border-[1.5px] border-ink text-[15px] font-medium text-ink text-center"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-ink text-white text-[15px] font-medium text-center"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
