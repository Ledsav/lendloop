"use client";

import { useMutation, useQuery } from "convex/react";
import { AvailabilityBadge } from "@/components/badges";
import { LoanCard } from "@/components/LoanCard";
import { Button, Card, Empty, ErrorText, Loading, PageHeader } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { timeAgo } from "@/lib/format";
import { useAction } from "@/lib/useAction";

/** The UI hides this page from non-admins; every query and mutation here checks the role again on the server. */
export default function AdminPage() {
  const me = useQuery(api.users.me);
  if (me === undefined) return <Loading />;
  if (me?.role !== "admin") return <Empty>Admins only.</Empty>;
  return <AdminConsole />;
}

function AdminConsole() {
  const users = useQuery(api.admin.users);
  const loans = useQuery(api.admin.allLoans);
  const tools = useQuery(api.tools.list, {});
  const failed = useQuery(api.admin.failedAutomation);
  const setTrusted = useAction(useMutation(api.admin.setTrustedLender));
  const removeTool = useAction(useMutation(api.tools.remove));
  const retry = useAction(useMutation(api.admin.retryNotification));

  return (
    <>
      <PageHeader title="Admin" subtitle="Moderate listings, review loans, keep an eye on automation." />
      <div className="space-y-10">
        <section>
          <h2 className="mb-3 font-medium">Automation failures</h2>
          {failed === undefined ? (
            <Loading />
          ) : failed.notifications.length + failed.reminders.length === 0 ? (
            <Empty>Nothing failed. Notifications and reminders that give up show here.</Empty>
          ) : (
            <Card className="divide-y divide-stone-100 p-0">
              {failed.notifications.map((n) => (
                <div key={n._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>
                    ✉️ {n.type} · {n.attempts} attempts · <span className="text-red-700">{n.error}</span> · {timeAgo(n.at)}
                  </span>
                  <Button variant="secondary" disabled={retry.pending} onClick={() => retry.run({ outboxId: n._id })}>
                    Retry
                  </Button>
                </div>
              ))}
              {failed.reminders.map((r) => (
                <div key={r._id} className="px-4 py-2 text-sm">
                  ⏰ Reminder for {r.date} · <span className="text-red-700">{r.error || "failed"}</span> · {timeAgo(r.at)}
                </div>
              ))}
            </Card>
          )}
          <ErrorText>{retry.error}</ErrorText>
        </section>

        <section>
          <h2 className="mb-3 font-medium">Users</h2>
          {users === undefined ? (
            <Loading />
          ) : (
            <Card className="divide-y divide-stone-100 p-0">
              {users.map((u) => (
                <div key={u._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span>
                    {u.name} {u.role === "admin" && <span className="text-xs text-stone-400">(admin)</span>} · {u.listings} listing
                    {u.listings === 1 ? "" : "s"}
                  </span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={u.trustedLender}
                      disabled={setTrusted.pending}
                      onChange={(e) => setTrusted.run({ userId: u._id, trusted: e.target.checked })}
                      className="accent-brand-700"
                    />
                    Trusted Lender
                  </label>
                </div>
              ))}
            </Card>
          )}
          <ErrorText>{setTrusted.error}</ErrorText>
        </section>

        <section>
          <h2 className="mb-3 font-medium">Listings</h2>
          {tools === undefined ? (
            <Loading />
          ) : tools.length === 0 ? (
            <Empty>No listings.</Empty>
          ) : (
            <Card className="divide-y divide-stone-100 p-0">
              {tools.map((t) => (
                <div key={t._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {t.name} <span className="text-stone-400">by {t.owner.name}</span> <AvailabilityBadge value={t.availability} />
                  </span>
                  <RemoveButton toolId={t._id} name={t.name} run={removeTool.run} pending={removeTool.pending} />
                </div>
              ))}
            </Card>
          )}
          <ErrorText>{removeTool.error}</ErrorText>
        </section>

        <section>
          <h2 className="mb-3 font-medium">All loans</h2>
          {loans === undefined ? (
            <Loading />
          ) : loans.length === 0 ? (
            <Empty>No loans yet.</Empty>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <LoanCard key={loan._id} loan={loan} perspective="admin" />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function RemoveButton({
  toolId,
  name,
  run,
  pending,
}: {
  toolId: Id<"tools">;
  name: string;
  run: (args: { toolId: Id<"tools"> }) => Promise<boolean>;
  pending: boolean;
}) {
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove "${name}" for everyone? Open requests are declined and borrowers notified.`)) run({ toolId });
      }}
    >
      Remove
    </Button>
  );
}
