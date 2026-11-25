"use client";

import { useMutation, useQuery } from "convex/react";
import { LoanCard, type LoanRow } from "@/components/LoanCard";
import { Button, Empty, ErrorText, Loading, PageHeader } from "@/components/legacy-ui";
import { api } from "@/convex/_generated/api";
import { todayUtc } from "@/lib/format";
import { useAction } from "@/lib/useAction";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  return (
    <>
      <PageHeader title="My requests" subtitle="Things you asked to borrow." />
      {loans === undefined ? (
        <Loading />
      ) : loans.length === 0 ? (
        <Empty>No requests yet. Browse the tools and ask a neighbor.</Empty>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <MyRequest key={loan._id} loan={loan} />
          ))}
        </div>
      )}
    </>
  );
}

function MyRequest({ loan }: { loan: LoanRow }) {
  const cancel = useAction(useMutation(api.loans.cancel));
  const canCancel = loan.status === "requested" || (loan.status === "approved" && loan.startDate > todayUtc());
  return (
    <div>
      <LoanCard
        loan={loan}
        perspective="borrower"
        actions={
          canCancel && (
            <Button variant="secondary" disabled={cancel.pending} onClick={() => cancel.run({ loanId: loan._id })}>
              Cancel
            </Button>
          )
        }
      />
      <ErrorText>{cancel.error}</ErrorText>
    </div>
  );
}
