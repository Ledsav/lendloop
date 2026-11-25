import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { hmacHex, signatureHeaders, verifySignature } from "../lib/hmac";
import * as notifications from "../notifications";
import { MAX_ATTEMPTS } from "../notifications";
import * as reminders from "../reminders";
import { listDrill, setup, TODAY } from "./helpers";

const TO_N8N = "test-secret-convex-to-n8n";
const FROM_N8N = "test-secret-n8n-to-convex";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T09:00:00Z`));
  vi.stubEnv("N8N_LOAN_EVENTS_WEBHOOK_URL", "https://n8n.example.test/webhook/lendloop/loan-events");
  vi.stubEnv("LENDLOOP_TO_N8N_SECRET", TO_N8N);
  vi.stubEnv("N8N_TO_LENDLOOP_SECRET", FROM_N8N);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("HMAC signing", () => {
  test("matches the RFC 4231 test vector", async () => {
    expect(await hmacHex("Jefe", "what do ya want for nothing?")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  test("rejects tampered bodies, stale timestamps and wrong secrets", async () => {
    const body = JSON.stringify({ hello: "world" });
    const h = await signatureHeaders("s3cret", body);
    const [ts, sig] = [h["X-LendLoop-Timestamp"], h["X-LendLoop-Signature"]];
    expect(await verifySignature("s3cret", body, ts, sig)).toEqual({ ok: true });
    expect(await verifySignature("s3cret", body + " ", ts, sig)).toMatchObject({ ok: false, reason: "bad signature" });
    expect(await verifySignature("other", body, ts, sig)).toMatchObject({ ok: false });
    expect(await verifySignature(undefined, body, ts, sig)).toMatchObject({ ok: false });
    expect(await verifySignature("s3cret", body, ts, sig, Date.now() + 301_000)).toMatchObject({ reason: "stale timestamp" });
  });
});

describe("request notifications (Convex → n8n)", () => {
  test("delivers a signed, minimal payload", async () => {
    const { t, alice, bob } = await setup();
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const drill = await listDrill(alice);
    await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://n8n.example.test/webhook/lendloop/loan-events");
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(await verifySignature(TO_N8N, body, headers["X-LendLoop-Timestamp"], headers["X-LendLoop-Signature"])).toEqual({
      ok: true,
    });
    const payload = JSON.parse(body);
    expect(headers["X-LendLoop-Event-Id"]).toBe(payload.eventId);
    expect(Object.keys(payload).sort()).toEqual([
      "deliveryId",
      "eventId",
      "loan",
      "occurredAt",
      "otherParty",
      "recipient",
      "tool",
      "type",
    ]);
    expect(payload.deliveryId).toBe(`${payload.eventId}:0`);
    expect(payload.type).toBe("loan.requested");
    expect(payload.recipient).toEqual({ name: "Alice", email: "alice@example.com", role: "owner" });
    expect(payload.otherParty).toEqual({ name: "Bob" }); // no email of the other party
    expect(payload.tool).toEqual({ name: "Cordless drill" }); // no description, no owner id

    const [event] = await t.run(async (ctx) => await ctx.db.query("outbox").collect());
    expect(event).toMatchObject({ status: "accepted", attempts: 1 });
  });

  test("retries with backoff, then gives up visibly; an admin can retry", async () => {
    const { t, alice, bob, admin } = await setup();
    const fetchMock = vi.fn(async () => new Response("boom", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const drill = await listDrill(alice);
    await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: TODAY });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    const failed = await admin.query(api.admin.failedAutomation, {});
    expect(failed.notifications).toHaveLength(1);
    expect(failed.notifications[0]).toMatchObject({ attempts: MAX_ATTEMPTS, error: "n8n answered HTTP 500" });
    const [loan] = await bob.query(api.loans.myRequests, {});
    expect(loan.activity[0]).toMatchObject({ kind: "notification", status: "failed" });

    fetchMock.mockImplementation(async () => new Response(null, { status: 200 }));
    await admin.mutation(api.admin.retryNotification, { outboxId: failed.notifications[0]._id });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const retried = JSON.parse((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body as string);
    expect(retried.deliveryId).toBe(`${retried.eventId}:1`); // a new delivery, so n8n sends it
    expect((await admin.query(api.admin.failedAutomation, {})).notifications).toHaveLength(0);
  });

  test("without n8n configured, events are marked skipped instead of failing", async () => {
    vi.stubEnv("N8N_LOAN_EVENTS_WEBHOOK_URL", "");
    const { t, alice, bob } = await setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await bob.mutation(api.loans.request, { toolId: await listDrill(alice), startDate: TODAY, endDate: TODAY });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetchMock).not.toHaveBeenCalled();
    const [event] = await t.run(async (ctx) => await ctx.db.query("outbox").collect());
    expect(event.status).toBe("skipped");
  });
});

async function signedPost(t: Awaited<ReturnType<typeof setup>>["t"], path: string, data: unknown, secret = FROM_N8N) {
  const body = JSON.stringify(data);
  return await t.fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await signatureHeaders(secret, body)) },
    body,
  });
}

/** Bob borrowed Alice's drill until June 12 and it's now June 15: overdue. */
async function overdueLoan() {
  const ctx = await setup();
  const drill = await listDrill(ctx.alice);
  const loanId = await ctx.bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
  await ctx.alice.mutation(api.loans.approve, { loanId });
  vi.setSystemTime(new Date("2026-06-15T09:00:00Z"));
  return { ...ctx, loanId };
}

describe("n8n → Convex endpoints", () => {
  test("refuse unsigned, wrongly signed and replayed requests", async () => {
    const { t } = await overdueLoan();
    const unsigned = await t.fetch("/n8n/overdue-loans", { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(401);
    expect(await unsigned.json()).toEqual({ error: "unauthorized" }); // says nothing about why
    expect((await signedPost(t, "/n8n/overdue-loans", {}, "wrong-secret")).status).toBe(401);

    const body = "{}";
    const old = await signatureHeaders(FROM_N8N, body, Date.now() - 10 * 60_000);
    expect((await t.fetch("/n8n/overdue-loans", { method: "POST", headers: old, body })).status).toBe(401);
  });

  test("overdue loans, then an idempotent write-back", async () => {
    const { t, bob, loanId } = await overdueLoan();
    const res = await signedPost(t, "/n8n/overdue-loans", {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ asOf: "2026-06-15", count: 1 });
    expect(data.loans[0]).toEqual({
      loanId,
      reminderKey: `${loanId}:2026-06-15`,
      borrower: { name: "Bob", email: "bob@example.com" },
      tool: { name: "Cordless drill" },
      endDate: "2026-06-12",
      daysOverdue: 3,
    });

    const writeBack = { reminderKey: data.loans[0].reminderKey, status: "sent" };
    expect(await (await signedPost(t, "/n8n/reminders", writeBack)).json()).toEqual({ ok: true, duplicate: false });
    // n8n retries the same write-back (timeout, crash...): still one reminder.
    expect(await (await signedPost(t, "/n8n/reminders", writeBack)).json()).toEqual({ ok: true, duplicate: true });
    // A late "failed" for the same key doesn't undo "sent".
    await signedPost(t, "/n8n/reminders", { ...writeBack, status: "failed", error: "late" });
    const reminders = await t.run(async (ctx) => await ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ status: "sent", writes: 3 });

    // A second run the same day finds nothing to send.
    expect(await (await signedPost(t, "/n8n/overdue-loans", {})).json()).toMatchObject({ count: 0 });
    // The borrower sees it on the loan (bonus: recent automation activity).
    const [loan] = await bob.query(api.loans.myRequests, {});
    expect(loan.overdue).toBe(true);
    expect(loan.activity[0]).toMatchObject({ kind: "reminder", status: "sent" });
  });

  test("the backdating dev tool only runs where it's switched on", async () => {
    const { t, alice, bob } = await setup();
    const drill = await listDrill(alice);
    const loanId = await bob.mutation(api.loans.request, { toolId: drill, startDate: TODAY, endDate: "2026-06-12" });
    await expect(t.mutation(internal.devtools.backdateLoan, { loanId, days: 5 })).rejects.toThrow("LENDLOOP_DEV_TOOLS");
    vi.stubEnv("LENDLOOP_DEV_TOOLS", "true");
    expect(await t.mutation(internal.devtools.backdateLoan, { loanId, days: 5 })).toEqual({
      startDate: "2026-06-05",
      endDate: "2026-06-07",
    });
  });

  test("validates bodies", async () => {
    const { t, loanId } = await overdueLoan();
    expect((await signedPost(t, "/n8n/overdue-loans", { asOf: "15/06/2026" })).status).toBe(400);
    expect((await signedPost(t, "/n8n/reminders", { reminderKey: `${loanId}:2026-06-15`, status: "maybe" })).status).toBe(400);
    expect((await signedPost(t, "/n8n/reminders", { reminderKey: "nope:2026-06-15", status: "sent" })).status).toBe(404);
  });

  test("notification status write-back is idempotent", async () => {
    const { t, alice, bob } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 202 })));
    await bob.mutation(api.loans.request, { toolId: await listDrill(alice), startDate: TODAY, endDate: TODAY });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const [event] = await t.run(async (ctx) => await ctx.db.query("outbox").collect());
    const report = { eventId: event._id as Id<"outbox">, status: "sent" };
    expect(await (await signedPost(t, "/n8n/notification-status", report)).json()).toEqual({ found: true, changed: true });
    expect(await (await signedPost(t, "/n8n/notification-status", report)).json()).toEqual({ found: true, changed: false });
    expect((await signedPost(t, "/n8n/notification-status", { eventId: "nope", status: "sent" })).status).toBe(404);
    const [incoming] = await alice.query(api.loans.incoming, {});
    expect(incoming.activity[0]).toMatchObject({ label: "Lender notified of the request", status: "sent" });
  });

  test("the functions behind these endpoints are internal, not callable from a browser", () => {
    for (const fn of [reminders.overdue, reminders.record, notifications.report, notifications.deliver]) {
      expect((fn as unknown as { isInternal?: boolean }).isInternal).toBe(true);
    }
  });
});
