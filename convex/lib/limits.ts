import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Fair-use limits, the same for everyone (admins and Trusted Lenders included). */
export const REQUESTS_PER_HOUR = 10;
export const LISTINGS_PER_DAY = 20;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Every request the person made in the last hour counts, whatever happened to it since. */
export async function checkRequestLimit(ctx: MutationCtx, borrowerId: Id<"users">, now: number) {
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_borrower", (q) => q.eq("borrowerId", borrowerId))
    .collect();
  const recent = loans.filter((l) => (l.requestedAt ?? l._creationTime) > now - HOUR).length;
  if (recent >= REQUESTS_PER_HOUR)
    throw new ConvexError(`You've asked for ${REQUESTS_PER_HOUR} things in the last hour. Try again later.`);
}

/** Every listing the person created in the last 24 hours counts, removed ones included. */
export async function checkListingLimit(ctx: MutationCtx, ownerId: Id<"users">, now: number) {
  const recent = await ctx.db
    .query("tools")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId).gt("_creationTime", now - DAY))
    .take(LISTINGS_PER_DAY);
  if (recent.length >= LISTINGS_PER_DAY) throw new ConvexError(`You've listed ${LISTINGS_PER_DAY} things today. Try again tomorrow.`);
}
