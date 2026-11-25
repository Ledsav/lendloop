import { ConvexError } from "convex/values";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_LOAN_DAYS = 30;

/** Today's date in UTC as YYYY-MM-DD. All loan dates are calendar dates in UTC. */
export function today(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function validateLoanDates(startDate: string, endDate: string, now: number = Date.now()) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) throw new ConvexError("Dates must be YYYY-MM-DD.");
  if (startDate < today(now)) throw new ConvexError("The loan can't start in the past.");
  if (endDate < startDate) throw new ConvexError("The return date must be on or after the start date.");
  if (daysBetween(startDate, endDate) + 1 > MAX_LOAN_DAYS)
    throw new ConvexError(`Loans can last at most ${MAX_LOAN_DAYS} days.`);
}

/** Inclusive date ranges overlap. */
export const overlaps = (a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }) =>
  a.startDate <= b.endDate && b.startDate <= a.endDate;

/** The calendar date `n` days after (or before, if negative) an ISO date. */
export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
