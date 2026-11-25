import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { nextFree, usage } from "../lib/itemStats";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

const loan = (startDate: string, endDate: string, status: Doc<"loans">["status"], returnedAt?: number) =>
  ({ startDate, endDate, status, returnedAt }) as Doc<"loans">;

describe("item stats", () => {
  test("usage counts loans that happened and clips them to the last 12 weeks", () => {
    const loans = [
      loan("2026-01-05", "2026-01-07", "returned", Date.parse("2026-01-07T17:00:00Z")),
      loan("2026-03-15", "2026-03-20", "returned", Date.parse("2026-03-20T17:00:00Z")),
      loan("2026-05-01", "2026-05-03", "returned", Date.parse("2026-05-04T17:00:00Z")),
      loan("2026-05-20", "2026-05-21", "declined"),
      loan("2026-06-09", "2026-06-11", "approved"),
      loan("2026-06-20", "2026-06-21", "requested"),
    ];
    expect(usage(loans, TODAY)).toEqual({
      total: 4,
      recent: 3,
      strip: [
        { startDate: "2026-03-19", endDate: "2026-03-20", current: false },
        { startDate: "2026-05-01", endDate: "2026-05-04", current: false },
        { startDate: "2026-06-09", endDate: "2026-06-10", current: true },
      ],
    });
  });

  test("a loan returned before it started never draws a negative segment", () => {
    const early = loan("2026-06-01", "2026-06-05", "returned", Date.parse("2026-05-30T12:00:00Z"));
    expect(usage([early], TODAY).strip).toEqual([{ startDate: "2026-06-01", endDate: "2026-06-01", current: false }]);
  });

  test("nextFree skips back-to-back bookings and is unknown while late", () => {
    expect(nextFree([], TODAY)).toBe(TODAY);
    expect(
      nextFree([loan("2026-06-09", "2026-06-11", "approved"), loan("2026-06-12", "2026-06-13", "approved")], TODAY),
    ).toBe("2026-06-14");
    expect(nextFree([loan("2026-06-20", "2026-06-22", "approved")], TODAY)).toBe(TODAY);
    expect(nextFree([loan("2026-06-01", "2026-06-08", "approved")], TODAY)).toBeNull();
  });
});

describe("item page query", () => {
  test("get returns null for a bad, unknown or removed id", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    expect(await bob.query(api.tools.get, { id: "abc" })).toBeNull();
    await alice.mutation(api.tools.remove, { toolId: drill });
    expect(await bob.query(api.tools.get, { id: drill })).toBeNull();
  });

  test("a neighbour sees dates but never who has it; owner and borrower see their parts", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
    await alice.mutation(api.loans.approve, { loanId });
    await carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-20", endDate: "2026-06-21" });

    const seen = await carol.query(api.tools.get, { id: drill });
    expect(seen).toMatchObject({
      isMine: false,
      owner: { name: "Alice", trustedLender: false, lentCount: 0 },
      loop: { state: "out", holder: null },
      nextFree: "2026-06-13",
      booked: [{ startDate: TODAY, endDate: "2026-06-12" }],
      pendingRequests: 0,
      today: TODAY,
    });
    expect(seen!.myLoans).toHaveLength(1);
    expect(JSON.stringify(seen)).not.toMatch(/Bob|@/);
    expect((await bob.query(api.tools.get, { id: drill }))!.myLoans).toEqual([
      { _id: loanId, startDate: TODAY, endDate: "2026-06-12", status: "approved" },
    ]);
    expect(await alice.query(api.tools.get, { id: drill })).toMatchObject({
      isMine: true,
      pendingRequests: 1,
      loop: { holder: { name: "Bob" } },
    });
  });

  test("lentCount counts returned loans", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId });
    await alice.mutation(api.loans.markReturned, { loanId });
    expect((await bob.query(api.tools.get, { id: drill }))!.owner.lentCount).toBe(1);
  });
});
