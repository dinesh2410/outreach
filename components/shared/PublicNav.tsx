"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { FeaturesMenu } from "./FeaturesMenu";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { FEATURES } from "@/lib/features";

// Desktop nav links other than the Features dropdown.
// Keep this short — the Features menu now houses the per-feature pages.
const NAV_LINKS = [
  { href: "/score", label: "Score Checker" },
  { href: "/about", label: "About" },
];

export function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-cream/30 backdrop-blur-[6px]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop centered nav */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <FeaturesMenu />
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Sign in
          </Link>
          <Link href="/auth" className="btn-pill-dark !py-2 !pl-4 !pr-4 text-sm">
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-ink"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-cream border-t border-line-soft px-6 py-4 space-y-3">
          {/* Features list flattened into the mobile drawer */}
          <p className="text-[11px] font-mono uppercase tracking-wide text-ink-faint mb-1">
            Features
          </p>
          {FEATURES.map((feature) => (
            <Link
              key={feature.slug}
              href={feature.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-ink-muted hover:text-ink"
            >
              <span>{feature.name}</span>
              {feature.status === "soon" && (
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
              className={`block text-sm font-medium ${
                pathname === link.href ? "text-ink" : "text-ink-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="btn-pill-dark w-full justify-center !py-2.5"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
