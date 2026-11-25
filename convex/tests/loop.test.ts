import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

const byName = <T extends { name: string }>(rows: T[], name: string) => rows.find((r) => r.name === name)!;

describe("each item's loop", () => {
  test("each item shows its loop: home, out with day numbers, late", async () => {
    const { t, alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    await listDrill(alice, "Ladder");
    const tent = await listDrill(alice, "Tent");
    await alice.mutation(api.loans.approve, {
      loanId: await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" }),
    });
    const late = await carol.mutation(api.loans.request, { toolId: tent, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId: late });
    await t.run((ctx) => ctx.db.patch("loans", late, { startDate: "2026-06-03", endDate: "2026-06-08" }));

    const rows = await carol.query(api.tools.list, {});
    expect(byName(rows, "Ladder").loop).toEqual({ state: "home" });
    expect(byName(rows, "Cordless drill").loop).toMatchObject({ state: "out", day: 1, days: 3, startDate: TODAY, endDate: "2026-06-12" });
    expect(byName(rows, "Tent").loop).toMatchObject({ state: "late", daysLate: 2, endDate: "2026-06-08" });
  });

  test("only the owner, the borrower and admins see who has it", async () => {
    const { alice, bob, carol, admin } = await setup();
    const drill = await listDrill(alice);
    await alice.mutation(api.loans.approve, {
      loanId: await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY }),
    });
    expect((await carol.query(api.tools.list, {}))[0].loop).toMatchObject({ state: "out", holder: null });
    expect(JSON.stringify(await carol.query(api.tools.list, {}))).not.toContain("Bob");
    expect((await alice.query(api.tools.list, {}))[0].loop).toMatchObject({ holder: { name: "Bob", isViewer: false } });
    expect((await bob.query(api.tools.list, {}))[0].loop).toMatchObject({ holder: { name: "Bob", isViewer: true } });
    expect((await admin.query(api.tools.list, {}))[0].loop).toMatchObject({ holder: { name: "Bob", isViewer: false } });
    expect((await alice.query(api.tools.mine, {}))[0].loop).toMatchObject({ holder: { name: "Bob", isViewer: false } });
  });

  test("a one-day loan that starts today is day 1 of 1", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    await alice.mutation(api.loans.approve, {
      loanId: await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY }),
    });
    expect((await bob.query(api.tools.list, {}))[0].loop).toMatchObject({ state: "out", day: 1, days: 1 });
  });
});
