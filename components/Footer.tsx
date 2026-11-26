import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/service-levels", label: "Service levels" },
  { href: "/security", label: "Security" },
];

/** Every page's footer: the legal and trust pages, and what LendLoop is. */
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-hairline pt-7 pb-9 text-[14px] text-slate ${className}`}>
      <span>LendLoop, a neighbourhood lending board. A fictional company in a sample project.</span>
      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-ink">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
