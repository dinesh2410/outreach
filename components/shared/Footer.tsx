import Link from "next/link";
import { Logo } from "./Logo";

const PRODUCT_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/score", label: "Score Checker" },
  { href: "/generator", label: "Generator" },
  { href: "/library", label: "Library" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/auth", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="border-t border-line-soft bg-cream">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-ink-muted max-w-sm leading-relaxed">
              The post-build platform for indie app makers. Everything after
              &ldquo;build&rdquo; &mdash; starting with descriptions today.
            </p>
            <a
              href="mailto:hello@outreach.app"
              className="mt-6 inline-block text-base font-medium text-ink hover:text-ink-muted transition-colors"
            >
              hello@outreach.app
            </a>
          </div>

          <div>
            <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-line-soft flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-ink-faint">
            &copy; 2026 Outreach &middot; Made for indie devs.
          </p>
        </div>
      </div>
    </footer>
  );
}
