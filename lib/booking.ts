import { daysBetween, MAX_LOAN_DAYS, overlaps } from "@/convex/lib/dates";

export const daysInclusive = (start: string, end: string) => daysBetween(start, end) + 1;

/**
 * What's wrong with a picked range, in plain words, before anything is sent; null when it's fine.
 * `today` is the server's UTC date (from tools.get), never the browser's. No end yet means a
 * one-day loan. The server checks all of this again.
 */
export function rangeProblem(
  start: string | undefined,
  end: string | undefined,
  booked: { startDate: string; endDate: string }[],
  today: string,
): string | null {
  if (!start) return "Pick the first day.";
  const last = end ?? start;
  if (start < today) return "That day has passed. Pick today or later.";
  if (daysInclusive(start, last) > MAX_LOAN_DAYS) return `Loans last at most ${MAX_LOAN_DAYS} days. Pick an earlier last day.`;
  if (booked.some((b) => overlaps(b, { startDate: start, endDate: last }))) return "Some of those days are already booked.";
  return null;
}
