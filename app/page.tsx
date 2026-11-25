import { preloadQuery } from "convex/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { PublicToolList } from "./PublicToolList";
import { SignInCta } from "./SignInCta";

// Rendered per request on the server (fresh list, no owner data ever reaches the browser), then
// kept live by Convex on the client.
export const dynamic = "force-dynamic";

export default async function Home() {
  const preloaded = await preloadQuery(api.tools.listPublic, {});
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-20">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand-800">
          LendLoop
        </Link>
      </header>
      <section className="mt-16 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Borrow what you need. Lend what you don&apos;t.</h1>
        <p className="mt-4 text-lg text-stone-600">
          Your neighbors already own the ladder, the drill and the camping stove. Ask to borrow them for a few days, lend yours
          back, and get a reminder when something is due.
        </p>
        <div className="mt-8">
          <SignInCta />
        </div>
      </section>
      <section className="mt-16">
        <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Available now</h2>
        <PublicToolList preloaded={preloaded} />
      </section>
    </main>
  );
}
