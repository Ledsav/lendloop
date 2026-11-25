import { describe, expect, test } from "vitest";
import { borrowHeading, dayTicks, itemStatus, loanFraction, loanStatus, pos, stripMonths, stripSegments, usageLine } from "./loop";
import { loanFixture } from "./test.fixtures";

describe("loop geometry", () => {
  test("the loop starts at the bottom and goes clockwise", () => {
    expect(pos(13, 13, 10, 0).map(Math.round)).toEqual([13, 23]);
    expect(pos(13, 13, 10, 0.25).map(Math.round)).toEqual([3, 13]);
  });

  test("a loan's fraction covers its whole days and stays between 0 and 1", () => {
    expect(loanFraction("2026-11-25", "2026-11-25", Date.parse("2026-11-25T12:00:00Z"))).toBeCloseTo(0.5);
    expect(loanFraction("2026-11-24", "2026-11-26", Date.parse("2026-11-28T12:00:00Z"))).toBe(1);
    expect(loanFraction("2026-11-24", "2026-11-26", Date.parse("2026-11-20T12:00:00Z"))).toBe(0);
  });

  test("a major tick at each day boundary, labelled with the weekday", () => {
    expect(dayTicks("2026-11-23", "2026-11-25")).toEqual([
      { f: 1 / 3, label: "Tue" },
      { f: 2 / 3, label: "Wed" },
    ]);
    const month = dayTicks("2026-11-01", "2026-11-30"); // 30 days: a tick per boundary, fewer labels
    expect(month).toHaveLength(29);
    expect(month.filter((t) => t.label).length).toBeLessThanOrEqual(7);
  });
});

describe("status words", () => {
  test("home, out and late, with and without the holder's name", () => {
    expect(itemStatus({ state: "home" })).toEqual({ primary: "Free now", tone: "home" });
    expect(
      itemStatus({ state: "out", startDate: "2026-11-24", endDate: "2026-11-26", day: 2, days: 3, holder: { name: "Sam", isViewer: false } }),
    ).toEqual({ primary: "Day 2 of 3", secondary: "with Sam", tone: "out" });
    expect(
      itemStatus({ state: "out", startDate: "2026-11-24", endDate: "2026-11-26", day: 2, days: 3, holder: { name: "Sam", isViewer: true } }),
    ).toEqual({ primary: "Day 2 of 3", secondary: "with you", tone: "out" });
    expect(itemStatus({ state: "out", startDate: "2026-11-24", endDate: "2026-11-26", day: 2, days: 3, holder: null })).toEqual({
      primary: "On loan",
      secondary: "back Thu",
      tone: "out",
    });
    expect(
      itemStatus({ state: "late", startDate: "2026-11-19", endDate: "2026-11-23", daysLate: 2, holder: { name: "Ana", isViewer: false } }),
    ).toEqual({ primary: "2 days late", secondary: "with Ana", tone: "late" });
    expect(
      itemStatus({ state: "late", startDate: "2026-11-19", endDate: "2026-11-24", daysLate: 1, holder: { name: "Sam", isViewer: true } })
        .primary,
    ).toBe("1 day late");
    expect(itemStatus({ state: "late", startDate: "2026-11-19", endDate: "2026-11-23", daysLate: 2, holder: null })).toEqual({
      primary: "Late",
      tone: "late",
    });
  });

  test("how often it's been borrowed", () => {
    expect(usageLine(7, 14)).toBe("Borrowed 7 times in the last 12 weeks, 14 in all.");
    expect(usageLine(1, 1)).toBe("Borrowed once in the last 12 weeks, 1 in all.");
    expect(usageLine(0, 3)).toBe("Not borrowed in the last 12 weeks, 3 in all.");
    expect(usageLine(0, 0)).toBe("Not borrowed yet.");
  });
});

describe("12-week strip", () => {
  test("segments are placed on 84 days, a day wide at least", () => {
    expect(stripSegments([{ startDate: "2026-11-25", endDate: "2026-11-25", current: true }], "2026-11-25")).toEqual([
      { left: (83 / 84) * 100, width: (1 / 84) * 100, current: true },
    ]);
    expect(stripSegments([{ startDate: "2026-09-03", endDate: "2026-09-05", current: false }], "2026-11-25")).toEqual([
      { left: 0, width: (3 / 84) * 100, current: false },
    ]);
  });

  test("month labels: the window's first month, then each 1st inside it", () => {
    const months = stripMonths("2026-11-25"); // window starts 3 Sep
    expect(months.map((m) => m.label)).toEqual(["Sep", "Oct", "Nov"]);
    expect(months[0].left).toBe(0);
    expect(months[1].left).toBeCloseTo((28 / 84) * 100);
  });
});

describe("a loan's status column", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  test("a new request, from the lender's side", () => {
    expect(loanStatus(loanFixture("owner"), "2026-11-27", now)).toEqual({
      dial: "asked",
      lines: { primary: "New request", secondary: "1–3 Dec", tone: "muted" },
    });
    expect(loanStatus(loanFixture("borrower"), "2026-11-27", now).lines.primary).toBe("Waiting");
  });

  test("coming up, out, late, returned, closed", () => {
    expect(loanStatus(loanFixture("borrower", { status: "approved" }), "2026-11-27", now)).toMatchObject({
      dial: "booked",
      lines: { primary: "Starts Tue", secondary: "1–3 Dec" },
    });
    const out = loanStatus(loanFixture("borrower", { status: "approved", startDate: "2026-11-26", endDate: "2026-11-28" }), "2026-11-27", now);
    expect(out).toMatchObject({ dial: "out", lines: { primary: "Day 2 of 3", secondary: "back Sat", tone: "out" } });
    expect(out.fraction).toBeCloseTo(0.5);
    expect(loanStatus(loanFixture("owner", { status: "approved", startDate: "2026-11-20", endDate: "2026-11-25" }), "2026-11-27", now)).toEqual({
      dial: "late",
      lines: { primary: "2 days late", secondary: "due Wed 25 Nov", tone: "late" },
    });
    expect(
      loanStatus(loanFixture("owner", { status: "returned", returnedAt: Date.parse("2026-11-19T17:00:00Z") }), "2026-11-27", now),
    ).toMatchObject({ dial: "returned", lines: { primary: "Returned", secondary: "Thu 19 Nov" } });
    expect(loanStatus(loanFixture("owner", { status: "declined" }), "2026-11-27", now)).toEqual({
      dial: "closed",
      lines: { primary: "Declined", secondary: "1–3 Dec", tone: "muted" },
    });
  });
});

describe("dates far off read as dates, not weekdays", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  test("a loan starting in a week says the date", () => {
    expect(loanStatus(loanFixture("owner", { status: "approved", startDate: "2026-12-02", endDate: "2026-12-04" }), "2026-11-25", now).lines.primary).toBe(
      "Starts 2 Dec",
    );
    expect(loanStatus(loanFixture("owner", { status: "approved", startDate: "2026-11-27", endDate: "2026-11-28" }), "2026-11-25", now).lines.primary).toBe(
      "Starts Fri",
    );
  });

  test("a long loan seen by a neighbour says when it's back", () => {
    expect(itemStatus({ state: "out", startDate: "2026-11-24", endDate: "2026-12-23", day: 2, days: 30, holder: null }).secondary).toBe("back 23 Dec");
    expect(
      loanStatus(loanFixture("owner", { status: "approved", startDate: "2026-11-24", endDate: "2026-12-23" }), "2026-11-25", now).lines.secondary,
    ).toBe("back 23 Dec");
  });
});

describe("what the item page says above the calendar", () => {
  const out = { state: "out", startDate: "2026-11-24", endDate: "2026-11-26", day: 2, days: 3 } as const;
  test("to a neighbour", () => {
    expect(borrowHeading({ state: "home" }, "Lena", "2026-11-25")).toEqual({ title: "Free now", sub: "Pick your dates" });
    expect(borrowHeading({ ...out, holder: null }, "Lena", "2026-11-27")).toEqual({
      title: "Free again Fri 27 Nov",
      sub: "Ask Lena for later dates",
    });
    expect(borrowHeading({ state: "late", startDate: "2026-11-19", endDate: "2026-11-23", daysLate: 2, holder: null }, "Lena", null)).toEqual({
      title: "Not back yet",
      sub: "It was due Mon 23 Nov. You can still ask for later dates.",
      tone: "late",
    });
  });

  test("to the person who has it", () => {
    expect(borrowHeading({ ...out, holder: { name: "Sam", isViewer: true } }, "Lena", "2026-11-27")).toEqual({
      title: "It's with you until Thu 26 Nov",
      sub: "Bring it back to Lena by then, or ask for more days below.",
    });
    expect(
      borrowHeading({ state: "late", startDate: "2026-11-19", endDate: "2026-11-23", daysLate: 2, holder: { name: "Sam", isViewer: true } }, "Lena", null),
    ).toEqual({ title: "2 days late", sub: "It was due Mon 23 Nov. Please bring it back to Lena.", tone: "late" });
  });
});
