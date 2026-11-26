import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { listDrill, setup, TODAY, type Client } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const REQUEST_LIMIT = "You've asked for 10 things in the last hour. Try again later.";
const LISTING_LIMIT = "You've listed 20 things today. Try again tomorrow.";

async function listMany(owner: Client, n: number): Promise<Id<"tools">[]> {
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(await listDrill(owner, `Drill ${i}`));
  return ids;
}
const ask = (borrower: Client, toolId: Id<"tools">) => borrower.mutation(api.loans.request, { toolId, startDate: TODAY, endDate: TODAY });

describe("rate limits", () => {
  test("the 11th request in an hour is refused, the 10th is fine", async () => {
    const { alice, bob } = await setup();
    const tools = await listMany(alice, 11);
    for (const tool of tools.slice(0, 10)) await ask(bob, tool);
    await expect(ask(bob, tools[10])).rejects.toThrow(REQUEST_LIMIT);
  });

  test("requests older than an hour don't count", async () => {
    const { alice, bob } = await setup();
    const tools = await listMany(alice, 11);
    for (const tool of tools.slice(0, 10)) await ask(bob, tool);
    vi.advanceTimersByTime(61 * 60_000);
    await ask(bob, tools[10]);
  });

  test("cancelled requests still count", async () => {
    const { alice, bob } = await setup();
    const tools = await listMany(alice, 11);
    for (const tool of tools.slice(0, 10)) {
      const loanId = await ask(bob, tool);
      await bob.mutation(api.loans.cancel, { loanId });
    }
    await expect(ask(bob, tools[10])).rejects.toThrow(REQUEST_LIMIT);
  });

  test("the 21st listing in a day is refused, and allowed again a day later", async () => {
    const { alice } = await setup();
    await listMany(alice, 20);
    await expect(listDrill(alice, "One more")).rejects.toThrow(LISTING_LIMIT);
    vi.advanceTimersByTime(25 * 3_600_000);
    await listDrill(alice, "One more");
  });

  test("seeding doesn't trip the request limit", async () => {
    vi.stubEnv("LENDLOOP_DEV_TOOLS", "true");
    const { t, bob, carol } = await setup();
    await t.mutation(internal.devtools.seed, { realEmails: ["alice@example.com", "bob@example.com"] });
    const free = (await bob.query(api.tools.list, {})).find((x) => x.name === "Pasta machine")!;
    await ask(bob, free._id);
    await ask(carol, free._id);
  });
});
