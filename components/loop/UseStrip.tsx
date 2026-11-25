import type { StripLoan } from "@/convex/lib/itemStats";
import { stripMonths, stripSegments } from "@/lib/loop";

/** The last 12 weeks as a thin bar: past loans in ink, the current one in ultramarine. Dates only. */
export function UseStrip({ strip, today }: { strip: StripLoan[]; today: string }) {
  const months = stripMonths(today);
  return (
    <div aria-hidden="true">
      <div className="relative h-[10px] overflow-hidden rounded-[5px] bg-plate">
        {stripSegments(strip, today).map((s, i) => (
          <i
            key={i}
            className={`absolute inset-y-0 rounded-[2px] ${s.current ? "bg-ultramarine" : "bg-ink"}`}
            style={{ left: `${s.left}%`, width: `${s.width}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 h-5 text-[12.5px] text-slate">
        {months.map((m) => (
          <span key={m.label} className="absolute top-0" style={m.left > 92 ? { right: 0 } : { left: `${m.left}%` }}>
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
