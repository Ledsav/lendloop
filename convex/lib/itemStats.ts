import type { Doc } from "../_generated/dataModel";
import { addDays, today as todayOf } from "./dates";
import { currentLoan } from "./loans";

/** The item page shows the last 12 weeks of use. */
export const WINDOW_DAYS = 84;

/** One loan on the 12-week strip: dates only, never who borrowed it. */
export type StripLoan = { startDate: string; endDate: string; current: boolean };

/** A loan "happened" once it was returned, or while it's approved and has started. */
const happened = (loan: Doc<"loans">, today: string) =>
  loan.status === "returned" || (loan.status === "approved" && loan.startDate <= today);

/** How often an item has been borrowed: in all, and in the last 12 weeks (with the strip's segments). */
export function usage(loans: Doc<"loans">[], today: string) {
  const windowStart = addDays(today, -(WINDOW_DAYS - 1));
  const done = loans.filter((l) => happened(l, today));
  const strip: StripLoan[] = [];
  for (const loan of done) {
    const returned = loan.status === "returned";
    let end = today;
    if (returned && loan.returnedAt !== undefined) {
      const back = todayOf(loan.returnedAt);
      if (back < end) end = back;
    }
    // Returned "before it started" (marked returned early) still counts as its first day.
    if (end < loan.startDate) end = loan.startDate;
    if (end < windowStart || loan.startDate > today) continue;
    const start = loan.startDate > windowStart ? loan.startDate : windowStart;
    strip.push({ startDate: start, endDate: end, current: !returned });
  }
  strip.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { total: done.length, recent: strip.length, strip };
}

/** The first day nobody has it booked: today if it's free, null while it's late (nobody knows). */
export function nextFree(loans: Doc<"loans">[], today: string): string | null {
  const current = currentLoan(loans, today);
  if (current && current.endDate < today) return null;
  const approved = loans.filter((l) => l.status === "approved");
  let day = today;
  for (;;) {
    const covering = approved.find((l) => l.startDate <= day && day <= l.endDate);
    if (!covering) return day;
    day = addDays(covering.endDate, 1);
  }
}

/** Dates already promised to someone, from today on, for the calendar. */
export function booked(loans: Doc<"loans">[], today: string) {
  return loans
    .filter((l) => l.status === "approved" && l.endDate >= today)
    .map((l) => ({ startDate: l.startDate, endDate: l.endDate }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
