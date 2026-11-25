import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Development helper for trying the overdue reminders without waiting: moves a loan's dates back.
 * Internal (CLI or dashboard only) and refuses to run unless LENDLOOP_DEV_TOOLS=true is set on the
 * deployment, so it can't touch production data by accident.
 *   npx convex env set LENDLOOP_DEV_TOOLS true
 *   npx convex run devtools:backdateLoan '{"loanId": "<id from the loans table>", "days": 5}'
 */
export const backdateLoan = internalMutation({
  args: { loanId: v.id("loans"), days: v.number() },
  handler: async (ctx, { loanId, days }) => {
    if (process.env.LENDLOOP_DEV_TOOLS !== "true") throw new ConvexError("Set LENDLOOP_DEV_TOOLS=true on this development deployment first.");
    const loan = await ctx.db.get("loans", loanId);
    if (!loan) throw new ConvexError("Loan not found.");
    const shift = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
    await ctx.db.patch("loans", loanId, { startDate: shift(loan.startDate), endDate: shift(loan.endDate) });
    return { startDate: shift(loan.startDate), endDate: shift(loan.endDate) };
  },
});
