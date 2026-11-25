import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { category, condition, eventType, loanStatus } from "./lib/validators";

export default defineSchema({
  // One row per Clerk user, created on first sign-in (users.store). The role lives here, on the
  // server, so the client can never grant itself admin.
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(), // first name only: all other users ever see
    email: v.string(), // used only to send notifications; never returned to other users
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition,
    description: v.string(),
    // Soft delete: loan history (and its audit trail) survives a removed listing.
    removedAt: v.optional(v.number()),
    removedBy: v.optional(v.id("users")),
  })
    .index("by_owner", ["ownerId"])
    .index("by_removed", ["removedAt"]),

  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"), // denormalized from the tool: the lender
    borrowerId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD (UTC)
    endDate: v.string(), // YYYY-MM-DD (UTC), inclusive
    status: loanStatus,
    requestedAt: v.optional(v.number()), // older rows fall back to _creationTime
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status_end", ["status", "endDate"]),

  // Transactional outbox for the "request notification" workflow. A mutation writes the event in the
  // same transaction as the state change; an action delivers it to n8n (signed, retried with
  // backoff). n8n reports back when the notification was actually sent.
  outbox: defineTable({
    type: eventType,
    loanId: v.id("loans"),
    recipient: v.union(v.literal("owner"), v.literal("borrower")), // who gets the notification
    status: v.union(
      v.literal("pending"), // waiting for delivery to n8n
      v.literal("accepted"), // n8n accepted it (2xx)
      v.literal("sent"), // n8n reported the notification as sent
      v.literal("failed"), // gave up (delivery or sending): shown to admins
      v.literal("skipped"), // no n8n configured (local development)
    ),
    attempts: v.number(),
    // Bumped when an admin retries a failed notification. n8n de-duplicates on
    // `${eventId}:${generation}`, so network retries are dropped but a deliberate retry is sent.
    generation: v.number(),
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_status", ["status"]),

  // Overdue reminders written back by n8n. `key` = loanId + date makes write-backs idempotent:
  // a retried write-back updates the same row instead of creating a second one.
  reminders: defineTable({
    key: v.string(),
    loanId: v.id("loans"),
    date: v.string(), // YYYY-MM-DD the reminder belongs to
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    writes: v.number(), // how many write-backs arrived for this key (retries show up here)
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_loan", ["loanId"]),

  // Development only: every row devtools:seed wrote, so a second run is a no-op and
  // `{"fresh": true}` can remove exactly the sample data before writing it again.
  seedRows: defineTable({
    table: v.union(v.literal("users"), v.literal("tools"), v.literal("loans"), v.literal("outbox"), v.literal("reminders")),
    docId: v.string(),
  }),
});
