import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { thing } from "./format";

/** One audit entry as the Admin page receives it (names resolved, possibly missing). */
export type AuditRow = FunctionReturnType<typeof api.admin.auditLog>[number];

/** An audit entry in plain words, from the admin's side. Missing people read "someone". */
export function auditText(row: AuditRow): string {
  const who = row.actor ?? "someone";
  const Who = who.charAt(0).toUpperCase() + who.slice(1);
  const other = row.other ?? "someone";
  const it = row.item ? thing(row.item) : "a removed item";
  switch (row.action) {
    case "listing.created":
      return `${Who} listed ${it}`;
    case "listing.updated":
      return `${Who} edited ${it}`;
    case "listing.removed":
      return `${Who} removed ${it}`;
    case "loan.requested":
      return `${Who} asked ${other} for ${it}`;
    case "loan.approved":
      return `${Who} approved ${other}'s request for ${it}`;
    case "loan.declined":
      return `${Who} declined ${other}'s request for ${it}`;
    case "loan.cancelled":
      return `${Who} cancelled a request for ${it}`;
    case "loan.returned":
      return `${Who} marked ${it} returned by ${other}`;
    case "user.trustedLender":
      return row.details?.trusted ? `${Who} made ${other} a trusted lender` : `${Who} removed ${other}'s trusted lender mark`;
    case "user.role": {
      const role = row.details?.role === "admin" ? "admin" : "a user";
      const Other = other.charAt(0).toUpperCase() + other.slice(1);
      return `${Other} was made ${role}${row.bySystem ? " from the command line" : ` by ${who}`}`;
    }
    case "account.exported":
      return `${Who} downloaded their data`;
    case "account.deleted":
      return "A neighbour deleted their account";
    case "notification.retried":
      return `${Who} retried an email about ${it}`;
  }
}
