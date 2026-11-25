import type { Category } from "@/convex/lib/validators";

/** One drawing per kind of thing; items without a specific one get their category's. */
export type DrawingKind = "drill" | "saw" | "ladder" | "mower" | "mixer" | "tent" | "stove" | "washer" | "cleaner" | "table" | "box";

// First match wins: "Jigsaw" is a drill-like power tool, not a hand saw.
const BY_NAME: [RegExp, DrawingKind][] = [
  [/ladder/, "ladder"],
  [/pressure washer|jet wash/, "washer"],
  [/vacuum|carpet|steam|cleaner/, "cleaner"],
  [/drill|sander|jigsaw|grinder|driver/, "drill"],
  [/saw/, "saw"],
  [/mower|trimmer|strimmer|hedge|lawn/, "mower"],
  [/stove|burner|grill|barbecue|bbq/, "stove"],
  [/tent|gazebo/, "tent"],
  [/table|chair|bench/, "table"],
  [/mixer|blender|pasta|cooker|waffle/, "mixer"],
];

const BY_CATEGORY: Record<Category, DrawingKind> = {
  "power tools": "drill",
  "hand tools": "saw",
  garden: "mower",
  kitchen: "mixer",
  camping: "tent",
  cleaning: "cleaner",
  other: "box",
};

export function drawingFor(name: string, category: Category): DrawingKind {
  const n = name.toLowerCase();
  return BY_NAME.find(([re]) => re.test(n))?.[1] ?? BY_CATEGORY[category];
}
