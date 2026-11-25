"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import type { api } from "@/convex/_generated/api";
import { CATEGORY_LABEL } from "@/lib/format";

/** What's free right now: item names and categories only, nothing about who owns them. */
export function PublicToolList({ preloaded }: { preloaded: Preloaded<typeof api.tools.listPublic> }) {
  const tools = usePreloadedQuery(preloaded);
  if (tools.length === 0)
    return <p className="text-[15px] text-slate">Nothing is free right now. Sign in and list the first thing.</p>;
  return (
    <ul className="grid lg:grid-cols-3 lg:gap-x-10">
      {tools.slice(0, 9).map((tool, i) => (
        <li
          key={`${tool.name}-${i}`}
          className={`${i >= 5 ? "hidden lg:flex" : "flex"} justify-between gap-3 border-b border-hairline py-3 text-[15px] lg:py-[13px] lg:text-[16px]`}
        >
          <span className="font-semibold">{tool.name}</span>
          <span className="text-slate">{CATEGORY_LABEL[tool.category]}</span>
        </li>
      ))}
    </ul>
  );
}
