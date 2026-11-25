"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Drawing } from "@/components/items/drawings";
import { OwnerControls, type ItemDetail } from "@/components/items/OwnerControls";
import { RequestDates } from "@/components/items/RequestDates";
import { Dial } from "@/components/loop/Dial";
import { UseStrip } from "@/components/loop/UseStrip";
import { Empty } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { drawingFor } from "@/lib/drawings";
import { conditionLine, rangeLong, times } from "@/lib/format";
import { borrowHeading, usageLine } from "@/lib/loop";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useNow } from "@/lib/useNow";

const BackLink = () => (
  <Link href="/tools" className="text-[15px] font-medium text-slate hover:text-ink">
    ‹ Things to borrow
  </Link>
);

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const item = useQuery(api.tools.get, { id });
  const now = useNow();

  if (item === undefined) return <ItemSkeleton />;
  if (item === null)
    return (
      <>
        <BackLink />
        <Empty
          action={
            <Button asChild variant="secondary">
              <Link href="/tools">Back to things to borrow</Link>
            </Button>
          }
        >
          This listing isn&apos;t here any more. It may have been removed.
        </Empty>
      </>
    );

  const owner = item.owner;
  return (
    <>
      <BackLink />
      <div className="mt-3 grid gap-4 lg:mt-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <div className="flex justify-center lg:sticky lg:top-8">
          <Dial loop={item.loop} now={now} plate={<Drawing kind={drawingFor(item.name, item.category)} />} />
        </div>
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.025em] break-words">{item.name}</h1>
          <p className="mt-2 text-[15px] text-slate">
            {item.isMine ? (
              <>Your listing. {conditionLine(item.condition)}</>
            ) : (
              <>
                Lent by <b className="font-semibold text-ink">{owner.name}</b>
                {owner.trustedLender && ", a trusted lender"}. {conditionLine(item.condition)}
              </>
            )}
          </p>
          {!item.isMine && owner.lentCount > 0 && (
            <p className="mt-0.5 text-[14px] text-slate">
              {owner.name} has lent {times(owner.lentCount)}.
            </p>
          )}
          {item.description && (
            <p className="mt-4 font-serif text-[18px] leading-[1.4] break-words text-ink italic">{item.description}</p>
          )}
          <div className="mt-6">
            <p className="mb-2 text-[14px] text-slate">{usageLine(item.usage.recent, item.usage.total)}</p>
            <UseStrip strip={item.usage.strip} today={item.today} />
          </div>
          <div className="mt-6 border-t border-hairline pt-6">
            {item.isMine ? <OwnerControls item={item} /> : <BorrowPanel item={item} />}
          </div>
        </div>
      </div>
    </>
  );
}

function BorrowPanel({ item }: { item: ItemDetail }) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const owner = item.owner.name;
  const loop = item.loop;

  const heading = borrowHeading(loop, owner, item.nextFree);

  const picker = (
    <RequestDates
      toolId={item._id}
      ownerName={owner}
      today={item.today}
      booked={item.booked}
      range={range}
      onRangeChange={setRange}
      onDone={() => setOpen(false)}
    />
  );

  return (
    <div className="space-y-4">
      {/* A loan that has started is on the dial already; mention only what's still to come. */}
      {item.myLoans.filter((l) => l.status === "requested" || l.startDate > item.today).map((l) => (
        <p key={l._id} className="text-[15px]">
          {l.status === "requested" ? (
            <>
              You asked for {rangeLong(l.startDate, l.endDate)}. Waiting for {owner}.{" "}
            </>
          ) : (
            <>
              {owner} said yes to {rangeLong(l.startDate, l.endDate)}.{" "}
            </>
          )}
          <Link href="/requests" className="underline decoration-hairline underline-offset-4 hover:decoration-ink">
            My requests
          </Link>
        </p>
      ))}
      <p className="leading-snug">
        <b className={`block text-[16px] font-semibold ${heading.tone === "late" ? "text-late" : ""}`}>{heading.title}</b>
        <span className="text-[14px] text-slate">{heading.sub}</span>
      </p>
      {wide ? (
        picker
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="w-full">Request dates</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="px-4 pt-5 pb-6">
            <SheetHeader className="p-0">
              <SheetTitle>Request dates</SheetTitle>
              <SheetDescription>
                {item.name}, lent by {owner}
              </SheetDescription>
            </SheetHeader>
            <div className="flex justify-center">{picker}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14" aria-busy="true" aria-label="Loading">
      <div className="flex justify-center">
        <Skeleton className="size-[260px] rounded-full bg-plate" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}
