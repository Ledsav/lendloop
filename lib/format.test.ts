import { describe, expect, test } from "vitest";
import { conditionLine, isoToLocalDate, thing, localDateToIso, longDate, rangeLong, rangeShort, times, weekday, when } from "./format";

describe("dates in words", () => {
  test("loan dates read like 'Fri 27 Nov', in UTC", () => {
    expect(longDate("2026-11-27")).toBe("Fri 27 Nov");
    expect(weekday("2026-11-26")).toBe("Thu");
  });

  test("ranges, long and short", () => {
    expect(rangeLong("2026-12-01", "2026-12-03")).toBe("Tue 1 – Thu 3 Dec");
    expect(rangeLong("2026-11-30", "2026-12-02")).toBe("Mon 30 Nov – Wed 2 Dec");
    expect(rangeLong("2026-12-01", "2026-12-01")).toBe("Tue 1 Dec");
    expect(rangeShort("2026-12-01", "2026-12-03")).toBe("1–3 Dec");
    expect(rangeShort("2026-11-30", "2026-12-02")).toBe("30 Nov–2 Dec");
    expect(rangeShort("2026-12-03", "2026-12-03")).toBe("3 Dec");
  });

  test("timestamps in local time: today, yesterday, this week, older", () => {
    const now = new Date(2026, 10, 25, 15, 0).getTime();
    expect(when(new Date(2026, 10, 25, 9, 0).getTime(), now)).toBe("today 9:00");
    expect(when(new Date(2026, 10, 24, 18, 10).getTime(), now)).toBe("yesterday 18:10");
    expect(when(new Date(2026, 10, 20, 9, 5).getTime(), now)).toBe("Fri 9:05");
    expect(when(new Date(2026, 10, 2, 9, 0).getTime(), now)).toBe("2 Nov");
  });

  test("the calendar's local dates never shift an ISO date by a day", () => {
    for (const iso of ["2026-01-01", "2026-03-29", "2026-10-25", "2026-12-31"]) {
      expect(localDateToIso(isoToLocalDate(iso))).toBe(iso);
    }
  });
});

describe("small words", () => {
  test("conditions and counts", () => {
    expect(conditionLine("new")).toBe("New.");
    expect(conditionLine("good")).toBe("Good condition.");
    expect(conditionLine("worn")).toBe("Worn, but works.");
    expect(times(1)).toBe("once");
    expect(times(2)).toBe("twice");
    expect(times(7)).toBe("7 times");
  });

  test("an item's name inside a sentence", () => {
    expect(thing("Cordless drill")).toBe("the cordless drill");
    expect(thing("HDMI cable")).toBe("the HDMI cable");
  });
});
