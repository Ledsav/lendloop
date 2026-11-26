import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { isAdmin, requireUser } from "./lib/auth";
import { today } from "./lib/dates";
import { audit } from "./lib/audit";
import { emitLoanEvent } from "./lib/events";
import { booked, nextFree, usage } from "./lib/itemStats";
import { availability, lentCount, loopFor, toolLoans } from "./lib/loans";
import { category, condition } from "./lib/validators";

const listingFields = {
  name: v.string(),
  category,
  condition,
  description: v.string(),
};

function cleanListing(input: { name: string; description: string }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 60) throw new ConvexError("Name must be 2-60 characters.");
  if (description.length > 500) throw new ConvexError("Description must be at most 500 characters.");
  return { name, description };
}

async function activeTools(ctx: Parameters<typeof availability>[0]) {
  return await ctx.db
    .query("tools")
    .withIndex("by_removed", (q) => q.eq("removedAt", undefined))
    .collect();
}

/**
 * Public page (no sign-in): available tools, name and category only. Nothing else leaves the
 * server, not even ids, so the public page can't be used to find out who owns what.
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const out: { name: string; category: Doc<"tools">["category"] }[] = [];
    for (const tool of await activeTools(ctx)) {
      if ((await availability(ctx, tool._id)) === "available") out.push({ name: tool.name, category: tool.category });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Signed-in browse view: every listing with its availability, optionally one category. */
export const list = query({
  args: { category: v.optional(category) },
  handler: async (ctx, args) => {
    const viewer = await requireUser(ctx);
    const tools = (await activeTools(ctx)).filter((t) => !args.category || t.category === args.category);
    const date = today();
    const rows = await Promise.all(
      tools.map(async (t) => {
        const owner = await ctx.db.get("users", t.ownerId);
        const loans = await toolLoans(ctx, t._id);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          availability: await availability(ctx, t._id),
          loop: await loopFor(ctx, viewer, t, loans, date),
          owner: { name: owner?.name ?? "?", trustedLender: owner?.trustedLender ?? false },
          isMine: t.ownerId === viewer._id,
        };
      }),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * The item page. Signed-in only, like the browse list. Dates of other people's loans are shown (to
 * pick free days), but who has the item only to its owner, that borrower and admins. Null for an id
 * that isn't a listing (any more), so an old link shows a plain "not here" page.
 */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const viewer = await requireUser(ctx);
    const toolId = ctx.db.normalizeId("tools", id);
    const tool = toolId && (await ctx.db.get("tools", toolId));
    if (!tool || tool.removedAt !== undefined) return null;
    const date = today();
    const [owner, loans] = await Promise.all([ctx.db.get("users", tool.ownerId), toolLoans(ctx, tool._id)]);
    const isMine = tool.ownerId === viewer._id;
    return {
      _id: tool._id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      description: tool.description,
      isMine,
      owner: {
        name: owner?.name ?? "?",
        trustedLender: owner?.trustedLender ?? false,
        lentCount: await lentCount(ctx, tool.ownerId),
      },
      loop: await loopFor(ctx, viewer, tool, loans, date),
      usage: usage(loans, date),
      nextFree: nextFree(loans, date),
      booked: booked(loans, date),
      myLoans: loans
        .filter((l) => l.borrowerId === viewer._id && l.endDate >= date)
        .flatMap((l) =>
          l.status === "requested" || l.status === "approved"
            ? [{ _id: l._id, startDate: l.startDate, endDate: l.endDate, status: l.status }]
            : [],
        ),
      pendingRequests: isMine ? loans.filter((l) => l.status === "requested").length : 0,
      today: date,
    };
  },
});

/** "My listings", with the number of requests waiting for an answer. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", viewer._id))
      .collect();
    const date = today();
    const rows = await Promise.all(
      tools
        .filter((t) => t.removedAt === undefined)
        .map(async (t) => {
          const loans = await toolLoans(ctx, t._id);
          const pending = loans.filter((l) => l.status === "requested");
          return {
            _id: t._id,
            name: t.name,
            category: t.category,
            condition: t.condition,
            description: t.description,
            availability: await availability(ctx, t._id),
            loop: await loopFor(ctx, viewer, t, loans, date),
            pendingRequests: pending.length,
          };
        }),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: listingFields,
  handler: async (ctx, args) => {
    const viewer = await requireUser(ctx);
    const toolId = await ctx.db.insert("tools", {
      ownerId: viewer._id,
      category: args.category,
      condition: args.condition,
      ...cleanListing(args),
    });
    await audit(ctx, viewer._id, "listing.created", toolId);
    return toolId;
  },
});

async function getActiveTool(ctx: MutationCtx, toolId: Id<"tools">) {
  const tool = await ctx.db.get("tools", toolId);
  if (!tool || tool.removedAt !== undefined) throw new ConvexError("Listing not found.");
  return tool;
}

/** Only the owner edits a listing (admins can remove it, not rewrite it). */
export const update = mutation({
  args: { toolId: v.id("tools"), ...listingFields },
  handler: async (ctx, { toolId, ...args }) => {
    const viewer = await requireUser(ctx);
    const tool = await getActiveTool(ctx, toolId);
    if (tool.ownerId !== viewer._id) throw new ConvexError("You can only edit your own listings.");
    await ctx.db.patch("tools", toolId, { category: args.category, condition: args.condition, ...cleanListing(args) });
    await audit(ctx, viewer._id, "listing.updated", toolId);
  },
});

/**
 * The owner removes their listing, or an admin removes any listing. Open requests are declined and
 * loans that haven't started are cancelled (each borrower is notified). An owner can't remove a tool
 * that is lent out right now; an admin can (moderation), and that loan still has to be returned.
 */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const viewer = await requireUser(ctx);
    const tool = await getActiveTool(ctx, toolId);
    const admin = isAdmin(viewer);
    if (tool.ownerId !== viewer._id && !admin) throw new ConvexError("You can only remove your own listings.");

    const date = today();
    const approved = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
      .collect();
    if (!admin && approved.some((l) => l.startDate <= date))
      throw new ConvexError("This tool is lent out right now: mark it returned before removing it.");

    const now = Date.now();
    for (const loan of approved.filter((l) => l.startDate > date)) {
      await ctx.db.patch("loans", loan._id, { status: "cancelled", decidedAt: now });
      await emitLoanEvent(ctx, "loan.cancelled", loan._id);
    }
    const requested = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "requested"))
      .collect();
    for (const loan of requested) {
      await ctx.db.patch("loans", loan._id, { status: "declined", decidedAt: now });
      await emitLoanEvent(ctx, "loan.declined", loan._id);
    }
    await ctx.db.patch("tools", toolId, { removedAt: now, removedBy: viewer._id });
    await audit(ctx, viewer._id, "listing.removed", toolId);
  },
});
