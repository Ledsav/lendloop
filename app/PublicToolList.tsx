"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { Empty } from "@/components/legacy-ui";

export function PublicToolList({ preloaded }: { preloaded: Preloaded<typeof api.tools.listPublic> }) {
  const tools = usePreloadedQuery(preloaded);
  if (tools.length === 0) return <Empty>Nothing listed yet. Be the first to lend something.</Empty>;
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool, i) => (
        <li key={`${tool.name}-${i}`} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <p className="font-medium">{tool.name}</p>
          <p className="text-sm text-stone-500 capitalize">{tool.category}</p>
        </li>
      ))}
    </ul>
  );
}
