import { describe, expect, test } from "vitest";
import type { Category } from "@/convex/lib/validators";
import { filterItems } from "./filter";

const items: { name: string; category: Category }[] = [
  { name: "Cordless drill", category: "power tools" },
  { name: "Drill bits", category: "hand tools" },
  { name: "Tent", category: "camping" },
];
const names = (list: { name: string }[]) => list.map((i) => i.name);

describe("search and category tabs", () => {
  test("search ignores stray spaces and capitals", () => {
    expect(names(filterItems(items, "  DRILL ", "all"))).toEqual(["Cordless drill", "Drill bits"]);
  });

  test("search and a category tab combine", () => {
    expect(names(filterItems(items, "drill", "hand tools"))).toEqual(["Drill bits"]);
  });

  test("an empty search shows the whole tab; no match shows nothing", () => {
    expect(names(filterItems(items, "", "camping"))).toEqual(["Tent"]);
    expect(filterItems(items, "kayak", "all")).toEqual([]);
  });
});
