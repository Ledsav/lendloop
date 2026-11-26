import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { AuditAction } from "./validators";

/**
 * Records a change in the audit log, in the same transaction as the change itself (if the mutation
 * rolls back, so does the entry). Ids and non-personal details only.
 */
export async function audit(
  ctx: MutationCtx,
  actorId: Id<"users"> | undefined,
  action: AuditAction,
  targetId?: string,
  details?: Record<string, string | boolean | number>,
) {
  await ctx.db.insert("auditLog", { actorId, action, targetId, details });
}
