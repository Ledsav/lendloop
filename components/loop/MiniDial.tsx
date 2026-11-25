import { arcPath, pos, type MiniDialState } from "@/lib/loop";

const RING = "#d7d6d1";
const C = 13;
const R = 10;

/**
 * The 26px status ring. Home: the dot rests at the bottom. Out: an ultramarine arc runs clockwise
 * to today. Late: the ring turns red and the dot sits just outside it. The words beside it carry
 * the meaning, so it's hidden from screen readers.
 */
export function MiniDial({ state, fraction = 0, size = 26 }: { state: MiniDialState; fraction?: number; size?: number }) {
  const ring = (stroke = RING, width = 1.6) => <circle cx={C} cy={C} r={R} fill="none" stroke={stroke} strokeWidth={width} />;
  const bottom = C + R;
  let body: React.ReactNode;
  switch (state) {
    case "home":
      body = (
        <>
          {ring()}
          <circle cx={C} cy={bottom} r="3" fill="var(--color-ink)" />
        </>
      );
      break;
    case "out": {
      const [x, y] = pos(C, C, R, fraction);
      body = (
        <>
          {ring()}
          {fraction > 0.005 && <path d={arcPath(C, C, R, fraction)} fill="none" stroke="var(--color-ultramarine)" strokeWidth="2" />}
          <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="3" fill="var(--color-ultramarine)" />
        </>
      );
      break;
    }
    case "late":
      body = (
        <>
          {ring("var(--color-late)", 1.8)}
          <circle cx={C + 7} cy={C + 9.4} r="3" fill="var(--color-late)" stroke="#fff" strokeWidth="1.2" />
        </>
      );
      break;
    case "asked":
      body = (
        <>
          {ring()}
          <circle cx={C} cy={bottom} r="2.6" fill="#fff" stroke="var(--color-ink)" strokeWidth="1.4" />
        </>
      );
      break;
    case "booked":
      body = (
        <>
          {ring()}
          <circle cx={C} cy={bottom} r="3" fill="var(--color-ultramarine)" />
        </>
      );
      break;
    case "returned":
      body = (
        <>
          {ring("var(--color-ink)")}
          <circle cx={C} cy={bottom} r="3" fill="var(--color-ink)" />
        </>
      );
      break;
    case "closed":
      body = ring();
      break;
  }
  return (
    <svg viewBox="0 0 26 26" width={size} height={size} aria-hidden="true" className="shrink-0 overflow-visible">
      {body}
    </svg>
  );
}
