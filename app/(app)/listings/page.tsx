"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { AvailabilityBadge } from "@/components/badges";
import { ListingForm } from "@/components/ListingForm";
import { Button, Card, Empty, ErrorText, Loading, PageHeader } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import { useAction } from "@/lib/useAction";

export default function MyListingsPage() {
  const tools = useQuery(api.tools.mine);
  const create = useAction(useMutation(api.tools.create));

  return (
    <>
      <PageHeader title="My listings" subtitle="Tools you're happy to lend." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="space-y-3">
          {tools === undefined ? (
            <Loading />
          ) : tools.length === 0 ? (
            <Empty>You haven&apos;t listed anything yet.</Empty>
          ) : (
            tools.map((tool) => <MyListing key={tool._id} tool={tool} />)
          )}
        </section>
        <aside>
          <Card>
            <h2 className="mb-3 font-medium">List a tool</h2>
            <ListingForm submitLabel="List it" error={create.error} pending={create.pending} onSubmit={create.run} />
          </Card>
        </aside>
      </div>
    </>
  );
}

type Listing = NonNullable<ReturnType<typeof useQuery<typeof api.tools.mine>>>[number];

function MyListing({ tool }: { tool: Listing }) {
  const [editing, setEditing] = useState(false);
  const update = useAction(useMutation(api.tools.update));
  const remove = useAction(useMutation(api.tools.remove));

  if (editing)
    return (
      <Card>
        <ListingForm
          initial={{ name: tool.name, category: tool.category, condition: tool.condition, description: tool.description }}
          submitLabel="Save"
          error={update.error}
          pending={update.pending}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const ok = await update.run({ toolId: tool._id, ...values });
            if (ok) setEditing(false);
            return ok;
          }}
        />
      </Card>
    );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{tool.name}</h3>
            <AvailabilityBadge value={tool.availability} />
          </div>
          <p className="text-sm text-stone-500 capitalize">
            {tool.category} · {tool.condition}
          </p>
          {tool.pendingRequests > 0 && (
            <Link href="/incoming" className="mt-1 inline-block text-sm text-brand-700 underline">
              {tool.pendingRequests} request{tool.pendingRequests > 1 ? "s" : ""} waiting
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            variant="danger"
            disabled={remove.pending}
            onClick={() => {
              if (confirm(`Remove "${tool.name}"? Open requests will be declined.`)) remove.run({ toolId: tool._id });
            }}
          >
            Remove
          </Button>
        </div>
      </div>
      {tool.description && <p className="mt-2 text-sm text-stone-700">{tool.description}</p>}
      <ErrorText>{remove.error}</ErrorText>
    </Card>
  );
}
