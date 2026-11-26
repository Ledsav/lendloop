import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { getViewer } from "./lib/auth";

/** Creates or refreshes the signed-in user's row from the verified Clerk identity. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in.");
    // Clerk's Convex integration doesn't put the email in the token by itself: the session token
    // needs the email claim (README, step 2). Without it nobody could be notified or made admin.
    if (!identity.email) throw new ConvexError("Your sign-in has no email address.");
    const name = (identity.givenName || identity.name?.split(" ")[0] || identity.nickname || "Neighbour").slice(0, 40);
    const email = identity.email;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (existing) {
      if (existing.name !== name || existing.email !== email) await ctx.db.patch("users", existing._id, { name, email });
      return existing._id;
    }
    // Everyone starts as a plain user; admins are promoted from the CLI (setRole below).
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

/** What the UI needs about the viewer. No email: the client never needs it. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    return { _id: user._id, name: user.name, role: user.role, trustedLender: user.trustedLender };
  },
});

/**
 * Promote or demote a user. Internal: it can't be called from the browser, only from the CLI or the
 * dashboard by someone with deployment access:
 *   npx convex run users:setRole '{"email": "you@example.com", "role": "admin"}'
 */
export const setRole = internalMutation({
  args: { email: v.string(), role: v.union(v.literal("admin"), v.literal("user")) },
  handler: async (ctx, { email, role }) => {
    const matches = (await ctx.db.query("users").collect()).filter((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matches.length !== 1) throw new ConvexError(`Expected one user with that email, found ${matches.length}. Sign in once first.`);
    await ctx.db.patch("users", matches[0]._id, { role });
    await audit(ctx, undefined, "user.role", matches[0]._id, { role });
    return matches[0]._id;
  },
});
