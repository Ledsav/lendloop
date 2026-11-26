import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { requireAdmin } from "./lib/auth";
import { lentCount, loanView } from "./lib/loans";

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
          lentCount: await lentCount(ctx, u._id),
        };
      }),
    );
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    const admin = await requireAdmin(ctx);
    if (!(await ctx.db.get("users", userId))) throw new ConvexError("User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
    await audit(ctx, admin._id, "user.trustedLender", userId, { trusted });
  },
});

/** Automation that gave up: failed notifications and reminders, so nothing fails silently. */
export const failedAutomation = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("outbox").withIndex("by_status", (q) => q.eq("status", "failed")).collect();
    const reminders = (await ctx.db.query("reminders").collect()).filter((r) => r.status === "failed");
    // First names and the tool's name, so the admin can tell what failed for whom (never emails).
    const names = async (loanId: Id<"loans">) => {
      const loan = await ctx.db.get("loans", loanId);
      if (!loan) return { tool: "a removed loan", owner: "?", borrower: "?" };
      const [tool, owner, borrower] = await Promise.all([
        ctx.db.get("tools", loan.toolId),
        ctx.db.get("users", loan.ownerId),
        ctx.db.get("users", loan.borrowerId),
      ]);
      return { tool: tool?.name ?? "a removed tool", owner: owner?.name ?? "?", borrower: borrower?.name ?? "?" };
    };
    return {
      notifications: await Promise.all(
        events.map(async (e) => {
          const n = await names(e.loanId);
          return {
            _id: e._id,
            type: e.type,
            loanId: e.loanId,
            tool: n.tool,
            recipient: e.recipient === "owner" ? n.owner : n.borrower,
            attempts: e.attempts,
            error: e.lastError ?? "",
            at: e.updatedAt,
          };
        }),
      ),
      reminders: await Promise.all(
        reminders.map(async (r) => {
          const n = await names(r.loanId);
          return { _id: r._id, loanId: r.loanId, tool: n.tool, borrower: n.borrower, date: r.date, error: r.error ?? "", at: r.updatedAt };
        }),
      ),
    };
  },
});

/** Re-queue a failed notification as a new delivery (n8n drops repeats of the same delivery). */
export const retryNotification = mutation({
  args: { outboxId: v.id("outbox") },
  handler: async (ctx, { outboxId }) => {
    const admin = await requireAdmin(ctx);
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
    await audit(ctx, admin._id, "notification.retried", outboxId);
  },
});

/**
 * The audit log, newest first, with first names and item names resolved now (the log itself holds
 * only ids). A person or record that no longer exists comes back as null. Admins only.
 */
export const auditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("auditLog").order("desc").take(200);
    const userName = async (id: string | undefined) => {
      const userId = id ? ctx.db.normalizeId("users", id) : null;
      return (userId && (await ctx.db.get("users", userId))?.name) ?? null;
    };
    const toolName = async (id: Id<"tools"> | null) => (id && (await ctx.db.get("tools", id))?.name) ?? null;
    return await Promise.all(
      rows.map(async (row) => {
        let item: string | null = null;
        let other: string | null = null;
        const target = row.targetId;
        if (row.action.startsWith("listing.") && target) {
          item = await toolName(ctx.db.normalizeId("tools", target));
        } else if (row.action.startsWith("loan.") && target) {
          const loanId = ctx.db.normalizeId("loans", target);
          const loan = loanId && (await ctx.db.get("loans", loanId));
          if (loan) {
            item = await toolName(loan.toolId);
            if (row.action === "loan.requested") other = await userName(loan.ownerId);
            else if (row.action !== "loan.cancelled") other = await userName(loan.borrowerId);
          }
        } else if (row.action.startsWith("user.")) {
          other = await userName(target);
        } else if (row.action === "notification.retried" && target) {
          const outboxId = ctx.db.normalizeId("outbox", target);
          const event = outboxId && (await ctx.db.get("outbox", outboxId));
          const loan = event && (await ctx.db.get("loans", event.loanId));
          item = loan ? await toolName(loan.toolId) : null;
        }
        return {
          _id: row._id,
          at: row._creationTime,
          action: row.action,
          actor: await userName(row.actorId),
          bySystem: row.actorId === undefined,
          item,
          other,
          details: row.details ?? null,
        };
      }),
    );
  },
});

const AUDIT_RETENTION_MS = 365 * 86_400_000;
const PURGE_BATCH = 200;

/** Deletes one batch of audit entries older than a year (oldest first). */
export const purgeAuditLog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - AUDIT_RETENTION_MS;
    const old = await ctx.db
      .query("auditLog")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(PURGE_BATCH);
    for (const row of old) await ctx.db.delete("auditLog", row._id);
    return { deleted: old.length, done: old.length < PURGE_BATCH };
  },
});

/** Every night (convex/crons.ts): deletes audit entries older than a year, in batches. */
export const purgeAuditLogAll = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    let total = 0;
    for (;;) {
      const { deleted, done } = await ctx.runMutation(internal.admin.purgeAuditLog, {});
      total += deleted;
      if (done) return total;
    }
  },
});
