import { ConvexError } from "convex/values";

/** Today's date in UTC (YYYY-MM-DD), the same calendar the server uses. */
export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "2 days ago", "5 minutes ago", "just now". */
export function timeAgo(at: number, now: number = Date.now()) {
  const diff = at - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** The message of a ConvexError thrown on purpose by our functions; anything else stays generic. */
export function errorMessage(err: unknown) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "Something went wrong. Please try again.";
}
