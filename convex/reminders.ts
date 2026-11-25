import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { daysBetween } from "./lib/dates";

export const reminderKey = (loanId: string, date: string) => `${loanId}:${date}`;

/**
 * Approved loans whose return date is before `asOf` and that haven't had a reminder sent for that
 * day yet. Returns only what the reminder email needs.
 */
export const overdue = internalQuery({
  args: { asOf: v.string() },
  handler: async (ctx, { asOf }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("endDate", asOf))
      .collect();
    const out = [];
    for (const loan of loans) {
      const key = reminderKey(loan._id, asOf);
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (existing?.status === "sent") continue; // already reminded today: a re-run sends nothing twice
      const [tool, borrower] = await Promise.all([ctx.db.get("tools", loan.toolId), ctx.db.get("users", loan.borrowerId)]);
      if (!borrower?.email) continue;
      out.push({
        loanId: loan._id,
        reminderKey: key,
        borrower: { name: borrower.name, email: borrower.email },
        tool: { name: tool?.name ?? "the tool" },
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, asOf),
      });
    }
    return out;
  },
});

/**
 * n8n writes back the outcome of one reminder. Upsert by key: retries and re-runs update the same
 * row (and count in `writes`) instead of creating duplicates. "sent" is final.
 */
export const record = internalMutation({
  args: {
    reminderKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { reminderKey: key, status, error }) => {
    const [rawLoanId, date] = key.split(":");
    const loanId = rawLoanId ? ctx.db.normalizeId("loans", rawLoanId) : null;
    if (!loanId || !date || !(await ctx.db.get("loans", loanId))) return { ok: false as const, reason: "unknown loan" };
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch("reminders", existing._id, {
        status: existing.status === "sent" ? "sent" : status,
        error: existing.status === "sent" || status === "sent" ? undefined : error?.slice(0, 300),
        writes: existing.writes + 1,
        updatedAt: now,
      });
      return { ok: true as const, duplicate: true };
    }
    await ctx.db.insert("reminders", {
      key,
      loanId,
      date,
      status,
      error: status === "failed" ? error?.slice(0, 300) : undefined,
      writes: 1,
      updatedAt: now,
    });
    return { ok: true as const, duplicate: false };
  },
});
