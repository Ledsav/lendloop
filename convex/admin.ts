import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { loanView } from "./lib/loans";

/** Every loan, newest first. Admins only (checked here, not just hidden in the UI). */
export const allLoans = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").take(200);
    return await Promise.all(loans.map((l) => loanView(ctx, l, viewer)));
  },
});

/** Users for the "Trusted Lender" switch. First names and counts only; no emails. */
export const users = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return await Promise.all(
      users.map(async (u) => {
        const tools = await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", u._id))
          .collect();
        return {
          _id: u._id,
          name: u.name,
          role: u.role,
          trustedLender: u.trustedLender,
          listings: tools.filter((t) => t.removedAt === undefined).length,
        };
      }),
    );
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get("users", userId))) throw new ConvexError("User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
  },
});

/** Automation that gave up: failed notifications and reminders, so nothing fails silently. */
export const failedAutomation = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("outbox").withIndex("by_status", (q) => q.eq("status", "failed")).collect();
    const reminders = (await ctx.db.query("reminders").collect()).filter((r) => r.status === "failed");
    return {
      notifications: events.map((e) => ({
        _id: e._id,
        type: e.type,
        loanId: e.loanId,
        attempts: e.attempts,
        error: e.lastError ?? "",
        at: e.updatedAt,
      })),
      reminders: reminders.map((r) => ({ _id: r._id, loanId: r.loanId, date: r.date, error: r.error ?? "", at: r.updatedAt })),
    };
  },
});

/** Re-queue a failed notification as a new delivery (n8n drops repeats of the same delivery). */
export const retryNotification = mutation({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get("outbox", outboxId);
    if (!event || event.status !== "failed") throw new ConvexError("Only failed notifications can be retried.");
    await ctx.db.patch("outbox", outboxId, {
      status: "pending",
      attempts: 0,
      generation: event.generation + 1,
      lastError: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.deliver, { outboxId });
  },
});
