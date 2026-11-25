import { when } from "@/lib/format";
import { isFailure, timelineText, type LoanRowData } from "@/lib/timeline";

/** A loan's story, oldest first: what people did and which emails and reminders went out. */
export function Timeline({ loan, now }: { loan: LoanRowData; now: number }) {
  if (loan.timeline.length === 0) return null;
  return (
    <ol className="space-y-0.5 text-[14px] leading-snug text-slate">
      {loan.timeline.map((entry, i) => (
        <li key={i} className={isFailure(entry) ? "text-late" : undefined}>
          {timelineText(entry, loan)}, {when(entry.at, now)}
        </li>
      ))}
    </ol>
  );
}
