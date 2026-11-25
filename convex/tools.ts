import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { isAdmin, requireUser } from "./lib/auth";
import { today } from "./lib/dates";
import { emitLoanEvent } from "./lib/events";
import { availability } from "./lib/loans";
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
    const rows = await Promise.all(
      tools.map(async (t) => {
        const owner = await ctx.db.get("users", t.ownerId);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          availability: await availability(ctx, t._id),
          owner: { name: owner?.name ?? "?", trustedLender: owner?.trustedLender ?? false },
          isMine: t.ownerId === viewer._id,
        };
      }),
    );
    return rows.sort((a, b) => a.name.localeCompare(b.name));
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
    const rows = await Promise.all(
      tools
        .filter((t) => t.removedAt === undefined)
        .map(async (t) => {
          const pending = await ctx.db
            .query("loans")
            .withIndex("by_tool_status", (q) => q.eq("toolId", t._id).eq("status", "requested"))
            .collect();
          return {
            _id: t._id,
            name: t.name,
            category: t.category,
            condition: t.condition,
            description: t.description,
            availability: await availability(ctx, t._id),
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
    return await ctx.db.insert("tools", {
      ownerId: viewer._id,
      category: args.category,
      condition: args.condition,
      ...cleanListing(args),
    });
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
  },
});
