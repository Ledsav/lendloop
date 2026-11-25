import { arcPath, pos } from "@/lib/loop";

/** A small ring at one stage of a loan, for "How a loan works". */
export function StepRing({ fraction, done = false }: { fraction: number; done?: boolean }) {
  const c = 22;
  const r = 17;
  const colour = done ? "var(--color-ink)" : "var(--color-ultramarine)";
  const [x, y] = pos(c, c, r, fraction);
  return (
    <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="#d7d6d1" strokeWidth="2.4" />
      {fraction > 0 && <path d={arcPath(c, c, r, fraction)} fill="none" stroke={colour} strokeWidth="2.6" strokeLinecap="round" />}
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="4.4" fill={colour} />
    </svg>
  );
}
