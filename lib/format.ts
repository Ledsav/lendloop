import type { Category, Condition } from "@/convex/lib/validators";
import { ConvexError } from "convex/values";

/** The message of a ConvexError thrown on purpose by our functions; anything else stays generic. */
export function errorMessage(err: unknown) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  return "Something went wrong. Please try again.";
}

// ---- Words for dates. Loan dates are UTC calendar dates (YYYY-MM-DD); timestamps are local time.
// Fixed English names rather than Intl, so "Sep" never turns into "Sept" on another machine.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const CATEGORY_LABEL: Record<Category, string> = {
  "power tools": "Power tools",
  "hand tools": "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

const CONDITION_LINE: Record<Condition, string> = {
  new: "New.",
  good: "Good condition.",
  fair: "Fair condition.",
  worn: "Worn, but works.",
};
export const conditionLine = (c: Condition) => CONDITION_LINE[c];

/** "Thu" */
export const weekday = (iso: string) => WEEKDAYS[utc(iso).getUTCDay()];
/** "Nov" */
export const monthName = (iso: string) => MONTHS[utc(iso).getUTCMonth()];
const dayOfMonth = (iso: string) => utc(iso).getUTCDate();

/** "Fri 27 Nov" */
export const longDate = (iso: string) => `${weekday(iso)} ${dayOfMonth(iso)} ${monthName(iso)}`;

const sameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

/** "Tue 1 – Thu 3 Dec", "Mon 30 Nov – Wed 2 Dec", "Tue 1 Dec" */
export function rangeLong(start: string, end: string) {
  if (start === end) return longDate(start);
  if (sameMonth(start, end)) return `${weekday(start)} ${dayOfMonth(start)} – ${longDate(end)}`;
  return `${longDate(start)} – ${longDate(end)}`;
}

/** "1–3 Dec", "30 Nov–2 Dec", "3 Dec" */
export function rangeShort(start: string, end: string) {
  if (start === end) return `${dayOfMonth(start)} ${monthName(start)}`;
  if (sameMonth(start, end)) return `${dayOfMonth(start)}–${dayOfMonth(end)} ${monthName(end)}`;
  return `${dayOfMonth(start)} ${monthName(start)}–${dayOfMonth(end)} ${monthName(end)}`;
}

const clock = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
const localMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** When something happened, in the viewer's time: "today 9:00", "yesterday 18:10", "Mon 9:00", "23 Nov". */
export function when(at: number, now: number = Date.now()) {
  const d = new Date(at);
  const daysAgo = Math.round((localMidnight(new Date(now)) - localMidnight(d)) / 86_400_000);
  if (daysAgo <= 0) return `today ${clock(d)}`;
  if (daysAgo === 1) return `yesterday ${clock(d)}`;
  if (daysAgo < 7) return `${WEEKDAYS[d.getDay()]} ${clock(d)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** The date picker works in local Dates; the same calendar day, without any time-zone shift. */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function localDateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "once", "twice", "3 times" */
export const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

/** An item's name inside a sentence: "the cordless drill" (an acronym like "HDMI" keeps its capitals). */
export function thing(name: string) {
  const lower = /^[A-Z][A-Z]/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
  return `the ${lower}`;
}
