import type { Category } from "@/convex/lib/validators";

/** Browse's search box and category tabs: a case-insensitive match on the name, within the tab. */
export function filterItems<T extends { name: string; category: Category }>(items: T[], query: string, category: Category | "all"): T[] {
  const q = query.trim().toLowerCase();
  return items.filter((i) => (category === "all" || i.category === category) && (!q || i.name.toLowerCase().includes(q)));
}
