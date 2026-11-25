"use client";

import { useState, type ReactNode } from "react";
import { SectionTitle } from "@/components/states";
import type { LoanRowData } from "@/lib/timeline";

/** A titled list of loans; long ones (past loans) show the most recent few until asked for all. */
export function LoanSection({
  title,
  loans,
  render,
  limit,
  moreLabel = "loans",
}: {
  title: string;
  loans: LoanRowData[];
  render: (loan: LoanRowData) => ReactNode;
  limit?: number;
  moreLabel?: string;
}) {
  const [all, setAll] = useState(false);
  if (loans.length === 0) return null;
  const shown = limit && !all ? loans.slice(0, limit) : loans;
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <ul>{shown.map(render)}</ul>
      {shown.length < loans.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 cursor-pointer text-[15px] font-medium text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
        >
          Show all {loans.length} {moreLabel}
        </button>
      )}
    </section>
  );
}
