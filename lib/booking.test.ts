import { describe, expect, test } from "vitest";
import { daysInclusive, rangeProblem } from "./booking";

const today = "2026-06-10";
const booked = [{ startDate: "2026-06-14", endDate: "2026-06-15" }];

describe("checking a date range before it's sent", () => {
  test("needs a first day; one click is a one-day loan", () => {
    expect(rangeProblem(undefined, undefined, [], today)).toBe("Pick the first day.");
    expect(rangeProblem("2026-06-10", undefined, [], today)).toBeNull();
  });

  test("uses the server's today, so a browser behind UTC can't pick yesterday", () => {
    expect(rangeProblem("2026-06-09", "2026-06-11", [], today)).toBe("That day has passed. Pick today or later.");
  });

  test("30 days at most", () => {
    expect(rangeProblem("2026-06-10", "2026-07-09", [], today)).toBeNull();
    expect(rangeProblem("2026-06-10", "2026-07-10", [], today)).toBe("Loans last at most 30 days. Pick an earlier last day.");
  });

  test("not across days someone else has; back to back is fine", () => {
    expect(rangeProblem("2026-06-11", "2026-06-20", booked, today)).toBe("Some of those days are already booked.");
    expect(rangeProblem("2026-06-16", "2026-06-18", booked, today)).toBeNull();
  });

  test("counts days inclusively", () => {
    expect(daysInclusive("2026-06-10", "2026-06-12")).toBe(3);
    expect(daysInclusive("2026-06-10", "2026-06-10")).toBe(1);
  });
});
