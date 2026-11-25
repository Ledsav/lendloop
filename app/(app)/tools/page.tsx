"use client";

import { useQuery } from "convex/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ItemRow } from "@/components/items/ItemRow";
import { LoopStatus } from "@/components/items/StatusColumn";
import { Empty, PageTitle, RowSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { CATEGORIES, type Category } from "@/convex/lib/validators";
import { filterItems } from "@/lib/filter";
import { CATEGORY_LABEL } from "@/lib/format";
import { useNow } from "@/lib/useNow";

const TABS: (Category | "all")[] = ["all", ...CATEGORIES];

export default function BrowsePage() {
  const items = useQuery(api.tools.list, {});
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Category | "all">("all");
  const shown = items ? filterItems(items, query, tab) : [];
  const now = useNow();

  return (
    <>
      <PageTitle
        title="Things to borrow"
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/listings">Lend something</Link>
          </Button>
        }
      />
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search things"
          aria-label="Search things"
          className="pl-10"
        />
      </div>
      <div role="group" aria-label="Categories" className="mt-4 flex gap-5 overflow-x-auto border-b border-hairline [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 cursor-pointer pt-1 pb-[11px] text-[15px] whitespace-nowrap ${tab === t ? "font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-ink)]" : "font-medium text-slate hover:text-ink"}`}
          >
            {t === "all" ? "All" : CATEGORY_LABEL[t]}
          </button>
        ))}
      </div>

      {items === undefined ? (
        <RowSkeleton rows={6} />
      ) : items.length === 0 ? (
        <Empty
          action={
            <Button asChild>
              <Link href="/listings">Lend something</Link>
            </Button>
          }
        >
          Nothing to borrow yet. List something you own and your neighbours will see it here.
        </Empty>
      ) : shown.length === 0 ? (
        <Empty>
          {query.trim()
            ? `Nothing matches "${query.trim()}". Try a shorter word, or look in All.`
            : `Nothing in ${tab === "all" ? "here" : CATEGORY_LABEL[tab]} yet.`}
        </Empty>
      ) : (
        <ul>
          {shown.map((item) => (
            <ItemRow
              key={item._id}
              href={`/tools/${item._id}`}
              name={item.name}
              category={item.category}
              sub={item.isMine ? "You" : item.owner.name}
              status={<LoopStatus loop={item.loop} now={now} />}
            />
          ))}
        </ul>
      )}
    </>
  );
}
