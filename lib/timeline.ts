import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import type { TimelineEntry } from "@/convex/lib/loans";
import type { EventType } from "@/convex/lib/validators";
import { rangeLong } from "./format";

/** A loan as My requests, Incoming requests and Admin receive it. */
export type LoanRowData = FunctionReturnType<typeof api.loans.myRequests>[number];

export const EVENT_NOUN: Record<EventType, string> = {
  "loan.requested": "request",
  "loan.approved": "approval",
  "loan.declined": "answer",
  "loan.cancelled": "cancellation",
  "loan.returned": "return",
};

/** One line of a loan's story, worded from the viewer's side ("you" when it's them). */
export function timelineText(entry: TimelineEntry, loan: LoanRowData): string {
  const role = loan.viewerRole;
  const lender = loan.owner.name;
  const borrower = loan.borrower.name;
  switch (entry.kind) {
    case "requested":
      return `${role === "borrower" ? "You" : borrower} asked for ${rangeLong(loan.startDate, loan.endDate)}`;
    case "approved":
      return `${role === "owner" ? "You" : lender} said yes`;
    case "declined":
      return `${role === "owner" ? "You" : lender} said no`;
    case "returned":
      return `${role === "owner" ? "You" : lender} marked it returned`;
    case "cancelled":
      if (entry.by === "owner") return "The listing was removed, so the loan was cancelled";
      return `${role === "borrower" ? "You" : borrower} cancelled the request`;
    case "reminder": {
      const who = role === "borrower" ? "you" : borrower;
      return entry.status === "sent" ? `Reminder sent to ${who}` : `Reminder to ${who} failed`;
    }
    case "email": {
      const toViewer = entry.to === role;
      const name = entry.to === "owner" ? lender : borrower;
      if (entry.status === "sent") {
        if (entry.event === "loan.requested") {
          if (toViewer) return `You were emailed ${borrower}'s request`;
          return role === "borrower" ? `${lender} was emailed your request` : `${lender} was emailed ${borrower}'s request`;
        }
        return `${toViewer ? "You were" : `${name} was`} emailed about the ${EVENT_NOUN[entry.event]}`;
      }
      // No full stops: the page adds ", <time>" after each line.
      if (entry.status === "failed") return `Couldn't email ${toViewer ? "you" : name} (an admin can retry it)`;
      if (entry.status === "skipped")
        return `${toViewer ? "You weren't" : `${name} wasn't`} emailed (email isn't set up here)`;
      return `Emailing ${toViewer ? "you" : name}`;
    }
  }
}

export const isFailure = (entry: TimelineEntry) =>
  (entry.kind === "email" || entry.kind === "reminder") && entry.status === "failed";

/** Loans in the order a page shows them: out now (late first), waiting, coming up, past (newest first). */
export function groupLoans<T extends Pick<LoanRowData, "status" | "startDate" | "endDate">>(loans: T[], today: string) {
  const by = (key: "startDate" | "endDate", dir = 1) => (a: T, b: T) => dir * a[key].localeCompare(b[key]);
  const approved = loans.filter((l) => l.status === "approved");
  return {
    now: approved.filter((l) => l.startDate <= today).sort(by("endDate")),
    waiting: loans.filter((l) => l.status === "requested").sort(by("startDate")),
    upcoming: approved.filter((l) => l.startDate > today).sort(by("startDate")),
    past: loans.filter((l) => l.status !== "approved" && l.status !== "requested").sort(by("startDate", -1)),
  };
}
