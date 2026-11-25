"use client";

import { useMutation } from "convex/react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ErrorText } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { daysInclusive, rangeProblem } from "@/lib/booking";
import { isoToLocalDate, localDateToIso, rangeLong } from "@/lib/format";
import { useAction } from "@/lib/useAction";

/**
 * Pick a range on the calendar and ask for it. Past days and days someone already has are
 * disabled; `today` is the server's, so the calendar and the server agree on what "past" means.
 * The parent keeps the picked range, so it survives the calendar moving between the page and the
 * phone's sheet.
 */
export function RequestDates({
  toolId,
  ownerName,
  today,
  booked,
  range,
  onRangeChange,
  onDone,
}: {
  toolId: Id<"tools">;
  ownerName: string;
  today: string;
  booked: { startDate: string; endDate: string }[];
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  onDone?: () => void;
}) {
  const request = useAction(useMutation(api.loans.request));
  const start = range?.from ? localDateToIso(range.from) : undefined;
  const end = range?.to ? localDateToIso(range.to) : undefined;
  const problem = rangeProblem(start, end, booked, today);
  const last = end ?? start;
  const taken = booked.map((b) => ({ from: isoToLocalDate(b.startDate), to: isoToLocalDate(b.endDate) }));

  return (
    <div>
      <Calendar
        mode="range"
        selected={range}
        onSelect={onRangeChange}
        weekStartsOn={1}
        defaultMonth={isoToLocalDate(today)}
        disabled={[{ before: isoToLocalDate(today) }, ...taken]}
        // Past days just fade; days someone already has are struck through.
        modifiers={{ booked: taken }}
        modifiersClassNames={{ booked: "[&_button]:line-through [&_button]:decoration-slate" }}
      />
      <p aria-live="polite" className="mt-3 min-h-[22px] text-[15px]">
        {start && last && !problem ? (
          <>
            {rangeLong(start, last)}, {daysInclusive(start, last)} {daysInclusive(start, last) === 1 ? "day" : "days"}
          </>
        ) : (
          <span className={start ? "text-late" : "text-slate"}>{problem}</span>
        )}
      </p>
      <Button
        className="mt-3 w-full sm:w-auto"
        disabled={!!problem || request.pending}
        onClick={async () => {
          if (!start || !last) return;
          if (await request.run({ toolId, startDate: start, endDate: last })) {
            toast.success(`Dates requested. ${ownerName} gets an email.`);
            onRangeChange(undefined);
            onDone?.();
          }
        }}
      >
        Request dates
      </Button>
      <div className="mt-2">
        <ErrorText>{request.error}</ErrorText>
      </div>
    </div>
  );
}
