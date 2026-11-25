import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { listDrill, setup, TODAY } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

describe("borrowing", () => {
  test("request → approve → return, each step only by the right person", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    await expect(
      alice.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY }),
    ).rejects.toThrow("your own tool");
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });

    await expect(bob.mutation(api.loans.approve, { loanId })).rejects.toThrow("Only the lender");
    await expect(carol.mutation(api.loans.decline, { loanId })).rejects.toThrow("Only the lender");
    await alice.mutation(api.loans.approve, { loanId });
    await expect(alice.mutation(api.loans.approve, { loanId })).rejects.toThrow("already approved");

    expect((await bob.query(api.tools.list, {}))[0].availability).toBe("on_loan");
    await expect(bob.mutation(api.loans.markReturned, { loanId })).rejects.toThrow("Only the lender");
    await expect(bob.mutation(api.loans.cancel, { loanId })).rejects.toThrow("has started");
    await alice.mutation(api.loans.markReturned, { loanId });
    expect((await bob.query(api.tools.list, {}))[0].availability).toBe("available");
  });

  test("no double booking", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    const first = await bob.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-11", endDate: "2026-06-14" });
    const second = await carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-13", endDate: "2026-06-15" });
    await expect(
      bob.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-12", endDate: "2026-06-12" }),
    ).rejects.toThrow("already asked");
    await alice.mutation(api.loans.approve, { loanId: first });
    await expect(alice.mutation(api.loans.approve, { loanId: second })).rejects.toThrow("another loan");
    await expect(
      carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-14", endDate: "2026-06-16" }),
    ).rejects.toThrow("already lent out");
    // Back to back is fine.
    await alice.mutation(api.loans.decline, { loanId: second });
    const third = await carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-15", endDate: "2026-06-16" });
    await alice.mutation(api.loans.approve, { loanId: third });
  });

  test("dates are checked on the server", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    const ask = (startDate: string, endDate: string) => bob.mutation(api.loans.request, { toolId: drill, startDate, endDate });
    await expect(ask("2026-06-09", "2026-06-12")).rejects.toThrow("past");
    await expect(ask("2026-06-12", "2026-06-11")).rejects.toThrow("on or after");
    await expect(ask("2026-06-10", "2026-07-15")).rejects.toThrow("at most 30 days");
    await expect(ask("2026-02-30", "2026-03-01")).rejects.toThrow("YYYY-MM-DD");
  });

  test("everyone sees only their own requests", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    expect(await bob.query(api.loans.myRequests, {})).toHaveLength(1);
    expect(await carol.query(api.loans.myRequests, {})).toHaveLength(0);
    expect(await carol.query(api.loans.incoming, {})).toHaveLength(0);
    const [incoming] = await alice.query(api.loans.incoming, {});
    expect(incoming.borrower).toEqual({ name: "Bob" });
  });

  test("the borrower can cancel before the loan starts; the lender hears about it", async () => {
    const { t, alice, bob } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-20", endDate: "2026-06-21" });
    await alice.mutation(api.loans.approve, { loanId });
    await bob.mutation(api.loans.cancel, { loanId });
    const events = await t.run(async (ctx) => await ctx.db.query("outbox").collect());
    expect(events.map((e) => [e.type, e.recipient])).toEqual([
      ["loan.requested", "owner"],
      ["loan.approved", "borrower"],
      ["loan.cancelled", "owner"],
    ]);
  });
});
