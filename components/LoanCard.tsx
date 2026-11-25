"use client";

import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { formatDate, timeAgo } from "@/lib/format";
import { LoanStatusBadge, TrustedBadge } from "./badges";
import { Card } from "./ui";

export type LoanRow = FunctionReturnType<typeof api.loans.myRequests>[number];

const ACTIVITY_STATUS: Record<string, string> = {
  pending: "queued",
  accepted: "handed to n8n",
  sent: "sent",
  failed: "failed",
  skipped: "skipped (n8n not configured)",
};

/** One loan: who, what, when, its status and its recent automation activity. */
export function LoanCard({ loan, perspective, actions }: { loan: LoanRow; perspective: "borrower" | "lender" | "admin"; actions?: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{loan.tool.name}</h3>
            <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
            {loan.tool.removed && <span className="text-xs text-stone-400">listing removed</span>}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {formatDate(loan.startDate)} – {formatDate(loan.endDate)}
            {perspective !== "lender" && (
              <>
                {" · "}from {loan.owner.name} {loan.owner.trustedLender && <TrustedBadge />}
              </>
            )}
            {perspective !== "borrower" && <> · borrowed by {loan.borrower.name}</>}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {loan.activity.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t border-stone-100 pt-2 text-xs text-stone-500">
          {loan.activity.map((a, i) => (
            <li key={i} className={a.status === "failed" ? "text-red-600" : undefined}>
              {a.kind === "reminder" ? "⏰" : "✉️"} {a.label}: {ACTIVITY_STATUS[a.status] ?? a.status}, {timeAgo(a.at)}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
