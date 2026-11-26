import { v, type Infer } from "convex/values";

export const CATEGORIES = ["power tools", "hand tools", "garden", "kitchen", "camping", "cleaning", "other"] as const;
export const CONDITIONS = ["new", "good", "fair", "worn"] as const;

export const category = v.union(...CATEGORIES.map((c) => v.literal(c)));
export const condition = v.union(...CONDITIONS.map((c) => v.literal(c)));

export const loanStatus = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);

export const eventType = v.union(
  v.literal("loan.requested"),
  v.literal("loan.approved"),
  v.literal("loan.declined"),
  v.literal("loan.cancelled"),
  v.literal("loan.returned"),
);

/** What the audit log records: changes only, never reads. */
export const AUDIT_ACTIONS = [
  "listing.created",
  "listing.updated",
  "listing.removed",
  "loan.requested",
  "loan.approved",
  "loan.declined",
  "loan.cancelled",
  "loan.returned",
  "user.trustedLender",
  "user.role",
  "account.exported",
  "account.deleted",
  "notification.retried",
] as const;
export const auditAction = v.union(...AUDIT_ACTIONS.map((a) => v.literal(a)));

export type Category = Infer<typeof category>;
export type Condition = Infer<typeof condition>;
export type LoanStatus = Infer<typeof loanStatus>;
export type EventType = Infer<typeof eventType>;
export type AuditAction = Infer<typeof auditAction>;
