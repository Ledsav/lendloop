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

/** A plain table with hairline rows; scrolls sideways inside itself on a narrow phone. */
export function LegalTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
        <thead>
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
            <tr key={i} className="border-b border-hairline align-top">
              {cells.map((c, j) => (
                <td key={j} className="py-2.5 pr-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
