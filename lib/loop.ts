import { addDays, daysBetween, today as utcDay } from "@/convex/lib/dates";
import { WINDOW_DAYS, type StripLoan } from "@/convex/lib/itemStats";
import type { Loop } from "@/convex/lib/loans";
import { longDate, monthName, rangeShort, times, weekday } from "./format";
import type { LoanRowData } from "./timeline";

// ---- Geometry. f = 0 is the bottom of the ring ("at home"); the loop runs clockwise back to it.

export function pos(cx: number, cy: number, r: number, f: number): [number, number] {
  const a = Math.PI / 2 + f * 2 * Math.PI;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** The arc from the bottom of the ring to fraction f. */
export function arcPath(cx: number, cy: number, r: number, f: number): string {
  const g = Math.min(Math.max(f, 0), 0.9999);
  const [x, y] = pos(cx, cy, r, g);
  return `M${cx} ${cy + r} A${r} ${r} 0 ${g > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/** How far through its whole days a loan is right now, from 0 to 1. */
export function loanFraction(startDate: string, endDate: string, now: number): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const length = (daysBetween(startDate, endDate) + 1) * 86_400_000;
  return Math.min(Math.max((now - start) / length, 0), 1);
}

/** Major ticks at each day boundary: weekday labels for a week or less, else a few day numbers. */
export function dayTicks(startDate: string, endDate: string): { f: number; label?: string }[] {
  const days = daysBetween(startDate, endDate) + 1;
  const every = Math.ceil((days - 1) / 6);
  return Array.from({ length: days - 1 }, (_, i) => {
    const d = i + 1;
    const date = addDays(startDate, d);
    if (days <= 7) return { f: d / days, label: weekday(date) };
    return d % every === 0 ? { f: d / days, label: String(Number(date.slice(8))) } : { f: d / days };
  });
}

/** The mini dial's states: an item at home, out or late, and a loan asked, booked, returned or closed. */
export type MiniDialState = "home" | "out" | "late" | "asked" | "booked" | "returned" | "closed";

// ---- Words.

export type Tone = "home" | "out" | "late" | "muted";
export type StatusLines = { primary: string; secondary?: string; tone: Tone };

const holderWords = (holder: { name: string; isViewer: boolean }) => (holder.isViewer ? "with you" : `with ${holder.name}`);

/** The status column of an item row. Who has it only when the server sent the name. */
export function itemStatus(loop: Loop): StatusLines {
  if (loop.state === "home") return { primary: "Free now", tone: "home" };
  if (loop.state === "out") {
    if (!loop.holder) return { primary: "On loan", secondary: `back ${weekday(loop.endDate)}`, tone: "out" };
    return { primary: `Day ${loop.day} of ${loop.days}`, secondary: holderWords(loop.holder), tone: "out" };
  }
  if (!loop.holder) return { primary: "Late", tone: "late" };
  const late = `${loop.daysLate} ${loop.daysLate === 1 ? "day" : "days"} late`;
  return { primary: late, secondary: holderWords(loop.holder), tone: "late" };
}

/** The status column of a loan row: where this loan is on its loop. */
export function loanStatus(
  loan: Pick<LoanRowData, "status" | "startDate" | "endDate" | "viewerRole" | "returnedAt">,
  today: string,
  now: number,
): { dial: MiniDialState; fraction?: number; lines: StatusLines } {
  const range = rangeShort(loan.startDate, loan.endDate);
  switch (loan.status) {
    case "requested":
      return { dial: "asked", lines: { primary: loan.viewerRole === "owner" ? "New request" : "Waiting", secondary: range, tone: "muted" } };
    case "approved": {
      if (loan.startDate > today)
        return { dial: "booked", lines: { primary: `Starts ${weekday(loan.startDate)}`, secondary: range, tone: "home" } };
      if (loan.endDate < today) {
        const late = daysBetween(loan.endDate, today);
        return {
          dial: "late",
          lines: { primary: `${late} ${late === 1 ? "day" : "days"} late`, secondary: `due ${longDate(loan.endDate)}`, tone: "late" },
        };
      }
      const day = daysBetween(loan.startDate, today) + 1;
      const days = daysBetween(loan.startDate, loan.endDate) + 1;
      return {
        dial: "out",
        fraction: loanFraction(loan.startDate, loan.endDate, now),
        lines: { primary: `Day ${day} of ${days}`, secondary: `back ${weekday(loan.endDate)}`, tone: "out" },
      };
    }
    case "returned":
      return {
        dial: "returned",
        lines: { primary: "Returned", secondary: loan.returnedAt ? longDate(utcDay(loan.returnedAt)) : undefined, tone: "home" },
      };
    case "declined":
      return { dial: "closed", lines: { primary: "Declined", secondary: range, tone: "muted" } };
    case "cancelled":
      return { dial: "closed", lines: { primary: "Cancelled", secondary: range, tone: "muted" } };
  }
}

export function usageLine(recent: number, total: number): string {
  if (total === 0) return "Not borrowed yet.";
  if (recent === 0) return `Not borrowed in the last 12 weeks, ${total} in all.`;
  return `Borrowed ${times(recent)} in the last 12 weeks, ${total} in all.`;
}

// ---- The 12-week strip.

const windowStart = (today: string) => addDays(today, -(WINDOW_DAYS - 1));

/** Each loan as a left offset and width, in percent of the 84 days. */
export function stripSegments(strip: StripLoan[], today: string) {
  const from = windowStart(today);
  return strip.map((s) => ({
    left: (daysBetween(from, s.startDate) / WINDOW_DAYS) * 100,
    width: ((daysBetween(s.startDate, s.endDate) + 1) / WINDOW_DAYS) * 100,
    current: s.current,
  }));
}

/** Month labels: the window's first month at the left edge, then each 1st inside the window. */
export function stripMonths(today: string): { label: string; left: number }[] {
  const from = windowStart(today);
  const out = [{ label: monthName(from), left: 0 }];
  let first = `${from.slice(0, 7)}-01`;
  for (;;) {
    const [y, m] = first.split("-").map(Number);
    first = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    if (first > today) return out;
    out.push({ label: monthName(first), left: (daysBetween(from, first) / WINDOW_DAYS) * 100 });
  }
}
