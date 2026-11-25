"use client";

import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loading } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { useStoreUser } from "@/lib/useStoreUser";

const LINKS = [
  { href: "/tools", label: "Browse" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming requests" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const ready = useStoreUser();
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
      <main className="mx-auto max-w-5xl px-4 py-8">{ready && me ? children : <Loading />}</main>
    </div>
  );
}
