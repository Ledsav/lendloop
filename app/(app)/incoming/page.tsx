"use client";

import { useMutation, useQuery } from "convex/react";
import { LoanCard, type LoanRow } from "@/components/LoanCard";
import { Button, Empty, ErrorText, Loading, PageHeader } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import { useAction } from "@/lib/useAction";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  const open = loans?.filter((l) => l.status === "requested" || l.status === "approved") ?? [];
  const closed = loans?.filter((l) => !open.includes(l)) ?? [];

  return (
    <>
      <PageHeader title="Incoming requests" subtitle="Neighbors asking to borrow your tools." />
      {loans === undefined ? (
        <Loading />
      ) : loans.length === 0 ? (
        <Empty>No requests for your tools yet.</Empty>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            {open.length === 0 ? <Empty>Nothing waiting for you.</Empty> : open.map((loan) => <IncomingLoan key={loan._id} loan={loan} />)}
          </section>
          {closed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">History</h2>
              {closed.map((loan) => (
                <LoanCard key={loan._id} loan={loan} perspective="lender" />
              ))}
            </section>
          )}
        </div>
      )}
    </>
  );
}

function IncomingLoan({ loan }: { loan: LoanRow }) {
  const approve = useAction(useMutation(api.loans.approve));
  const decline = useAction(useMutation(api.loans.decline));
  const markReturned = useAction(useMutation(api.loans.markReturned));
  const busy = approve.pending || decline.pending || markReturned.pending;

  return (
    <div>
      <LoanCard
        loan={loan}
        perspective="lender"
        actions={
          loan.status === "requested" ? (
            <>
              <Button disabled={busy} onClick={() => approve.run({ loanId: loan._id })}>
                Approve
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => decline.run({ loanId: loan._id })}>
                Decline
              </Button>
            </>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={() => markReturned.run({ loanId: loan._id })}>
              Mark returned
            </Button>
          )
        }
      />
      <ErrorText>{approve.error ?? decline.error ?? markReturned.error}</ErrorText>
    </div>
  );
}
