"use client";

import { useState, type ReactNode } from "react";
import { ItemRow } from "@/components/items/ItemRow";
import { StatusColumn } from "@/components/items/StatusColumn";
import { MiniDial } from "@/components/loop/MiniDial";
import { loanStatus } from "@/lib/loop";
import type { LoanRowData } from "@/lib/timeline";
import { Timeline } from "./Timeline";

function otherParty(loan: LoanRowData) {
  if (loan.viewerRole === "borrower") return `From ${loan.owner.name}`;
  if (loan.viewerRole === "owner") return `For ${loan.borrower.name}`;
  return `${loan.borrower.name}, from ${loan.owner.name}`;
}

/**
 * One loan: the item, who it's with, where it is on its loop, the actions that fit, and its
 * history. Past loans keep their history folded away behind "Show history".
 */
export function LoanRow({
  loan,
  today,
  now,
  actions,
  dense = false,
  collapsed = false,
}: {
  loan: LoanRowData;
  today: string;
  now: number;
  actions?: ReactNode;
  dense?: boolean;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  const status = loanStatus(loan, today, now);
  return (
    <ItemRow
      href={loan.tool.removed ? undefined : `/tools/${loan.tool._id}`}
      name={loan.tool.name}
      category={loan.tool.category}
      sub={loan.tool.removed ? `${otherParty(loan)}. Listing removed.` : otherParty(loan)}
      status={<StatusColumn dial={<MiniDial state={status.dial} fraction={status.fraction} />} lines={status.lines} />}
      dense={dense}
    >
      <div className="space-y-3">
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        {collapsed && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="cursor-pointer text-[14px] text-slate underline decoration-hairline underline-offset-4 hover:text-ink hover:decoration-ink"
          >
            {open ? "Hide history" : "Show history"}
          </button>
        )}
        {open && <Timeline loan={loan} now={now} />}
      </div>
    </ItemRow>
  );
}
