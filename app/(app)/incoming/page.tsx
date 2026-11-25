"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ConfirmAction";
import { LoanRow } from "@/components/loans/LoanRow";
import { Empty, ErrorText, PageTitle, RowSkeleton, SectionTitle } from "@/components/states";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { today as utcDay } from "@/convex/lib/dates";
import { thing } from "@/lib/format";
import { groupLoans, type LoanRowData } from "@/lib/timeline";
import { useAction } from "@/lib/useAction";
import { useNow } from "@/lib/useNow";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  const now = useNow();
  const today = utcDay(now);

  if (loans === undefined)
    return (
      <>
        <PageTitle title="Incoming requests" />
        <RowSkeleton />
      </>
    );
  if (loans.length === 0)
    return (
      <>
        <PageTitle title="Incoming requests" />
        <Empty
          action={
            <Button asChild variant="secondary">
              <Link href="/listings">Lend something</Link>
            </Button>
          }
        >
          No one has asked for your things yet. Each request shows up here, and you get an email too.
        </Empty>
      </>
    );

  const g = groupLoans(loans, today);
  const section = (title: string, list: LoanRowData[], past = false) =>
    list.length > 0 && (
      <section>
        <SectionTitle>{title}</SectionTitle>
        <ul>
          {list.map((loan) => (
            <IncomingLoan key={loan._id} loan={loan} today={today} now={now} past={past} />
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <PageTitle title="Incoming requests" />
      {section("Needs your answer", g.waiting)}
      {section("Lent out now", g.now)}
      {section("Coming up", g.upcoming)}
      {section("Past", g.past, true)}
    </>
  );
}

function IncomingLoan({ loan, today, now, past }: { loan: LoanRowData; today: string; now: number; past: boolean }) {
  const approve = useAction(useMutation(api.loans.approve));
  const decline = useAction(useMutation(api.loans.decline));
  const markReturned = useAction(useMutation(api.loans.markReturned));
  const borrower = loan.borrower.name;
  const busy = approve.pending || decline.pending || markReturned.pending;

  let actions = null;
  if (loan.status === "requested")
    actions = (
      <>
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            if (await approve.run({ loanId: loan._id })) toast.success(`Approved. ${borrower} gets an email.`);
          }}
        >
          Approve
        </Button>
        <ConfirmAction
          label="Decline"
          size="sm"
          title={`Decline ${borrower}'s request?`}
          body={`${borrower} gets an email saying no. You can't undo this.`}
          confirmLabel="Decline"
          error={decline.error}
          pending={decline.pending}
          onOpen={decline.clearError}
          onConfirm={async () => {
            const ok = await decline.run({ loanId: loan._id });
            if (ok) toast.success(`Declined. ${borrower} gets an email.`);
            return ok;
          }}
        />
        <ErrorText>{approve.error}</ErrorText>
      </>
    );
  else if (loan.status === "approved" && loan.startDate <= today)
    actions = (
      <ConfirmAction
        label="Mark returned"
        size="sm"
        title={`Mark ${thing(loan.tool.name)} returned?`}
        body={`Do this once it's back with you. The loan closes and ${borrower} gets an email.`}
        confirmLabel="Mark returned"
        error={markReturned.error}
        pending={markReturned.pending}
        onOpen={markReturned.clearError}
        onConfirm={async () => {
          const ok = await markReturned.run({ loanId: loan._id });
          if (ok) toast.success(`Marked returned. ${borrower} gets an email.`);
          return ok;
        }}
      />
    );

  return <LoanRow loan={loan} today={today} now={now} collapsed={past} actions={actions} />;
}
