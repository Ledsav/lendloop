import type { ReactNode } from "react";
import { arcPath, pos } from "@/lib/loop";

const STOPS: [number, string][] = [
  [0.1, "Ask"],
  [0.5, "Borrow"],
  [0.9, "Return"],
];
const PROGRESS = 0.62;

/**
 * The landing page's dial: one loan's trip round the loop with its three stops. The arc draws
 * itself once when the page loads (the page's one orchestrated moment), then stays still.
 */
export function StageDial({ size, caption, plate }: { size: number; caption?: string; plate?: ReactNode }) {
  const S = size;
  const c = S / 2;
  const r = S * 0.34;
  const big = S > 300;
  const ticks = Array.from({ length: 72 }, (_, k) => {
    const fr = k / 72;
    const [x1, y1] = pos(c, c, r + S * 0.045, fr);
    const [x2, y2] = pos(c, c, r + S * 0.06, fr);
    return (
      <line
        key={k}
        x1={x1.toFixed(1)}
        y1={y1.toFixed(1)}
        x2={x2.toFixed(1)}
        y2={y2.toFixed(1)}
        stroke={fr <= PROGRESS ? "#9aa6e6" : "#dddcd7"}
        strokeWidth="1.2"
      />
    );
  });
  const len = (2 * Math.PI * r * PROGRESS).toFixed(1);
  const [hx, hy] = pos(c, c, r, PROGRESS);
  const plateSize = S * 0.3;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full" role="img" aria-label="A loan's trip round the loop: ask, borrow, return">
      {ticks}
      {STOPS.map(([fr, label]) => {
        const [x1, y1] = pos(c, c, r + S * 0.03, fr);
        const [x2, y2] = pos(c, c, r + S * 0.075, fr);
        const [lx, ly] = pos(c, c, r + S * 0.13, fr);
        return (
          <g key={label}>
            <line x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--color-ink)" strokeWidth="2" />
            <text x={lx.toFixed(1)} y={(ly + 5).toFixed(1)} textAnchor="middle" fontSize={big ? 16 : 13} fontWeight="600" fill="var(--color-ink)">
              {label}
            </text>
          </g>
        );
      })}
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e8e7e2" strokeWidth={big ? 7 : 5} />
      <path
        className="loop-draw"
        style={{ "--len": len } as React.CSSProperties}
        strokeDasharray={len}
        d={arcPath(c, c, r, PROGRESS)}
        fill="none"
        stroke="var(--color-ultramarine)"
        strokeWidth={big ? 7 : 5}
        strokeLinecap="round"
      />
      <circle cx={hx.toFixed(1)} cy={hy.toFixed(1)} r={big ? 12 : 9} fill="var(--color-ultramarine)" stroke="#fff" strokeWidth="3" />
      <circle cx={c} cy={c} r={plateSize * 0.78} fill="var(--color-plate)" />
      {plate && (
        <svg x={c - plateSize / 2} y={c - plateSize / 2 - S * 0.02} width={plateSize} height={plateSize}>
          {plate}
        </svg>
      )}
      {caption && (
        <text x={c} y={c + plateSize * 0.62} textAnchor="middle" fontSize={big ? 14 : 12} fill="var(--color-slate)">
          {caption}
        </text>
      )}
    </svg>
  );
}
