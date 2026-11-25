"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ItemRow } from "@/components/items/ItemRow";
import { LoopStatus } from "@/components/items/StatusColumn";
import { LoanRow } from "@/components/loans/LoanRow";
import { LoanSection } from "@/components/loans/LoanSection";
import { Empty, ErrorText, PageTitle, RowSkeleton, SectionTitle } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { today as utcDay } from "@/convex/lib/dates";
import { thing, times, when } from "@/lib/format";
import { EVENT_NOUN, groupLoans } from "@/lib/timeline";
import { useAction } from "@/lib/useAction";
import { useNow } from "@/lib/useNow";

/** The UI hides this page from non-admins; every query and mutation here checks the role again on the server. */
export default function AdminPage() {
  const me = useQuery(api.users.me);
  if (me === undefined) return <RowSkeleton />;
  if (me?.role !== "admin") return <Empty>Only admins can see this page.</Empty>;
  return <AdminConsole />;
}

type Failures = FunctionReturnType<typeof api.admin.failedAutomation>;
type Listing = FunctionReturnType<typeof api.tools.list>[number];
type Person = FunctionReturnType<typeof api.admin.users>[number];

function AdminConsole() {
  const failed = useQuery(api.admin.failedAutomation);
  const loans = useQuery(api.admin.allLoans);
  const tools = useQuery(api.tools.list, {});
  const people = useQuery(api.admin.users);
  const now = useNow();
  const today = utcDay(now);

  const grouped = loans && groupLoans(loans, today);
  const ordered = grouped ? [...grouped.now, ...grouped.waiting, ...grouped.upcoming, ...grouped.past] : [];

  return (
    <>
      <PageTitle title="Admin" />

      <section>
        <SectionTitle>Automation failures</SectionTitle>
        {failed === undefined ? (
          <RowSkeleton rows={2} dense />
        ) : failed.notifications.length + failed.reminders.length === 0 ? (
          <p className="py-3 text-[15px] text-slate">Nothing failed. Emails and reminders that give up show up here first.</p>
        ) : (
          <ul>
            {failed.notifications.map((n) => (
              <FailedEmail key={n._id} failure={n} now={now} />
            ))}
            {failed.reminders.map((r) => (
              <li key={r._id} className="border-b border-hairline py-3 text-[15px]">
                <p className="text-late">
                  Reminder to {r.borrower} about {thing(r.tool)} failed: {r.error || "no reason given"}. It&apos;s tried again on
                  the next daily run.
                </p>
                <p className="text-[13px] text-slate">{when(r.at, now)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loans === undefined ? (
        <section>
          <SectionTitle>Loans</SectionTitle>
          <RowSkeleton rows={4} dense />
        </section>
      ) : ordered.length === 0 ? (
        <section>
          <SectionTitle>Loans</SectionTitle>
          <p className="py-3 text-[15px] text-slate">No loans yet.</p>
        </section>
      ) : (
        <LoanSection
          title="Loans"
          loans={ordered}
          limit={12}
          render={(loan) => <LoanRow key={loan._id} loan={loan} today={today} now={now} dense collapsed />}
        />
      )}

      <section>
        <SectionTitle>Listings</SectionTitle>
        {tools === undefined ? (
          <RowSkeleton rows={4} dense />
        ) : tools.length === 0 ? (
          <p className="py-3 text-[15px] text-slate">No listings yet.</p>
        ) : (
          <ul>
            {tools.map((t) => (
              <AdminListing key={t._id} listing={t} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>People</SectionTitle>
        {people === undefined ? (
          <RowSkeleton rows={4} dense />
        ) : (
          <ul>
            {people.map((p) => (
              <AdminPerson key={p._id} person={p} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function FailedEmail({ failure, now }: { failure: Failures["notifications"][number]; now: number }) {
  const retry = useAction(useMutation(api.admin.retryNotification));
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline py-3">
      <div className="min-w-0 flex-1 text-[15px]">
        <p className="text-late">
          Email to {failure.recipient} about the {EVENT_NOUN[failure.type]} for {thing(failure.tool)} failed after {failure.attempts}{" "}
          tries: {failure.error || "no reason given"}.
        </p>
        <p className="text-[13px] text-slate">{when(failure.at, now)}</p>
        <ErrorText>{retry.error}</ErrorText>
      </div>
      <Button
        variant="secondary"
        size="sm"
        disabled={retry.pending}
        onClick={async () => {
          if (await retry.run({ outboxId: failure._id })) toast.success("Retrying the email.");
        }}
      >
        Retry
      </Button>
    </li>
  );
}

function AdminListing({ listing, now }: { listing: Listing; now: number }) {
  const remove = useAction(useMutation(api.tools.remove));
  return (
    <ItemRow
      href={`/tools/${listing._id}`}
      name={listing.name}
      category={listing.category}
      sub={listing.owner.name}
      status={<LoopStatus loop={listing.loop} now={now} />}
      dense
    >
      <ConfirmAction
        label="Remove"
        size="sm"
        variant="ghost"
        title={`Remove ${thing(listing.name)} for everyone?`}
        body="Open requests are declined and loans that haven't started are cancelled. Each neighbour gets an email."
        confirmLabel="Remove listing"
        destructive
        error={remove.error}
        pending={remove.pending}
        onOpen={remove.clearError}
        onConfirm={async () => {
          const ok = await remove.run({ toolId: listing._id });
          if (ok) toast.success("Listing removed.");
          return ok;
        }}
      />
    </ItemRow>
  );
}

function AdminPerson({ person }: { person: Person }) {
  const setTrusted = useAction(useMutation(api.admin.setTrustedLender));
  const listings = person.listings === 0 ? "No listings." : `${person.listings} ${person.listings === 1 ? "listing" : "listings"}.`;
  const lent = person.lentCount === 0 ? "Not lent yet." : `Lent ${times(person.lentCount)}.`;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-3">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">
          {person.name}
          {person.role === "admin" && <span className="ml-2 text-[13px] font-normal text-slate">admin</span>}
        </p>
        <p className="text-[14px] text-slate">
          {listings} {lent}
        </p>
        <ErrorText>{setTrusted.error}</ErrorText>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-slate">
        Trusted lender
        <Switch
          checked={person.trustedLender}
          disabled={setTrusted.pending}
          aria-label={`${person.name} is a trusted lender`}
          onCheckedChange={async (trusted) => {
            if (await setTrusted.run({ userId: person._id, trusted }))
              toast.success(trusted ? `${person.name} is now a trusted lender.` : `${person.name} is no longer a trusted lender.`);
          }}
        />
      </label>
    </li>
  );
}
