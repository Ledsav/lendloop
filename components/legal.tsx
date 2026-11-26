import type { ReactNode } from "react";

export const EFFECTIVE_DATE = "26 November 2026";

/** The first thing on every legal page: what this document is and isn't. */
export function SampleNote() {
  return (
    <p className="mt-4 border-l-2 border-ultramarine pl-4 text-[15px] text-slate">
      Sample document for a portfolio project. LendLoop is a fictional company and this isn&apos;t legal advice. In effect from{" "}
      {EFFECTIVE_DATE}.
    </p>
  );
}

export function LegalTitle({ title, intro }: { title: string; intro: string }) {
  return (
    <header>
      <h1 className="text-[30px] leading-[1.05] font-bold tracking-[-0.025em] sm:text-[40px]">{title}</h1>
      <p className="mt-3 text-[17px] text-slate">{intro}</p>
      <SampleNote />
    </header>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em]">{title}</h2>
      <div className="space-y-3 text-[16px] leading-relaxed text-ink [&_a]:underline [&_a]:decoration-hairline [&_a]:underline-offset-4 hover:[&_a]:decoration-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

/**
 * A plain table with hairline rows. On a phone each row stacks into a small block, the first cell as
 * its heading and the others labelled, so nothing hides off the side of the screen.
 */
export function LegalTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-left text-[15px]">
      <thead className="max-sm:hidden">
        <tr className="border-b border-ink">
          {head.map((h) => (
            <th key={h} className="py-2 pr-4 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-hairline align-top max-sm:block max-sm:py-2.5">
            {cells.map((c, j) => (
              <td
                key={j}
                data-label={head[j]}
                className={`py-2.5 pr-4 max-sm:block max-sm:py-0.5 max-sm:pr-0 ${
                  j === 0
                    ? "max-sm:font-semibold"
                    : "max-sm:before:block max-sm:before:text-[13px] max-sm:before:text-slate max-sm:before:content-[attr(data-label)]"
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
