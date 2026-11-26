import { preloadQuery } from "convex/nextjs";
import { Footer } from "@/components/Footer";
import { Drawing } from "@/components/items/drawings";
import { Logo } from "@/components/loop/Logo";
import { StageDial } from "@/components/loop/StageDial";
import { StepRing } from "@/components/loop/StepRing";
import { api } from "@/convex/_generated/api";
import { PublicToolList } from "./PublicToolList";
import { NavSignIn, SignInCta } from "./SignInCta";

// Rendered per request on the server (fresh list, no owner data ever reaches the browser), then
// kept live by Convex on the client.
export const dynamic = "force-dynamic";

const STEPS = [
  { fraction: 0.1, title: "Ask for dates", text: "Pick the days you need. The owner gets an email and says yes or no." },
  { fraction: 0.5, title: "Pick it up", text: "The loop starts. Both of you can see how many days are left." },
  { fraction: 0.999, done: true, title: "Bring it back", text: "The owner marks it returned. If it's late, a reminder goes out once a day." },
];

const gutter = "px-4 sm:px-8 lg:px-14";

// The public demo (NEXT_PUBLIC_LENDLOOP_DEMO=true on its deployment) is closed to new sign-ups.
const DEMO = process.env.NEXT_PUBLIC_LENDLOOP_DEMO === "true";

function DemoNote() {
  return (
    <div className="mt-6 max-w-[48ch] border-l-2 border-ultramarine pl-4 text-[15px] break-words">
      <p className="font-semibold">This is the demo.</p>
      <p className="mt-1 text-slate">
        Sign in as <b className="font-semibold text-ink">lena+clerk_test@example.com</b> (a lender and the admin) or{" "}
        <b className="font-semibold text-ink">sam+clerk_test@example.com</b> (a borrower), with the code{" "}
        <b className="font-semibold text-ink">424242</b>. New sign-ups are closed, so the demo never holds real people&apos;s personal
        data.
      </p>
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [preloaded, params] = await Promise.all([preloadQuery(api.tools.listPublic, {}), searchParams]);
  const deleted = params.deleted === "1";
  const drill = <Drawing kind="drill" />;
  return (
    <div className="mx-auto max-w-[1100px]">
      {deleted && (
        <p role="status" className={`border-b border-hairline bg-field py-3 text-[15px] ${gutter}`}>
          Your account and data are deleted.
        </p>
      )}
      <nav className={`flex items-center justify-between py-5 lg:py-7 ${gutter}`}>
        <Logo size="lg" />
        <NavSignIn />
      </nav>

      <section className={`pt-3 pb-10 lg:pt-4 lg:pb-12 ${gutter}`}>
        <h1 className="text-[38px] leading-[1.03] font-bold tracking-[-0.03em] lg:text-[76px] lg:leading-none lg:tracking-[-0.035em]">
          Borrow what you need.
          <br className="hidden lg:inline" /> Lend what you don&apos;t.
        </h1>
        <div className="mt-5 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-14">
          <div>
            <p className="max-w-[44ch] text-[16px] leading-relaxed text-slate lg:text-[19px]">
              Your neighbours already own the ladder, the drill and the tent. Ask to borrow them for a few days, and LendLoop
              reminds everyone when they&apos;re due back.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-[18px] lg:mt-8">
              <SignInCta />
              {!DEMO && <span className="text-[14.5px] text-slate">With your email, no password</span>}
            </div>
            {DEMO && <DemoNote />}
          </div>
          <div className="mx-auto w-[250px] lg:hidden">
            <StageDial size={250} plate={drill} />
          </div>
          <div className="hidden w-[400px] lg:block">
            <StageDial size={400} caption="A drill, three days" plate={drill} />
          </div>
        </div>
      </section>

      <section className={`border-t border-hairline py-10 lg:py-12 ${gutter}`}>
        <h2 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[28px] lg:tracking-[-0.02em]">Available now</h2>
        <p className="mt-1 mb-4 text-[14px] text-slate lg:mt-1.5 lg:mb-6 lg:text-[16px]">
          Sign in to see who lends them and to ask for dates.
        </p>
        <PublicToolList preloaded={preloaded} />
      </section>

      <section className={`border-t border-hairline py-10 lg:py-12 ${gutter}`}>
        <h2 className="text-[20px] font-bold tracking-[-0.015em] lg:text-[28px] lg:tracking-[-0.02em]">How a loan works</h2>
        <p className="mt-1 mb-6 text-[14px] text-slate lg:mt-1.5 lg:text-[16px]">Every loan is one trip round the loop.</p>
        <ol className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {STEPS.map((s) => (
            <li key={s.title}>
              <StepRing fraction={s.fraction} done={s.done} />
              <b className="mt-3.5 mb-1 block text-[18px] font-semibold">{s.title}</b>
              <p className="max-w-[30ch] text-[15.5px] leading-normal text-slate">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className={gutter}>
        <Footer />
      </div>
    </div>
  );
}
