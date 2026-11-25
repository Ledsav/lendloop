import type { ReactNode } from "react";
import type { Loop } from "@/convex/lib/loans";
import { MiniDial } from "@/components/loop/MiniDial";
import { itemStatus, loanFraction, type StatusLines } from "@/lib/loop";

/** The right-hand column of a row: the mini dial over one or two short lines. */
export function StatusColumn({ dial, lines }: { dial: ReactNode; lines: StatusLines }) {
  const primary = lines.tone === "late" ? "text-late" : lines.tone === "muted" ? "text-slate" : "text-ink";
  return (
    <div className="grid min-w-[84px] justify-items-end gap-1 text-right text-[13px] leading-[1.25] text-slate">
      {dial}
      <span>
        <b className={`font-semibold ${primary}`}>{lines.primary}</b>
        {lines.secondary && (
          <>
            <br />
            {lines.secondary}
          </>
        )}
      </span>
    </div>
  );
}

/** An item's loop as a status column: free now, day N of M, or late. */
export function LoopStatus({ loop, now }: { loop: Loop; now: number }) {
  const fraction = loop.state === "out" ? loanFraction(loop.startDate, loop.endDate, now) : 0;
  return <StatusColumn dial={<MiniDial state={loop.state} fraction={fraction} />} lines={itemStatus(loop)} />;
}
