import type { ReactNode } from "react";
import type { Loop } from "@/convex/lib/loans";
import { weekday } from "@/lib/format";
import { arcPath, dayTicks, itemStatus, loanFraction, pos } from "@/lib/loop";

const W = 344;
const H = 312; // room for a day label at the very top
const CX = W / 2;
const CY = 158;
const R = 108;
const PASSED = "#9aa6e6";
const AHEAD = "#dddcd7";

function FineTicks({ upTo }: { upTo: number }) {
  return (
    <>
      {Array.from({ length: 72 }, (_, k) => {
        const fr = k / 72;
        const [x1, y1] = pos(CX, CY, R + 12, fr);
        const [x2, y2] = pos(CX, CY, R + 16, fr);
        return (
          <line
            key={k}
            x1={x1.toFixed(1)}
            y1={y1.toFixed(1)}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
            stroke={fr <= upTo ? PASSED : AHEAD}
            strokeWidth="1.2"
          />
        );
      })}
    </>
  );
}

const HomeTick = () => <line x1={CX} y1={CY + R - 9} x2={CX} y2={CY + R + 22} stroke="var(--color-ink)" strokeWidth="2" />;

function UnderTick({ left, right, tone }: { left: string; right: string; tone?: "late" }) {
  const fill = "var(--color-slate)";
  return (
    <>
      <text x={CX - 10} y={CY + R + 36} textAnchor="end" fontSize="12.5" fill={fill}>
        {left}
      </text>
      <text x={CX + 10} y={CY + R + 36} fontSize="12.5" fill={tone === "late" ? "var(--color-late)" : fill}>
        {right}
      </text>
    </>
  );
}

/**
 * The item page's instrument. Out: one major tick per day of the loan, the dot travelling
 * clockwise like a hand. Late: the ring turns red and the dot sits just past the end. Home: the
 * dot rests at the bottom and the item itself sits in the middle.
 */
export function Dial({ loop, now, plate }: { loop: Loop; now: number; plate?: ReactNode }) {
  const status = itemStatus(loop);
  const label = [status.primary, status.secondary].filter(Boolean).join(", ");
  let body: ReactNode;

  if (loop.state === "home") {
    body = (
      <>
        <FineTicks upTo={-1} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e8e7e2" strokeWidth="6" />
        <HomeTick />
        <circle cx={CX} cy={CY + R} r="10" fill="var(--color-ink)" stroke="#fff" strokeWidth="3" />
        <circle cx={CX} cy={CY - 10} r="58" fill="var(--color-plate)" />
        {plate && (
          <svg x={CX - 40} y={CY - 52} width="80" height="80">
            {plate}
          </svg>
        )}
        <text x={CX} y={CY + 76} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-ink)">
          Free now
        </text>
      </>
    );
  } else if (loop.state === "out") {
    const f = loanFraction(loop.startDate, loop.endDate, now);
    const [hx, hy] = pos(CX, CY, R, f);
    const who = loop.holder ? (loop.holder.isViewer ? "with you" : `with ${loop.holder.name}`) : "on loan";
    body = (
      <>
        <FineTicks upTo={f} />
        {dayTicks(loop.startDate, loop.endDate).map((t) => {
          const [x1, y1] = pos(CX, CY, R + 8, t.f);
          const [x2, y2] = pos(CX, CY, R + 22, t.f);
          const [lx, ly] = pos(CX, CY, R + 36, t.f);
          return (
            <g key={t.f}>
              <line x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} stroke="var(--color-ink)" strokeWidth="2" />
              {t.label && (
                <text x={lx.toFixed(1)} y={(ly + 4).toFixed(1)} textAnchor="middle" fontSize="12.5" fill="var(--color-slate)">
                  {t.label}
                </text>
              )}
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e8e7e2" strokeWidth="6" />
        {f > 0.005 && <path d={arcPath(CX, CY, R, f)} fill="none" stroke="var(--color-ultramarine)" strokeWidth="6" strokeLinecap="round" />}
        <HomeTick />
        <circle cx={hx.toFixed(1)} cy={hy.toFixed(1)} r="10" fill="var(--color-ultramarine)" stroke="#fff" strokeWidth="3" />
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="64" fontWeight="600" letterSpacing="-2" fill="var(--color-ink)">
          {loop.day}
          <tspan fontSize="22" fontWeight="500" fill="#8a8f99" dx="4">
            /{loop.days}
          </tspan>
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="15" fill="var(--color-slate)">
          {loop.days === 1 ? "day" : "days"} {who}
        </text>
        <UnderTick left={`Out ${weekday(loop.startDate)}`} right={`Back ${weekday(loop.endDate)}`} />
      </>
    );
  } else {
    body = (
      <>
        <FineTicks upTo={-1} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-late)" strokeWidth="6" />
        <HomeTick />
        <circle cx={CX + 0.7 * R} cy={CY + 0.94 * R} r="10" fill="var(--color-late)" stroke="#fff" strokeWidth="3" />
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="64" fontWeight="600" letterSpacing="-2" fill="var(--color-late)">
          {loop.daysLate}
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="15" fill="var(--color-late)">
          {loop.daysLate === 1 ? "day late" : "days late"}
        </text>
        <UnderTick left={`Out ${weekday(loop.startDate)}`} right={`Was due ${weekday(loop.endDate)}`} tone="late" />
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[380px]" role="img" aria-label={label}>
      {body}
    </svg>
  );
}
