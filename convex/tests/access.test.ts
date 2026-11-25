import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import schema from "../schema";
import { modules } from "../test.setup";
import * as users from "../users";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
});
afterEach(() => vi.useRealTimers());

describe("public page", () => {
  test("shows available tools with name and category only", async () => {
    const { t, alice, bob } = await setup();
    const drill = await listDrill(alice);
    await listDrill(alice, "Ladder");
    const anonymous = await t.query(api.tools.listPublic, {});
    expect(anonymous).toEqual([
      { name: "Cordless drill", category: "power tools" },
      { name: "Ladder", category: "power tools" },
    ]);
    // Once lent out, a tool disappears from the public list.
    const req = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
    await alice.mutation(api.loans.approve, { loanId: req });
    expect(await t.query(api.tools.listPublic, {})).toEqual([{ name: "Ladder", category: "power tools" }]);
  });

  test("signed-out visitors can't read or write anything else", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.tools.list, {})).rejects.toThrow("Please sign in.");
    await expect(t.query(api.loans.myRequests, {})).rejects.toThrow("Please sign in.");
    await expect(
      t.mutation(api.tools.create, { name: "Saw", category: "hand tools", condition: "good", description: "" }),
    ).rejects.toThrow("Please sign in.");
  });

  test("signed-in lists show first names and never emails", async () => {
    const { alice, bob } = await setup();
    await listDrill(alice);
    const [row] = await bob.query(api.tools.list, {});
    expect(row.owner).toEqual({ name: "Alice", trustedLender: false });
    expect(JSON.stringify(row)).not.toContain("@");
    expect(await bob.query(api.users.me, {})).not.toHaveProperty("email");
  });
});

describe("listings: users act only on their own", () => {
  test("only the owner edits; the owner or an admin removes", async () => {
    const { alice, bob, admin } = await setup();
    const drill = await listDrill(alice);
    const edit = { toolId: drill, name: "Drill", category: "power tools" as const, condition: "fair" as const, description: "" };
    await expect(bob.mutation(api.tools.update, edit)).rejects.toThrow("only edit your own");
    await expect(admin.mutation(api.tools.update, edit)).rejects.toThrow("only edit your own");
    await alice.mutation(api.tools.update, edit);
    await expect(bob.mutation(api.tools.remove, { toolId: drill })).rejects.toThrow("only remove your own");
    await admin.mutation(api.tools.remove, { toolId: drill });
    expect(await alice.query(api.tools.mine, {})).toEqual([]);
  });

  test("input is validated on the server", async () => {
    const { alice } = await setup();
    await expect(
      alice.mutation(api.tools.create, { name: " x ", category: "garden", condition: "good", description: "" }),
    ).rejects.toThrow("2-60 characters");
    await expect(
      // @ts-expect-error: not a category; the argument validator rejects it before the handler runs
      alice.mutation(api.tools.create, { name: "Rake", category: "weapons", condition: "good", description: "" }),
    ).rejects.toThrow();
  });

  test("an owner can't remove a tool that is lent out; open requests are declined on removal", async () => {
    const { alice, bob, carol } = await setup();
    const drill = await listDrill(alice);
    const now = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId: now });
    await expect(alice.mutation(api.tools.remove, { toolId: drill })).rejects.toThrow("lent out right now");
    await alice.mutation(api.loans.markReturned, { loanId: now });
    await carol.mutation(api.loans.request, { toolId: drill, startDate: "2026-06-20", endDate: "2026-06-21" });
    await alice.mutation(api.tools.remove, { toolId: drill });
    const [request] = await carol.query(api.loans.myRequests, {});
    expect(request.status).toBe("declined");
    expect(request.tool.removed).toBe(true);
  });
});

describe("admin", () => {
  test("admin functions refuse everyone else", async () => {
    const { alice } = await setup();
    await expect(alice.query(api.admin.allLoans, {})).rejects.toThrow("Admins only.");
    await expect(alice.query(api.admin.users, {})).rejects.toThrow("Admins only.");
    await expect(alice.query(api.admin.failedAutomation, {})).rejects.toThrow("Admins only.");
    const me = await alice.query(api.users.me, {});
    await expect(alice.mutation(api.admin.setTrustedLender, { userId: me!._id, trusted: true })).rejects.toThrow(
      "Admins only.",
    );
  });

  test("an admin marks a Trusted Lender and sees every loan", async () => {
    const { alice, bob, admin } = await setup();
    const drill = await listDrill(alice);
    await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    const users = await admin.query(api.admin.users, {});
    const aliceRow = users.find((u) => u.name === "Alice")!;
    expect(aliceRow.listings).toBe(1);
    await admin.mutation(api.admin.setTrustedLender, { userId: aliceRow._id, trusted: true });
    expect((await bob.query(api.tools.list, {}))[0].owner.trustedLender).toBe(true);
    expect(await admin.query(api.admin.allLoans, {})).toHaveLength(1);
  });

  test("nobody can make themselves admin from the client", async () => {
    const { alice } = await setup();
    // users.setRole is an internalMutation: Convex doesn't expose it to clients at all.
    expect((users.setRole as unknown as { isInternal?: boolean }).isInternal).toBe(true);
    await alice.mutation(api.users.store, {});
    expect((await alice.query(api.users.me, {}))!.role).toBe("user");
  });
});

describe("account sync", () => {
  test("a sign-in without an email claim is refused instead of saved without one", async () => {
    const t = convexTest(schema, modules);
    const noEmail = t.withIdentity({ subject: "Eve", issuer: "https://clerk.example.test", givenName: "Eve" });
    await expect(noEmail.mutation(api.users.store, {})).rejects.toThrow("no email address");
    expect(await noEmail.query(api.users.me, {})).toBeNull();
  });
});
