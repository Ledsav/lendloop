"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ConfirmAction";
import { LoanRow } from "@/components/loans/LoanRow";
import { Empty, PageTitle, RowSkeleton, SectionTitle } from "@/components/states";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { today as utcDay } from "@/convex/lib/dates";
import { thing } from "@/lib/format";
import { groupLoans, type LoanRowData } from "@/lib/timeline";
import { useAction } from "@/lib/useAction";
import { useNow } from "@/lib/useNow";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  const now = useNow();
  const today = utcDay(now);

  if (loans === undefined)
    return (
      <>
        <PageTitle title="My requests" />
        <RowSkeleton />
      </>
    );
  if (loans.length === 0)
    return (
      <>
        <PageTitle title="My requests" />
        <Empty
          action={
            <Button asChild>
              <Link href="/tools">Find something to borrow</Link>
            </Button>
          }
        >
          You haven&apos;t asked to borrow anything yet.
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
            <MyRequest key={loan._id} loan={loan} today={today} now={now} past={past} />
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <PageTitle title="My requests" />
      {section("Borrowing now", g.now)}
      {section("Waiting for an answer", g.waiting)}
      {section("Coming up", g.upcoming)}
      {section("Past", g.past, true)}
    </>
  );
}

function MyRequest({ loan, today, now, past }: { loan: LoanRowData; today: string; now: number; past: boolean }) {
  const cancel = useAction(useMutation(api.loans.cancel));
  const lender = loan.owner.name;
  const canCancel = loan.status === "requested" || (loan.status === "approved" && loan.startDate > today);
  return (
    <LoanRow
      loan={loan}
      today={today}
      now={now}
      collapsed={past}
      actions={
        canCancel && (
          <ConfirmAction
            label="Cancel request"
            size="sm"
            title={`Cancel your request for ${thing(loan.tool.name)}?`}
            body={`${lender} gets an email. To borrow it later, request dates again.`}
            confirmLabel="Cancel request"
            cancelLabel="Keep it"
            error={cancel.error}
            pending={cancel.pending}
            onOpen={cancel.clearError}
            onConfirm={async () => {
              const ok = await cancel.run({ loanId: loan._id });
              if (ok) toast.success(`Request cancelled. ${lender} gets an email.`);
              return ok;
            }}
          />
        )
      }
    />
  );
}
