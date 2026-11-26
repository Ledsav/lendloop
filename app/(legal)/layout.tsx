import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/loop/Logo";

/** The legal and trust pages: public, static, one readable column. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[760px] px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Link href="/" aria-label="LendLoop, home">
          <Logo />
        </Link>
        <Link href="/" className="text-[15px] font-medium text-slate hover:text-ink">
          ‹ Back to LendLoop
        </Link>
      </header>
      <main className="pt-4 pb-16">{children}</main>
      <Footer />
    </div>
  );
}
