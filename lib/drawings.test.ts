import { describe, expect, test } from "vitest";
import { ITEMS } from "@/convex/lib/seedData";
import { drawingFor } from "./drawings";

describe("which drawing an item gets", () => {
  test.each([
    ["Cordless drill", "power tools", "drill"],
    ["Jigsaw", "power tools", "drill"],
    ["Circular saw", "power tools", "saw"],
    ["Step ladder", "hand tools", "ladder"],
    ["Pressure washer", "power tools", "washer"],
    ["Carpet cleaner", "cleaning", "cleaner"],
    ["Window vacuum", "cleaning", "cleaner"],
    ["Hedge trimmer", "garden", "mower"],
    ["Wheelbarrow", "garden", "mower"],
    ["Folding chairs, set of six", "other", "table"],
    ["Projector and screen", "other", "box"],
    ["Pasta machine", "kitchen", "mixer"],
    ["Cool box", "camping", "tent"],
    ["Spirit level", "hand tools", "saw"],
    ["CAMPING STOVE", "camping", "stove"],
  ] as const)("%s draws as %s", (name, category, kind) => expect(drawingFor(name, category)).toBe(kind));

  test("only the two odd ones out among the seed items fall back to the box", () => {
    expect(ITEMS.filter((i) => drawingFor(i.name, i.category) === "box").map((i) => i.name)).toEqual([
      "Paddling pool",
      "Projector and screen",
    ]);
  });
});
