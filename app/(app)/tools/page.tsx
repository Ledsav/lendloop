"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { AvailabilityBadge, TrustedBadge } from "@/components/badges";
import { Button, Card, Empty, ErrorText, inputClass, Loading, PageHeader } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES, type Category } from "@/convex/lib/validators";
import { todayUtc } from "@/lib/format";
import { useAction } from "@/lib/useAction";

export default function BrowsePage() {
  const [category, setCategory] = useState<Category | undefined>(undefined);
  const tools = useQuery(api.tools.list, { category });

  return (
    <>
      <PageHeader
        title="All tools"
        subtitle="Ask a neighbor to borrow something for a few days."
        action={
          <Link href="/listings" className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800">
            + List a tool
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {[undefined, ...CATEGORIES].map((c) => (
          <button
            key={c ?? "all"}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full px-3 py-1 text-sm capitalize ring-1 ${category === c ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-100"}`}
          >
            {c ?? "All"}
          </button>
        ))}
      </div>
      {tools === undefined ? (
        <Loading />
      ) : tools.length === 0 ? (
        <Empty>No tools in this category yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard key={tool._id} tool={tool} />
          ))}
        </div>
      )}
    </>
  );
}

type Tool = NonNullable<ReturnType<typeof useQuery<typeof api.tools.list>>>[number];

function ToolCard({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{tool.name}</h3>
          <p className="text-sm text-stone-500 capitalize">
            {tool.category} · {tool.condition}
          </p>
        </div>
        <AvailabilityBadge value={tool.availability} />
      </div>
      {tool.description && <p className="mt-2 text-sm text-stone-700">{tool.description}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm text-stone-500">
        <span>
          {tool.isMine ? "Your listing" : <>Lent by {tool.owner.name}</>} {tool.owner.trustedLender && <TrustedBadge />}
        </span>
        {!tool.isMine && !open && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            Ask to borrow
          </Button>
        )}
      </div>
      {open && <BorrowForm toolId={tool._id} onDone={() => setOpen(false)} />}
    </Card>
  );
}

function BorrowForm({ toolId, onDone }: { toolId: Id<"tools">; onDone: () => void }) {
  const today = todayUtc();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [sent, setSent] = useState(false);
  const request = useAction(useMutation(api.loans.request));

  if (sent)
    return (
      <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
        Request sent. The lender gets an email; follow it in <Link href="/requests" className="underline">My requests</Link>.
      </p>
    );

  return (
    <form
      className="mt-3 space-y-2 rounded-lg bg-stone-50 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await request.run({ toolId, startDate, endDate })) setSent(true);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-stone-600">
          From
          <input type="date" required min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </label>
        <label className="text-xs text-stone-600">
          Until (inclusive)
          <input type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </label>
      </div>
      <ErrorText>{request.error}</ErrorText>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={request.pending}>
          {request.pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
