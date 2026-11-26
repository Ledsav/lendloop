import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { audit } from "./lib/audit";
import { requireUser } from "./lib/auth";

const iso = (ms: number) => new Date(ms).toISOString();

async function myLoans(ctx: QueryCtx, viewer: Doc<"users">) {
  const asBorrower = await ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", viewer._id)).collect();
  const asLender = await ctx.db.query("loans").withIndex("by_owner", (q) => q.eq("ownerId", viewer._id)).collect();
  return { asBorrower, asLender };
}

/**
 * GDPR access and portability: everything LendLoop holds about the signed-in person, as plain data
 * they can save. Other people appear by first name only.
 */
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const tools = await ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", viewer._id)).collect();
    const { asBorrower, asLender } = await myLoans(ctx, viewer);
    const describe = async (loan: Doc<"loans">, role: "borrower" | "lender") => {
      const [tool, other] = await Promise.all([
        ctx.db.get("tools", loan.toolId),
        ctx.db.get("users", role === "borrower" ? loan.ownerId : loan.borrowerId),
      ]);
      return {
        item: tool?.name ?? "A removed item",
        role,
        otherPerson: other?.name ?? "Someone",
        startDate: loan.startDate,
        endDate: loan.endDate,
        status: loan.status,
        requested: iso(loan.requestedAt ?? loan._creationTime),
      };
    };
    const activity = await ctx.db.query("auditLog").withIndex("by_actor", (q) => q.eq("actorId", viewer._id)).collect();
    return {
      exportedAt: iso(Date.now()),
      profile: {
        firstName: viewer.name,
        email: viewer.email,
        role: viewer.role,
        trustedLender: viewer.trustedLender,
        joined: iso(viewer._creationTime),
      },
      listings: tools.map((t) => ({
        name: t.name,
        category: t.category,
        condition: t.condition,
        note: t.description,
        listed: iso(t._creationTime),
        removed: t.removedAt === undefined ? null : iso(t.removedAt),
      })),
      loans: [
        ...(await Promise.all(asBorrower.map((l) => describe(l, "borrower")))),
        ...(await Promise.all(asLender.map((l) => describe(l, "lender")))),
      ],
      activity: activity.map((a) => ({ action: a.action, at: iso(a._creationTime) })),
    };
  },
});

/** The page calls this after saving the file, so the download shows in the audit log. */
export const recordExport = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    await audit(ctx, viewer._id, "account.exported");
  },
});

/** What still has to be closed before an account can go, in plain words. */
export function openLoansMessage(counts: { waiting: number; lentOut: number; borrowing: number }) {
  const parts = [
    counts.waiting > 0 && `${counts.waiting} waiting for your answer`,
    counts.lentOut > 0 && `${counts.lentOut} lent out`,
    counts.borrowing > 0 && `${counts.borrowing} you're borrowing or asked for`,
  ].filter(Boolean);
  return `Close your open loans first: ${parts.join(", ")}.`;
}

/**
 * GDPR erasure. Refused on the demo, for the only admin, and while loans are open (someone is
 * relying on them). Otherwise: removes the person's listings, stops any email not yet sent about
 * their loans, and anonymises them. Past loans stay for the other neighbour, showing "A former
 * neighbour". The page then deletes the Clerk sign-in and signs out; signing in again later starts a
 * new, empty account, because the old row no longer matches the sign-in.
 */
export const deleteMine = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    if (process.env.LENDLOOP_DEMO === "true")
      throw new ConvexError("The demo accounts can't be deleted. On a real deployment this deletes your data.");
    if (viewer.role === "admin") {
      const admins = (await ctx.db.query("users").collect()).filter((u) => u.role === "admin" && u.deletedAt === undefined);
      if (admins.length <= 1) throw new ConvexError("You're the only admin. Make someone else an admin first (README, step 5).");
    }
    const { asBorrower, asLender } = await myLoans(ctx, viewer);
    const open = (l: Doc<"loans">) => l.status === "requested" || l.status === "approved";
    const counts = {
      waiting: asLender.filter((l) => l.status === "requested").length,
      lentOut: asLender.filter((l) => l.status === "approved").length,
      borrowing: asBorrower.filter(open).length,
    };
    if (counts.waiting + counts.lentOut + counts.borrowing > 0) throw new ConvexError(openLoansMessage(counts));

    const now = Date.now();
    const tools = await ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", viewer._id)).collect();
    // Every listing goes, and the note the person wrote goes with it (removed ones included); the item's
    // name and category stay, so the other neighbour's loan history still makes sense.
    for (const tool of tools)
      await ctx.db.patch("tools", tool._id, {
        description: "",
        ...(tool.removedAt === undefined ? { removedAt: now, removedBy: viewer._id } : {}),
      });
    for (const loan of [...asBorrower, ...asLender]) {
      const events = await ctx.db.query("outbox").withIndex("by_loan", (q) => q.eq("loanId", loan._id)).collect();
      for (const e of events.filter((e) => e.status === "pending" || e.status === "failed"))
        await ctx.db.patch("outbox", e._id, { status: "skipped", lastError: "account deleted", updatedAt: now });
    }
    await ctx.db.patch("users", viewer._id, {
      name: "A former neighbour",
      email: "",
      trustedLender: false,
      role: "user",
      tokenIdentifier: `deleted|${viewer._id}`,
      deletedAt: now,
    });
    await audit(ctx, viewer._id, "account.deleted");
    return null;
  },
});
