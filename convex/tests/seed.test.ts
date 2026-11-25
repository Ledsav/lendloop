import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { overlaps } from "../lib/dates";
import { CATEGORIES } from "../lib/validators";
import { setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
  vi.stubEnv("LENDLOOP_DEV_TOOLS", "true");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

// The test users stand in for the real Clerk test accounts (Lena and Sam).
const real = { realEmails: ["alice@example.com", "bob@example.com"] };

describe("devtools:seed", () => {
  test("refuses to run without LENDLOOP_DEV_TOOLS", async () => {
    vi.unstubAllEnvs();
    const { t } = await setup();
    await expect(t.mutation(internal.devtools.seed, real)).rejects.toThrow("LENDLOOP_DEV_TOOLS");
  });

  test("refuses until both real accounts exist, and writes nothing", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(internal.devtools.seed, { realEmails: ["alice@example.com", "nobody@example.com"] }),
    ).rejects.toThrow("Sign in once");
    expect(await t.run((ctx) => ctx.db.query("tools").collect())).toHaveLength(0);
  });

  test("fills every screen: people, every category, loans in every state, nothing emailed", async () => {
    const { t, alice, bob } = await setup();
    expect(await t.mutation(internal.devtools.seed, real)).toMatchObject({ seeded: true, people: 10, items: 29 });
    const { tools, loans, outbox, users, scheduled } = await t.run(async (ctx) => ({
      tools: await ctx.db.query("tools").collect(),
      loans: await ctx.db.query("loans").collect(),
      outbox: await ctx.db.query("outbox").collect(),
      users: await ctx.db.query("users").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    for (const c of CATEGORIES) expect(tools.filter((x) => x.category === c).length).toBeGreaterThanOrEqual(3);
    const approved = loans.filter((l) => l.status === "approved");
    expect(approved.some((l) => l.startDate <= TODAY && l.endDate >= TODAY)).toBe(true); // out
    expect(approved.some((l) => l.endDate < TODAY)).toBe(true); // late
    expect(approved.some((l) => l.startDate > TODAY)).toBe(true); // coming up
    for (const s of ["requested", "returned", "declined", "cancelled"]) expect(loans.some((l) => l.status === s)).toBe(true);
    expect(outbox.filter((e) => e.status === "pending")).toHaveLength(0);
    expect(scheduled).toHaveLength(0);
    const neighbours = users.filter((u) => u.tokenIdentifier.startsWith("seed|"));
    expect(neighbours).toHaveLength(10);
    expect(neighbours.every((u) => u.email.endsWith("@example.com"))).toBe(true);
    // No double booking among loans that held the item.
    const holding = loans.filter((l) => l.status === "approved" || l.status === "returned");
    for (const a of holding)
      for (const b of holding) if (a !== b && a.toolId === b.toolId) expect(overlaps(a, b)).toBe(false);
    expect((await alice.query(api.tools.mine, {})).length).toBeGreaterThanOrEqual(3);
    expect((await bob.query(api.loans.myRequests, {})).length).toBeGreaterThanOrEqual(3);
    expect((await alice.query(api.loans.incoming, {})).some((l) => l.status === "requested")).toBe(true);
  });

  test("the drill reads like the mockup", async () => {
    const { t, alice } = await setup();
    await t.mutation(internal.devtools.seed, real);
    const drill = (await alice.query(api.tools.mine, {})).find((x) => x.name === "Cordless drill")!;
    expect(await alice.query(api.tools.get, { id: drill._id })).toMatchObject({
      usage: { recent: 7, total: 14 },
      loop: { state: "out", day: 2, days: 3, holder: { name: "Bob" } },
      owner: { trustedLender: true },
    });
  });

  test("running it twice changes nothing; fresh starts over without leftovers", async () => {
    const { t, carol } = await setup();
    const first = await t.mutation(internal.devtools.seed, real);
    expect(await t.mutation(internal.devtools.seed, real)).toEqual({ ...first, seeded: false });
    const mixer = (await carol.query(api.tools.list, {})).find((x) => x.name === "Stand mixer")!;
    await carol.mutation(api.loans.request, { toolId: mixer._id, startDate: "2026-06-25", endDate: "2026-06-26" });
    expect(await t.mutation(internal.devtools.seed, { ...real, fresh: true })).toEqual(first);
    const orphans = await t.run(async (ctx) => {
      const loans = await ctx.db.query("loans").collect();
      return (await Promise.all(loans.map((l) => ctx.db.get("tools", l.toolId)))).filter((x) => !x).length;
    });
    expect(orphans).toBe(0);
    expect(await carol.query(api.loans.myRequests, {})).toHaveLength(0);
  });
});
