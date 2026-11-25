"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ItemRow } from "@/components/items/ItemRow";
import { LoopStatus } from "@/components/items/StatusColumn";
import { ListingForm } from "@/components/ListingForm";
import { Empty, PageTitle, RowSkeleton } from "@/components/states";
import { api } from "@/convex/_generated/api";
import { conditionLine } from "@/lib/format";
import { useAction } from "@/lib/useAction";
import { useNow } from "@/lib/useNow";

export default function MyListingsPage() {
  const tools = useQuery(api.tools.mine);
  const create = useAction(useMutation(api.tools.create));
  const now = useNow();

  return (
    <>
      <PageTitle title="My listings" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <section>
          {tools === undefined ? (
            <RowSkeleton rows={4} />
          ) : tools.length === 0 ? (
            <Empty>You haven&apos;t listed anything yet. Add the first thing you&apos;re happy to lend.</Empty>
          ) : (
            <ul>
              {tools.map((t) => (
                <ItemRow
                  key={t._id}
                  href={`/tools/${t._id}`}
                  name={t.name}
                  category={t.category}
                  sub={
                    t.pendingRequests > 0 ? (
                      <b className="font-semibold text-ink">
                        {t.pendingRequests} {t.pendingRequests === 1 ? "request" : "requests"} waiting
                      </b>
                    ) : (
                      conditionLine(t.condition)
                    )
                  }
                  status={<LoopStatus loop={t.loop} now={now} />}
                />
              ))}
            </ul>
          )}
        </section>
        <aside className="border-t border-hairline pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Lend something</h2>
          <p className="mt-1 mb-4 text-[14px] text-slate">Neighbours see it as soon as you list it.</p>
          <ListingForm
            submitLabel="List it"
            error={create.error}
            pending={create.pending}
            onSubmit={async (values) => {
              const ok = await create.run(values);
              if (ok) toast.success("Listed. Neighbours can ask for it now.");
              return ok;
            }}
          />
        </aside>
      </div>
    </>
  );
}
