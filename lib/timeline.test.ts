import { describe, expect, test } from "vitest";
import type { TimelineEntry } from "@/convex/lib/loans";
import type { EventType } from "@/convex/lib/validators";
import { loanFixture } from "./test.fixtures";
import { groupLoans, timelineText } from "./timeline";

const email = (status: "pending" | "accepted" | "sent" | "failed" | "skipped", to: "owner" | "borrower" = "owner", event: EventType = "loan.requested") =>
  ({ kind: "email", at: 0, event, to, status }) as TimelineEntry;

describe("a loan's story in plain words", () => {
  test("who was emailed, from each side", () => {
    expect(timelineText(email("sent"), loanFixture("borrower"))).toBe("Lena was emailed your request");
    expect(timelineText(email("sent"), loanFixture("owner"))).toBe("You were emailed Sam's request");
    expect(timelineText(email("sent"), loanFixture("admin"))).toBe("Lena was emailed Sam's request");
    expect(timelineText(email("sent", "borrower", "loan.approved"), loanFixture("borrower"))).toBe("You were emailed about the approval");
    expect(timelineText(email("sent", "borrower", "loan.approved"), loanFixture("owner"))).toBe("Sam was emailed about the approval");
  });

  test("emails that didn't go out say so", () => {
    expect(timelineText(email("failed"), loanFixture("borrower"))).toBe("Couldn't email Lena (an admin can retry it)");
    expect(timelineText(email("skipped"), loanFixture("admin"))).toBe("Lena wasn't emailed (email isn't set up here)");
    expect(timelineText(email("pending"), loanFixture("borrower"))).toBe("Emailing Lena");
  });

  test("what people did", () => {
    expect(timelineText({ kind: "requested", at: 0 }, loanFixture("borrower"))).toBe("You asked for Tue 1 – Thu 3 Dec");
    expect(timelineText({ kind: "requested", at: 0 }, loanFixture("owner"))).toBe("Sam asked for Tue 1 – Thu 3 Dec");
    expect(timelineText({ kind: "approved", at: 0 }, loanFixture("owner"))).toBe("You said yes");
    expect(timelineText({ kind: "declined", at: 0 }, loanFixture("borrower"))).toBe("Lena said no");
    expect(timelineText({ kind: "returned", at: 0 }, loanFixture("borrower"))).toBe("Lena marked it returned");
    expect(timelineText({ kind: "cancelled", at: 0, by: "borrower" }, loanFixture("owner"))).toBe("Sam cancelled the request");
    expect(timelineText({ kind: "cancelled", at: 0, by: "owner" }, loanFixture("borrower"))).toBe(
      "The listing was removed, so the loan was cancelled",
    );
  });

  test("reminders go to the borrower", () => {
    const reminder = { kind: "reminder", at: 0, date: "2026-12-04", status: "sent" } as const;
    expect(timelineText(reminder, loanFixture("borrower"))).toBe("Reminder sent to you");
    expect(timelineText(reminder, loanFixture("owner"))).toBe("Reminder sent to Sam");
  });
});

describe("grouping loans into sections", () => {
  test("now (late first), waiting, coming up, past (newest first)", () => {
    const loans = [
      loanFixture("borrower", { status: "returned", startDate: "2026-10-01", endDate: "2026-10-02" }),
      loanFixture("borrower", { status: "approved", startDate: "2026-11-26", endDate: "2026-11-28" }),
      loanFixture("borrower", { status: "requested", startDate: "2026-12-05", endDate: "2026-12-06" }),
      loanFixture("borrower", { status: "approved", startDate: "2026-11-20", endDate: "2026-11-25" }),
      loanFixture("borrower", { status: "approved", startDate: "2026-12-10", endDate: "2026-12-11" }),
      loanFixture("borrower", { status: "declined", startDate: "2026-11-01", endDate: "2026-11-02" }),
    ];
    const g = groupLoans(loans, "2026-11-27");
    expect(g.now.map((l) => l.startDate)).toEqual(["2026-11-20", "2026-11-26"]);
    expect(g.waiting.map((l) => l.startDate)).toEqual(["2026-12-05"]);
    expect(g.upcoming.map((l) => l.startDate)).toEqual(["2026-12-10"]);
    expect(g.past.map((l) => l.startDate)).toEqual(["2026-11-01", "2026-10-01"]);
  });
});
