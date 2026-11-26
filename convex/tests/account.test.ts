import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../_generated/api";
import { openLoansMessage } from "../account";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("download my data", () => {
  test("holds only my data", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    await alice.mutation(api.loans.approve, {
      loanId: await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY }),
    });
    const mine = await bob.query(api.account.exportMine, {});
    expect(mine.profile).toMatchObject({ firstName: "Bob", email: "bob@example.com", role: "user", trustedLender: false });
    expect(mine.loans).toEqual([
      expect.objectContaining({ item: "Cordless drill", role: "borrower", otherPerson: "Alice", status: "approved", startDate: TODAY }),
    ]);
    expect(mine.activity.map((a) => a.action)).toEqual(["loan.requested"]);
    expect(JSON.stringify(mine)).not.toContain("alice@example.com");
  });

  test("someone with nothing yet gets empty lists", async () => {
    const { carol } = await setup();
    const mine = await carol.query(api.account.exportMine, {});
    expect(mine.listings).toEqual([]);
    expect(mine.loans).toEqual([]);
  });

  test("downloading is recorded in the audit log", async () => {
    const { t, carol } = await setup();
    await carol.mutation(api.account.recordExport, {});
    const rows = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(rows.at(-1)!.action).toBe("account.exported");
  });
});

describe("delete my account", () => {
  test("is refused while loans are open, saying what to close", async () => {
    const { alice, bob } = await setup();
    const drill = await listDrill(alice);
    await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await expect(bob.mutation(api.account.deleteMine, {})).rejects.toThrow(
      "Close your open loans first: 1 you're borrowing or asked for.",
    );
    await expect(alice.mutation(api.account.deleteMine, {})).rejects.toThrow("Close your open loans first: 1 waiting for your answer.");
  });

  test("is refused on the demo", async () => {
    vi.stubEnv("LENDLOOP_DEMO", "true");
    const { carol } = await setup();
    await expect(carol.mutation(api.account.deleteMine, {})).rejects.toThrow(
      "The demo accounts can't be deleted. On a real deployment this deletes your data.",
    );
  });

  test("the only admin can't delete their account", async () => {
    const { admin } = await setup();
    await expect(admin.mutation(api.account.deleteMine, {})).rejects.toThrow("You're the only admin.");
  });

  test("anonymises me, removes my listings and keeps the other person's history", async () => {
    const { t, alice, bob } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId });
    await alice.mutation(api.loans.markReturned, { loanId });
    const me = (await alice.query(api.users.me, {}))!;
    await alice.mutation(api.account.deleteMine, {});

    const { row, tool, actions } = await t.run(async (ctx) => ({
      row: await ctx.db.get("users", me._id),
      tool: await ctx.db.get("tools", drill),
      actions: (await ctx.db.query("auditLog").collect()).map((a) => a.action),
    }));
    expect(row).toMatchObject({ name: "A former neighbour", email: "", trustedLender: false, role: "user" });
    expect(row!.deletedAt).toBeDefined();
    expect(row!.tokenIdentifier.startsWith("deleted|")).toBe(true);
    expect(tool!.removedAt).toBeDefined();
    expect(actions.at(-1)).toBe("account.deleted");
    const [past] = await bob.query(api.loans.myRequests, {});
    expect(past.owner.name).toBe("A former neighbour");
  });

  test("a later sign-in starts a fresh, empty account", async () => {
    const { alice } = await setup();
    await listDrill(alice);
    const before = (await alice.query(api.users.me, {}))!._id;
    await alice.mutation(api.account.deleteMine, {});
    const after = await alice.mutation(api.users.store, {});
    expect(after).not.toBe(before);
    expect(await alice.query(api.tools.mine, {})).toEqual([]);
  });

  test("unsent emails about my loans are skipped, not sent to a blank address", async () => {
    const { t, alice, bob } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.decline, { loanId });
    await t.run(async (ctx) => {
      for (const e of await ctx.db.query("outbox").collect()) await ctx.db.patch("outbox", e._id, { status: "failed" });
    });
    await bob.mutation(api.account.deleteMine, {});
    const events = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(events.every((e) => e.status === "skipped" && e.lastError === "account deleted")).toBe(true);
  });
});

describe("open loans message", () => {
  test("names only what's open", () => {
    expect(openLoansMessage({ waiting: 2, lentOut: 0, borrowing: 0 })).toBe("Close your open loans first: 2 waiting for your answer.");
    expect(openLoansMessage({ waiting: 0, lentOut: 1, borrowing: 3 })).toBe(
      "Close your open loans first: 1 lent out, 3 you're borrowing or asked for.",
    );
    expect(openLoansMessage({ waiting: 1, lentOut: 1, borrowing: 1 })).toBe(
      "Close your open loans first: 1 waiting for your answer, 1 lent out, 1 you're borrowing or asked for.",
    );
  });
});
