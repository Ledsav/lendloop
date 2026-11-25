import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.025em]">{title}</h1>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 mb-1 text-[18px] font-semibold tracking-[-0.01em] first:mt-2">{children}</h2>;
}

/** An empty list: say what to do next, plainly. */
export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-10">
      <p className="max-w-[46ch] text-[15px] text-slate">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[14px] text-late">
      {children}
    </p>
  );
}

/** Loading: rows shaped like the real ones, not a spinner. */
export function RowSkeleton({ rows = 5, dense = false }: { rows?: number; dense?: boolean }) {
  const plate = dense ? "size-10" : "size-16";
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={`flex items-center gap-3.5 border-b border-hairline ${dense ? "py-2.5" : "py-3.5"}`}>
          <Skeleton className={`${plate} shrink-0 rounded-[14px] bg-plate`} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-1/5" />
          </div>
          <Skeleton className="size-[26px] rounded-full" />
        </li>
      ))}
    </ul>
  );
}
