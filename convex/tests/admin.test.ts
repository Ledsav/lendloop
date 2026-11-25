import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { listDrill, setup, TODAY } from "./test.helpers";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
  vi.stubEnv("N8N_LOAN_EVENTS_WEBHOOK_URL", "https://n8n.example.test/webhook/lendloop/loan-events");
  vi.stubEnv("LENDLOOP_TO_N8N_SECRET", "test-secret");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("admin rows", () => {
  test("carry first names and counts, never emails", async () => {
    const { t, alice, bob, admin } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await alice.mutation(api.loans.approve, { loanId });
    await alice.mutation(api.loans.markReturned, { loanId });
    await t.finishAllScheduledFunctions(vi.runAllTimers); // every email gives up
    await t.mutation(internal.reminders.record, { reminderKey: `${loanId}:${TODAY}`, status: "failed", error: "SMTP down" });

    const users = await admin.query(api.admin.users, {});
    expect(users.find((u) => u.name === "Alice")!.lentCount).toBe(1);
    const failed = await admin.query(api.admin.failedAutomation, {});
    const approval = failed.notifications.find((n) => n.type === "loan.approved")!;
    expect(approval).toMatchObject({ tool: "Cordless drill", recipient: "Bob" });
    expect(failed.notifications.find((n) => n.type === "loan.requested")).toMatchObject({ recipient: "Alice" });
    expect(failed.reminders[0]).toMatchObject({ tool: "Cordless drill", borrower: "Bob", error: "SMTP down" });
    expect(JSON.stringify([users, failed])).not.toContain("@");
  });
});
