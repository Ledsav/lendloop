import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

describe("audit log", () => {
  test("each change is audited with ids only", async () => {
    const { t, alice, bob, admin } = await setup();
    const before = (await t.run((ctx) => ctx.db.query("auditLog").collect())).length; // setup made Ada admin
    const drill = await listDrill(alice);
    await alice.mutation(api.tools.update, { toolId: drill, name: "Drill", category: "power tools", condition: "fair", description: "" });
    const first = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId: first });
    await alice.mutation(api.loans.markReturned, { loanId: first });
    const second = await bob.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-20", endDate: "2026-06-21" });
    await bob.mutation(api.loans.cancel, { loanId: second });
    const aliceRow = (await admin.query(api.admin.users, {})).find((u) => u.name === "Alice")!;
    await admin.mutation(api.admin.setTrustedLender, { userId: aliceRow._id, trusted: true });
    await admin.mutation(api.tools.remove, { toolId: drill });
    await t.mutation(internal.users.setRole, { email: "carol@example.com", role: "admin" });

    const rows = (await t.run((ctx) => ctx.db.query("auditLog").collect())).slice(before);
    expect(rows.map((r) => r.action)).toEqual([
      "listing.created",
      "listing.updated",
      "loan.requested",
      "loan.approved",
      "loan.returned",
      "loan.requested",
      "loan.cancelled",
      "user.trustedLender",
      "listing.removed",
      "user.role",
    ]);
    expect(rows.at(-1)!.actorId).toBeUndefined(); // the command line, not a person
    expect(rows.find((r) => r.action === "user.trustedLender")!.details).toEqual({ trusted: true });
    const text = JSON.stringify(rows);
    expect(text).not.toMatch(/@|Alice|Bob|Drill/);
  });

  test("reads aren't audited", async () => {
    const { t, alice, bob } = await setup();
    const before = (await t.run((ctx) => ctx.db.query("auditLog").collect())).length;
    await bob.query(api.tools.list, {});
    await bob.query(api.loans.myRequests, {});
    await alice.query(api.tools.mine, {});
    expect(await t.run((ctx) => ctx.db.query("auditLog").collect())).toHaveLength(before);
  });

  test("only admins read the audit log, in plain names", async () => {
    const { alice, bob, admin } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId });
    await expect(alice.query(api.admin.auditLog, {})).rejects.toThrow("Admins only.");
    const rows = await admin.query(api.admin.auditLog, {});
    expect(rows[0]).toMatchObject({ action: "loan.approved", actor: "Alice", item: "Cordless drill", other: "Bob", bySystem: false });
    expect(rows.find((r) => r.action === "loan.requested")).toMatchObject({ actor: "Bob", other: "Alice" });
    expect(rows.find((r) => r.action === "user.role")).toMatchObject({ bySystem: true, other: "Ada" });
  });

  test("lines survive deleted people and removed items", async () => {
    const { t, alice, admin } = await setup();
    const drill = await listDrill(alice);
    const me = (await alice.query(api.users.me, {}))!;
    await t.run(async (ctx) => {
      await ctx.db.delete("tools", drill);
      await ctx.db.delete("users", me._id);
    });
    const created = (await admin.query(api.admin.auditLog, {})).find((r) => r.action === "listing.created")!;
    expect(created).toMatchObject({ actor: null, item: null, bySystem: false });
  });

  test("the purge deletes only entries older than 365 days", async () => {
    const { t, alice } = await setup();
    await listDrill(alice, "Old ladder");
    vi.setSystemTime(new Date(Date.parse(`${TODAY}T09:00:00Z`) + 366 * 86_400_000));
    await listDrill(alice, "New ladder");
    const before = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(before.length).toBeGreaterThan(1);
    await t.action(internal.admin.purgeAuditLogAll, {});
    const after = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(after).toHaveLength(1);
    expect(after[0].action).toBe("listing.created");
  });
});
