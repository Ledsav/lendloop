import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { EventType } from "./validators";

/** Who hears about each event unless the caller says otherwise (a cancellation can go either way). */
const DEFAULT_RECIPIENT: Record<EventType, "owner" | "borrower"> = {
  "loan.requested": "owner",
  "loan.approved": "borrower",
  "loan.declined": "borrower",
  "loan.cancelled": "borrower",
  "loan.returned": "borrower",
};

/**
 * Records a loan event in the outbox, in the same transaction as the change that caused it, and
 * schedules its delivery to n8n. If the mutation rolls back, so does the event.
 */
export async function emitLoanEvent(
  ctx: MutationCtx,
  type: EventType,
  loanId: Id<"loans">,
  recipient: "owner" | "borrower" = DEFAULT_RECIPIENT[type],
) {
  const outboxId = await ctx.db.insert("outbox", {
    type,
    loanId,
    recipient,
    status: "pending",
    attempts: 0,
    generation: 0,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, { outboxId });
  return outboxId;
}
