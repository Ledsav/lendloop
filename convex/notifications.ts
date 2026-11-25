import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { EVENT_ID_HEADER, signatureHeaders } from "./lib/hmac";

export const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 30_000; // 30s, 1m, 2m, 4m, 8m between attempts

/**
 * The event as n8n receives it: only what the notification needs (the recipient's first name and
 * email, the tool's name, the dates). No ids of users, no descriptions, nothing about the other
 * party beyond a first name.
 */
export const payloadFor = internalQuery({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    const event = await ctx.db.get("outbox", outboxId);
    if (!event || event.status !== "pending") return null;
    const loan = await ctx.db.get("loans", event.loanId);
    if (!loan) return { error: "loan not found" as const };
    const [tool, owner, borrower] = await Promise.all([
      ctx.db.get("tools", loan.toolId),
      ctx.db.get("users", loan.ownerId),
      ctx.db.get("users", loan.borrowerId),
    ]);
    const [recipient, other] = event.recipient === "owner" ? [owner, borrower] : [borrower, owner];
    if (!recipient?.email) return { error: "recipient has no email address" as const };
    return {
      payload: {
        eventId: event._id,
        deliveryId: `${event._id}:${event.generation}`,
        type: event.type,
        occurredAt: new Date(event._creationTime).toISOString(),
        recipient: { name: recipient.name, email: recipient.email, role: event.recipient },
        otherParty: { name: other?.name ?? "A neighbor" },
        tool: { name: tool?.name ?? "a tool" },
        loan: { id: loan._id, startDate: loan.startDate, endDate: loan.endDate, status: loan.status },
      },
    };
  },
});

/** Delivers one outbox event to the n8n webhook, signed; retries with exponential backoff. */
export const deliver = internalAction({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    const prepared = await ctx.runQuery(internal.notifications.payloadFor, { outboxId });
    if (prepared === null) return; // already delivered, skipped or given up
    if ("error" in prepared) {
      await ctx.runMutation(internal.notifications.finish, { outboxId, status: "failed", error: prepared.error });
      return;
    }
    const url = process.env.N8N_LOAN_EVENTS_WEBHOOK_URL;
    const secret = process.env.LENDLOOP_TO_N8N_SECRET;
    if (!url || !secret) {
      await ctx.runMutation(internal.notifications.finish, {
        outboxId,
        status: "skipped",
        error: "N8N_LOAN_EVENTS_WEBHOOK_URL / LENDLOOP_TO_N8N_SECRET not set",
      });
      return;
    }
    const body = JSON.stringify(prepared.payload);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [EVENT_ID_HEADER]: outboxId,
          ...(await signatureHeaders(secret, body)),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`n8n answered HTTP ${res.status}`);
      await ctx.runMutation(internal.notifications.finish, { outboxId, status: "accepted" });
    } catch (err) {
      await ctx.runMutation(internal.notifications.retryLater, {
        outboxId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
});

export const finish = internalMutation({
  args: {
    outboxId: v.id("outbox"),
    status: v.union(v.literal("accepted"), v.literal("failed"), v.literal("skipped")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { outboxId, status, error }) => {
    const event = await ctx.db.get("outbox", outboxId);
    if (!event || event.status !== "pending") return;
    await ctx.db.patch("outbox", outboxId, {
      status,
      attempts: event.attempts + 1,
      lastError: error,
      updatedAt: Date.now(),
    });
  },
});

export const retryLater = internalMutation({
  args: { outboxId: v.id("outbox"), error: v.string() },
  handler: async (ctx, { outboxId, error }) => {
    const event = await ctx.db.get("outbox", outboxId);
    if (!event || event.status !== "pending") return;
    const attempts = event.attempts + 1;
    const giveUp = attempts >= MAX_ATTEMPTS;
    await ctx.db.patch("outbox", outboxId, {
      attempts,
      lastError: error.slice(0, 300),
      status: giveUp ? "failed" : "pending",
      updatedAt: Date.now(),
    });
    if (!giveUp) {
      await ctx.scheduler.runAfter(BASE_DELAY_MS * 2 ** (attempts - 1), internal.notifications.deliver, { outboxId });
    }
  },
});

/** n8n reports the outcome of sending (POST /n8n/notification-status). Idempotent. */
export const report = internalMutation({
  args: { eventId: v.string(), status: v.union(v.literal("sent"), v.literal("failed")), error: v.optional(v.string()) },
  handler: async (ctx, { eventId, status, error }) => {
    const outboxId = ctx.db.normalizeId("outbox", eventId);
    const event = outboxId && (await ctx.db.get("outbox", outboxId));
    if (!outboxId || !event) return { found: false, changed: false };
    if (event.status === "sent" || event.status === status) return { found: true, changed: false }; // retry: no-op
    await ctx.db.patch("outbox", outboxId, {
      status,
      lastError: status === "failed" ? (error ?? "sending failed").slice(0, 300) : undefined,
      updatedAt: Date.now(),
    });
    return { found: true, changed: true };
  },
});
