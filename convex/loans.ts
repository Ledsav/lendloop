import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { overlaps, today, validateLoanDates } from "./lib/dates";
import { audit } from "./lib/audit";
import { emitLoanEvent } from "./lib/events";
import { loanView } from "./lib/loans";

async function getLoan(ctx: MutationCtx, loanId: Id<"loans">) {
  const loan = await ctx.db.get("loans", loanId);
  if (!loan) throw new ConvexError("Request not found.");
  return loan;
}

async function approvedLoans(ctx: MutationCtx, toolId: Id<"tools">) {
  return await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
}

function expectStatus(loan: Doc<"loans">, ...allowed: Doc<"loans">["status"][]) {
  if (!allowed.includes(loan.status)) throw new ConvexError(`This request is already ${loan.status}.`);
}

/** Ask to borrow someone else's tool for an inclusive date range (UTC dates). */
export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const viewer = await requireUser(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (!tool || tool.removedAt !== undefined) throw new ConvexError("Listing not found.");
    if (tool.ownerId === viewer._id) throw new ConvexError("You can't borrow your own tool.");
    validateLoanDates(startDate, endDate);
    const range = { startDate, endDate };

    if ((await approvedLoans(ctx, toolId)).some((l) => overlaps(l, range)))
      throw new ConvexError("The tool is already lent out for some of those dates.");
    const mine = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id))
      .collect();
    if (mine.some((l) => l.toolId === toolId && l.status === "requested" && overlaps(l, range)))
      throw new ConvexError("You already asked for this tool for those dates.");

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: viewer._id,
      startDate,
      endDate,
      status: "requested",
      requestedAt: Date.now(),
    });
    await emitLoanEvent(ctx, "loan.requested", loanId);
    await audit(ctx, viewer._id, "loan.requested", loanId);
    return loanId;
  },
});

/** The lender approves; rejected if another approved loan overlaps (no double booking). */
export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const viewer = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== viewer._id) throw new ConvexError("Only the lender can approve this request.");
    expectStatus(loan, "requested");
    if (loan.endDate < today()) throw new ConvexError("These dates are in the past: decline the request instead.");
    const tool = await ctx.db.get("tools", loan.toolId);
    if (!tool || tool.removedAt !== undefined) throw new ConvexError("This listing was removed.");
    if ((await approvedLoans(ctx, loan.toolId)).some((l) => overlaps(l, loan)))
      throw new ConvexError("You already approved another loan for some of those dates.");
    await ctx.db.patch("loans", loanId, { status: "approved", decidedAt: Date.now() });
    await emitLoanEvent(ctx, "loan.approved", loanId);
    await audit(ctx, viewer._id, "loan.approved", loanId);
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const viewer = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== viewer._id) throw new ConvexError("Only the lender can decline this request.");
    expectStatus(loan, "requested");
    await ctx.db.patch("loans", loanId, { status: "declined", decidedAt: Date.now() });
    await emitLoanEvent(ctx, "loan.declined", loanId);
    await audit(ctx, viewer._id, "loan.declined", loanId);
  },
});

/** The borrower withdraws a request, or an approved loan that hasn't started yet. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const viewer = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    if (loan.borrowerId !== viewer._id) throw new ConvexError("Only the borrower can cancel this request.");
    expectStatus(loan, "requested", "approved");
    if (loan.status === "approved" && loan.startDate <= today())
      throw new ConvexError("This loan has started: the lender marks it returned.");
    await ctx.db.patch("loans", loanId, { status: "cancelled", decidedAt: Date.now() });
    await emitLoanEvent(ctx, "loan.cancelled", loanId, "owner");
    await audit(ctx, viewer._id, "loan.cancelled", loanId);
  },
});

/** The lender confirms the tool came back (the borrower can't close a loan on their own). */
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const viewer = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    if (loan.ownerId !== viewer._id) throw new ConvexError("Only the lender can mark this loan returned.");
    expectStatus(loan, "approved");
    await ctx.db.patch("loans", loanId, { status: "returned", returnedAt: Date.now() });
    await emitLoanEvent(ctx, "loan.returned", loanId);
    await audit(ctx, viewer._id, "loan.returned", loanId);
  },
});

/** "My requests": loans where I'm the borrower. */
export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id))
      .order("desc")
      .take(100);
    return await Promise.all(loans.map((l) => loanView(ctx, l, viewer)));
  },
});

/** "Incoming requests": loans of my tools. */
export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .order("desc")
      .take(100);
    return await Promise.all(loans.map((l) => loanView(ctx, l, viewer)));
  },
});
