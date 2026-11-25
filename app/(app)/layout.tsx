"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/loop/Logo";
import { ErrorText, RowSkeleton } from "@/components/states";
import { api } from "@/convex/_generated/api";
import { useStoreUser } from "@/lib/useStoreUser";

const LINKS = [
  { href: "/tools", label: "Things to borrow" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming requests" },
];

function NavLinks({ links, pathname, className }: { links: typeof LINKS; pathname: string; className: string }) {
  return (
    <nav aria-label="Main" className={className}>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-full items-center text-[15px] whitespace-nowrap ${active ? "font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-ink)]" : "font-medium text-slate hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, failed } = useStoreUser();
  const me = useQuery(api.users.me, ready ? {} : "skip");
  const pathname = usePathname();
  const links = me?.role === "admin" ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[960px] items-center gap-9 px-4 sm:px-6">
          <Link href="/tools" aria-label="LendLoop, things to borrow" className="shrink-0">
            <Logo />
          </Link>
          <NavLinks links={links} pathname={pathname} className="hidden h-full gap-6 md:flex" />
          <div className="ml-auto flex items-center">
            <UserButton />
          </div>
        </div>
        <NavLinks
          links={links}
          pathname={pathname}
          className="flex h-11 gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 md:hidden"
        />
      </header>
      <main className="mx-auto max-w-[960px] px-4 pt-7 pb-16 sm:px-6">
        {ready && me ? (
          children
        ) : failed ? (
          <ErrorText>
            We couldn&apos;t connect your account to LendLoop. Try signing out and in again. (Setting this up? Check
            Clerk&apos;s Convex integration, the email and name claims in Clerk&apos;s session token, and
            CLERK_JWT_ISSUER_DOMAIN on Convex: README, step 2.)
          </ErrorText>
        ) : (
          <RowSkeleton rows={6} />
        )}
      </main>
    </div>
  );
}
