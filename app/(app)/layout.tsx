"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loading } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import { useStoreUser } from "@/lib/useStoreUser";

const LINKS = [
  { href: "/tools", label: "Browse" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming requests" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, failed } = useStoreUser();
  const me = useQuery(api.users.me, ready ? {} : "skip");
  const pathname = usePathname();
  const links = me?.role === "admin" ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight text-brand-800">
            LendLoop
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 ${pathname.startsWith(l.href) ? "bg-brand-50 font-medium text-brand-800" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {ready && me ? (
          children
        ) : failed ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            We couldn&apos;t connect your account to LendLoop. Try signing out and in again. (Setting this up? Check
            Clerk&apos;s Convex integration, the email and name claims in Clerk&apos;s session token, and
            CLERK_JWT_ISSUER_DOMAIN on Convex: README, step 2.)
          </p>
        ) : (
          <Loading />
        )}
      </main>
    </div>
  );
}
