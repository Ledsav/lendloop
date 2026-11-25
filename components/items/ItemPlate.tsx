import type { Category } from "@/convex/lib/validators";
import { drawingFor } from "@/lib/drawings";
import { Drawing } from "./drawings";

/**
 * The item's picture: a drawing on a neutral plate. This is the one place an owner's photo will
 * replace the drawing later.
 */
export function ItemPlate({ name, category, size = 64 }: { name: string; category: Category; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center bg-plate"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
      aria-hidden="true"
    >
      <Drawing kind={drawingFor(name, category)} width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} />
    </div>
  );
}
