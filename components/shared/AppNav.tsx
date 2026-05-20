"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { LayoutDashboard, Wand2, History, BookOpen, Settings, LogOut, Menu, X } from "@/components/shared/Icon";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generator", label: "Generator", icon: Wand2 },
  { href: "/history", label: "History", icon: History },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-line-soft">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {APP_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          <div className="w-px h-6 bg-line" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-accent">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <button
              onClick={signOut}
              className="text-sm text-ink-muted hover:text-accent transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-ink-muted"
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-cream border-b border-line-soft px-6 py-4 space-y-3">
          {APP_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 text-sm font-medium ${
                  pathname === link.href ? "text-accent" : "text-ink-muted"
                }`}
              >
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              signOut();
              setOpen(false);
            }}
            className="flex items-center gap-2 text-sm text-ink-muted"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}
