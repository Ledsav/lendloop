import { preloadQuery } from "convex/nextjs";
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

export default async function Home() {
  const preloaded = await preloadQuery(api.tools.listPublic, {});
  const drill = <Drawing kind="drill" />;
  return (
    <div className="mx-auto max-w-[1100px]">
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
              <span className="text-[14.5px] text-slate">With your email, no password</span>
            </div>
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

      <footer className={`flex flex-wrap justify-between gap-2 border-t border-hairline pt-7 pb-9 text-[14px] text-slate ${gutter}`}>
        <span>LendLoop, a neighbourhood lending board</span>
        <span>Sample project</span>
      </footer>
    </div>
  );
}
