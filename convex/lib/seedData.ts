import type { Category, Condition } from "./validators";

/**
 * Sample data for development (devtools:seed). People are referred to by key; "lena" and "sam" are
 * the two real accounts that can sign in (the Clerk test users by default), everyone else is a
 * neighbour who exists only in Convex. Day numbers are offsets from the day the seed runs.
 */

export const REAL_KEYS = ["lena", "sam"] as const;

export const NEIGHBOURS: { key: string; name: string; trusted?: boolean }[] = [
  { key: "marco", name: "Marco", trusted: true },
  { key: "priya", name: "Priya", trusted: true },
  { key: "ana", name: "Ana" },
  { key: "jo", name: "Jo" },
  { key: "tomasz", name: "Tomasz" },
  { key: "aisha", name: "Aisha" },
  { key: "ben", name: "Ben" },
  { key: "mei", name: "Mei" },
  { key: "olu", name: "Olu" },
  { key: "clara", name: "Clara" },
];

export type SeedItem = {
  key: string;
  owner: string;
  name: string;
  category: Category;
  condition: Condition;
  note: string;
  recent: number; // returned loans in the last 12 weeks
  older: number; // returned loans before that
};

const item = (
  key: string,
  owner: string,
  name: string,
  category: Category,
  condition: Condition,
  note: string,
  recent: number,
  older: number,
): SeedItem => ({ key, owner, name, category, condition, note, recent, older });

export const ITEMS: SeedItem[] = [
  item("drill", "lena", "Cordless drill", "power tools", "good", "Two batteries. The charger is in the case.", 6, 7),
  item("jigsaw", "marco", "Jigsaw", "power tools", "good", "Comes with wood blades. Ask if you need metal ones.", 2, 3),
  item("washer", "jo", "Pressure washer", "power tools", "fair", "The hose is 8 m. Please empty the water before you bring it back.", 3, 2),
  item("sander", "tomasz", "Orbital sander", "power tools", "good", "Sanding sheets in the bag, 80 and 120 grit.", 1, 2),
  item("circsaw", "ben", "Circular saw", "power tools", "worn", "The guard sticks a little, but the blade is sharp.", 0, 2),
  item("ladder", "marco", "Extension ladder", "hand tools", "good", "Reaches about 6 m. Heavy, so bring a second person.", 4, 5),
  item("stepladder", "aisha", "Step ladder", "hand tools", "good", "Three steps. Folds flat for the car.", 2, 1),
  item("sockets", "sam", "Socket set", "hand tools", "good", "Metric, 46 pieces, in a hard case.", 2, 2),
  item("handsaw", "clara", "Hand saw", "hand tools", "good", "Fine teeth, good for shelves and skirting boards.", 1, 1),
  item("level", "olu", "Spirit level", "hand tools", "new", "120 cm.", 0, 1),
  item("mower", "priya", "Lawn mower", "garden", "good", "Electric, with a 15 m cable. The grass box comes off easily.", 3, 4),
  item("trimmer", "jo", "Hedge trimmer", "garden", "good", "Cordless. One battery lasts about 40 minutes.", 2, 2),
  item("shears", "lena", "Garden shears", "garden", "good", "Sharpened in the spring.", 1, 2),
  item("barrow", "ben", "Wheelbarrow", "garden", "worn", "The tyre needs air now and then.", 2, 3),
  item("mixer", "marco", "Stand mixer", "kitchen", "good", "Dough hook, whisk and paddle. The bowl holds 4.8 litres.", 3, 4),
  item("pasta", "clara", "Pasta machine", "kitchen", "good", "Clamps to the table. Brush it clean, no water please.", 1, 1),
  item("slowcooker", "aisha", "Slow cooker", "kitchen", "good", "6 litres, enough for eight.", 1, 2),
  item("waffle", "sam", "Waffle iron", "kitchen", "good", "Makes two at a time.", 1, 0),
  item("tent", "priya", "Four-person tent", "camping", "good", "Pitches in about 15 minutes. Pegs and mallet are in the bag.", 3, 3),
  item("stove", "priya", "Camping stove", "camping", "good", "Two burners. Gas not included.", 2, 3),
  item("bags", "mei", "Sleeping bags, pair", "camping", "fair", "Good down to about 5 degrees. Washed after every trip.", 1, 1),
  item("coolbox", "tomasz", "Cool box", "camping", "good", "Holds 30 litres. Ice packs are in the lid.", 2, 1),
  item("carpet", "aisha", "Carpet cleaner", "cleaning", "good", "Use the solution in the box, not soap.", 2, 2),
  item("steam", "olu", "Steam cleaner", "cleaning", "good", "Comes with the window and floor heads.", 1, 1),
  item("windowvac", "mei", "Window vacuum", "cleaning", "new", "Charge it the night before.", 0, 1),
  item("table", "ben", "Folding table", "other", "good", "Seats six. Chairs are separate.", 2, 2),
  item("chairs", "lena", "Folding chairs, set of six", "other", "good", "They stack, so they fit in a small car.", 1, 1),
  item("pool", "clara", "Paddling pool", "other", "fair", "Pump included. Please dry it before folding.", 1, 0),
  item("projector", "tomasz", "Projector and screen", "other", "good", "HDMI cable included. The screen stands on its own.", 1, 2),
];

export type SeedLoan = {
  item: string;
  borrower: string;
  start: number;
  end: number;
  status: "requested" | "approved" | "declined" | "cancelled";
};

/** What's happening right now, so every state shows up somewhere. */
export const CURRENT_LOANS: SeedLoan[] = [
  { item: "drill", borrower: "sam", start: -1, end: 1, status: "approved" }, // day 2 of 3
  { item: "washer", borrower: "lena", start: 0, end: 4, status: "approved" }, // day 1 of 5
  { item: "ladder", borrower: "tomasz", start: -2, end: 3, status: "approved" }, // its approval email failed
  { item: "tent", borrower: "ana", start: -6, end: -2, status: "approved" }, // 2 days late
  { item: "carpet", borrower: "sam", start: -4, end: -1, status: "approved" }, // 1 day late
  { item: "stove", borrower: "lena", start: 7, end: 9, status: "approved" }, // coming up
  { item: "mixer", borrower: "sam", start: 3, end: 5, status: "requested" },
  { item: "shears", borrower: "ana", start: 2, end: 4, status: "requested" },
  { item: "sockets", borrower: "jo", start: 1, end: 2, status: "requested" },
  { item: "mower", borrower: "ben", start: 5, end: 6, status: "requested" },
  { item: "trimmer", borrower: "sam", start: -9, end: -8, status: "declined" },
  { item: "jigsaw", borrower: "lena", start: -12, end: -11, status: "cancelled" },
];

/** The loan whose approval email "failed", so the admin page has something to show. */
export const FAILED_EMAIL_ITEM = "ladder";

export const PEOPLE: string[] = [...REAL_KEYS, ...NEIGHBOURS.map((n) => n.key)];

/**
 * Past, returned loans of one item: `recent` spread over days -83..-9, `older` over -200..-90, each
 * 1 to 4 days, borrowers taking turns (never the owner), every third one returned a day late.
 * Deterministic, and they never overlap each other or the current loans (which sit in -12..+9,
 * with only cancelled or declined ones before -6).
 */
export function historyFor(
  itemIndex: number,
  seedItem: SeedItem,
  people: string[] = PEOPLE,
): { start: number; end: number; borrower: string; lateReturn: boolean }[] {
  const borrowers = people.filter((p) => p !== seedItem.owner);
  const spread = (count: number, from: number, to: number, shift: number) => {
    if (count === 0) return [];
    const slot = Math.floor((to - from + 1) / count);
    return Array.from({ length: count }, (_, i) => {
      const length = Math.min(1 + ((itemIndex + i * 2) % 4), Math.max(1, slot - 1));
      const jitter = (itemIndex * 3 + i * 5) % Math.max(1, slot - length);
      const start = from + i * slot + jitter;
      return {
        start,
        end: start + length - 1,
        borrower: borrowers[(itemIndex * 3 + i + shift) % borrowers.length],
        lateReturn: i % 3 === 2,
      };
    });
  };
  return [...spread(seedItem.older, -200, -90, 5), ...spread(seedItem.recent, -83, -9, 0)];
}
