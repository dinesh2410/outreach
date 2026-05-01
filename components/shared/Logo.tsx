import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="9" height="9" rx="2" fill="#0A0A0A" />
        <rect x="13" y="0" width="9" height="9" rx="2" fill="#0A0A0A" />
        <rect x="0" y="13" width="9" height="9" rx="2" fill="#0A0A0A" />
      </svg>
      <span className="font-semibold text-[15px] text-ink tracking-tight">
        Outreach
      </span>
    </Link>
  );
}
