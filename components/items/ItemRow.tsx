import Link from "next/link";
import type { ReactNode } from "react";
import type { Category } from "@/convex/lib/validators";
import { ItemPlate } from "./ItemPlate";

/**
 * One row of a list: the item's plate, its name with one line under it, and a status column on
 * the right. Rows are separated by hairlines, not boxed into cards. `children` (actions, a
 * timeline) line up under the name.
 */
export function ItemRow({
  href,
  name,
  category,
  sub,
  status,
  dense = false,
  children,
}: {
  href?: string;
  name: string;
  category: Category;
  sub?: ReactNode;
  status?: ReactNode;
  dense?: boolean;
  children?: ReactNode;
}) {
  const grid = (
    <>
      <ItemPlate name={name} category={category} size={dense ? 40 : 64} />
      <div className="min-w-0">
        <p className={`line-clamp-2 leading-tight font-semibold tracking-[-0.005em] ${dense ? "text-[15px]" : "text-[16px]"}`}>{name}</p>
        {sub && <div className="mt-0.5 text-[14px] text-slate">{sub}</div>}
      </div>
      {status ?? <span />}
    </>
  );
  const layout = `grid items-center ${dense ? "grid-cols-[40px_minmax(0,1fr)_auto] gap-3 py-2.5" : "grid-cols-[64px_minmax(0,1fr)_auto] gap-3.5 py-3.5"}`;
  return (
    <li className="border-b border-hairline">
      {href ? (
        <Link href={href} className={`${layout} -mx-2 rounded-[12px] px-2 transition-colors hover:bg-field/70`}>
          {grid}
        </Link>
      ) : (
        <div className={layout}>{grid}</div>
      )}
      {children && <div className={`pb-3.5 ${dense ? "pl-[52px]" : "pl-[78px]"}`}>{children}</div>}
    </li>
  );
}
