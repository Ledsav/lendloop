import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isAdmin } from "./auth";
import { daysBetween, today } from "./dates";

type Ctx = QueryCtx | MutationCtx;

export type Availability = "available" | "on_loan" | "overdue";

/** A tool is on loan while an approved loan has started and hasn't been returned. */
export async function availability(ctx: Ctx, toolId: Id<"tools">, now: number = Date.now()): Promise<Availability> {
  const date = today(now);
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
  const current = approved.filter((l) => l.startDate <= date);
  if (current.length === 0) return "available";
  return current.some((l) => l.endDate < date) ? "overdue" : "on_loan";
}

/** Who has the item right now: shown only to the item's owner, that borrower and admins. */
export type Holder = { name: string; isViewer: boolean } | null;

/** Where an item is on its loop: at home, out (day N of M) or late. */
export type Loop =
  | { state: "home" }
  | { state: "out"; startDate: string; endDate: string; day: number; days: number; holder: Holder }
  | { state: "late"; startDate: string; endDate: string; daysLate: number; holder: Holder };

/** Every loan of one tool, whatever its status. */
export async function toolLoans(ctx: Ctx, toolId: Id<"tools">): Promise<Doc<"loans">[]> {
  return await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId))
    .collect();
}

/** The approved loan that has started; with several, the one due back first (a late one wins). */
export function currentLoan(loans: Doc<"loans">[], date: string): Doc<"loans"> | null {
  const started = loans.filter((l) => l.status === "approved" && l.startDate <= date);
  if (started.length === 0) return null;
  return started.reduce((a, b) => (b.endDate < a.endDate ? b : a));
}

export async function loopFor(
  ctx: Ctx,
  viewer: Doc<"users">,
  tool: Doc<"tools">,
  loans: Doc<"loans">[],
  date: string,
): Promise<Loop> {
  const loan = currentLoan(loans, date);
  if (!loan) return { state: "home" };
  const involved = viewer._id === tool.ownerId || viewer._id === loan.borrowerId || isAdmin(viewer);
  const borrower = involved ? await ctx.db.get("users", loan.borrowerId) : null;
  const holder: Holder = borrower ? { name: borrower.name, isViewer: borrower._id === viewer._id } : null;
  const { startDate, endDate } = loan;
  if (endDate < date) return { state: "late", startDate, endDate, daysLate: daysBetween(endDate, date), holder };
  return {
    state: "out",
    startDate,
    endDate,
    day: daysBetween(startDate, date) + 1,
    days: daysBetween(startDate, endDate) + 1,
    holder,
  };
}

/** How many loans a lender has seen through to the end ("lent N times"). */
export async function lentCount(ctx: Ctx, ownerId: Id<"users">): Promise<number> {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  return loans.filter((l) => l.status === "returned").length;
}

export const isOverdue = (loan: Doc<"loans">, now: number = Date.now()) =>
  loan.status === "approved" && loan.endDate < today(now);

const EVENT_LABELS: Record<Doc<"outbox">["type"], string> = {
  "loan.requested": "Lender notified of the request",
  "loan.approved": "Borrower notified of the approval",
  "loan.declined": "Borrower notified of the decline",
  "loan.cancelled": "Notified of the cancellation",
  "loan.returned": "Borrower notified of the return",
};

export type Activity = { kind: "notification" | "reminder"; label: string; status: string; at: number };

/** Recent automation activity for one loan (bonus: "Reminder sent 2 days ago"). */
export async function loanActivity(ctx: Ctx, loanId: Id<"loans">): Promise<Activity[]> {
  const events = await ctx.db.query("outbox").withIndex("by_loan", (q) => q.eq("loanId", loanId)).collect();
  const reminders = await ctx.db.query("reminders").withIndex("by_loan", (q) => q.eq("loanId", loanId)).collect();
  return [
    ...events.map((e) => ({ kind: "notification" as const, label: EVENT_LABELS[e.type], status: e.status, at: e.updatedAt })),
    ...reminders.map((r) => ({ kind: "reminder" as const, label: `Overdue reminder (${r.date})`, status: r.status, at: r.updatedAt })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);
}

/** A loan row as its participants (or an admin) see it: first names only, never emails. */
export async function loanView(ctx: Ctx, loan: Doc<"loans">) {
  const [tool, owner, borrower] = await Promise.all([
    ctx.db.get("tools", loan.toolId),
    ctx.db.get("users", loan.ownerId),
    ctx.db.get("users", loan.borrowerId),
  ]);
  return {
    _id: loan._id,
    _creationTime: loan._creationTime,
    status: loan.status,
    startDate: loan.startDate,
    endDate: loan.endDate,
    overdue: isOverdue(loan),
    tool: { _id: loan.toolId, name: tool?.name ?? "Removed tool", removed: !tool || tool.removedAt !== undefined },
    owner: { name: owner?.name ?? "?", trustedLender: owner?.trustedLender ?? false },
    borrower: { name: borrower?.name ?? "?" },
    activity: await loanActivity(ctx, loan._id),
  };
}
