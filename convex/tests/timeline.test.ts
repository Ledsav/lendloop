import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

describe("loan timeline", () => {
  test("the timeline tells the loan's story in order, from the viewer's side", async () => {
    const { t, alice, bob, admin } = await setup();
    const drill = await listDrill(alice);
    const before = Date.now();
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
    const after = Date.now();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.advanceTimersByTime(3_600_000);
    await alice.mutation(api.loans.approve, { loanId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const [mine] = await bob.query(api.loans.myRequests, {});
    expect(mine.viewerRole).toBe("borrower");
    expect(mine.requestedAt).toBeGreaterThanOrEqual(before);
    expect(mine.requestedAt).toBeLessThan(after + 1000); // convex-test keeps its own monotonic clock inside functions
    expect(mine.timeline.map((e) => e.kind)).toEqual(["requested", "email", "approved", "email"]);
    expect(mine.timeline[1]).toMatchObject({ kind: "email", event: "loan.requested", to: "owner", status: "skipped" });
    expect(mine.tool.category).toBe("power tools");
    expect((await alice.query(api.loans.incoming, {}))[0].viewerRole).toBe("owner");
    expect((await admin.query(api.admin.allLoans, {}))[0].viewerRole).toBe("admin");
  });

  test("a cancellation says who cancelled", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    const bobs = await bob.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-20", endDate: "2026-06-21" });
    await bob.mutation(api.loans.cancel, { loanId: bobs });
    const [byBorrower] = await bob.query(api.loans.myRequests, {});
    expect(byBorrower.timeline.find((e) => e.kind === "cancelled")).toMatchObject({ by: "borrower" });

    const carols = await carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-24", endDate: "2026-06-25" });
    await alice.mutation(api.loans.approve, { loanId: carols });
    await alice.mutation(api.tools.remove, { toolId: drill });
    const [byOwner] = await carol.query(api.loans.myRequests, {});
    expect(byOwner.timeline.find((e) => e.kind === "cancelled")).toMatchObject({ by: "owner" });
  });
});
