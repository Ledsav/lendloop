import type { ReactNode, SVGProps } from "react";
import type { DrawingKind } from "@/lib/drawings";

const INK = "url(#ll-ink)";
const DARK = "#2a3040";
const MID = "#5a6070";
const LIGHT = "#9aa0ab";
const PLATE = "#ecebe7";

const Shadow = ({ cx, cy, rx }: { cx: number; cy: number; rx: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry="1.6" fill="#000" opacity=".08" />
);
const Shine = (props: SVGProps<SVGRectElement>) => <rect fill="#fff" opacity=".18" rx="1" {...props} />;

/** Tonal product drawings in one ink family, on a 64 grid. They stand in for owners' photos. */
const SHAPES: Record<DrawingKind, ReactNode> = {
  drill: (
    <>
      <rect x="8" y="14" width="34" height="13" rx="5" fill={INK} />
      <Shine x="11" y="16.5" width="22" height="2" />
      <rect x="42" y="16.5" width="7" height="8" rx="1.5" fill={MID} />
      <rect x="49" y="19.2" width="9" height="2.6" rx="1.3" fill={LIGHT} />
      <path d="M22 27h9l-3 17h-10z" fill={DARK} />
      <rect x="14" y="44" width="20" height="8" rx="2.5" fill={INK} />
      <Shadow cx={25} cy={56} rx={15} />
    </>
  ),
  saw: (
    <>
      <path d="M5 36 44 22v18H7z" fill={LIGHT} />
      <path d="M10 36.5 42 27.6v1.6L10 38z" fill="#fff" opacity=".3" />
      <path d="M8 40l2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3z" fill={MID} />
      <path d="M42 18h9a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-9z" fill={INK} />
      <rect x="47" y="25" width="7" height="14" rx="3.5" fill={PLATE} />
      <circle cx="44.5" cy="24" r="1.2" fill={LIGHT} />
      <circle cx="44.5" cy="40" r="1.2" fill={LIGHT} />
      <Shadow cx={32} cy={52} rx={24} />
    </>
  ),
  ladder: (
    <>
      <g fill={INK}>
        <path d="M21 5h4l-6 52h-4z" />
        <path d="M39 5h4l6 52h-4z" />
      </g>
      <g fill={MID}>
        <rect x="21" y="15" width="22" height="3" rx="1.2" />
        <rect x="19.6" y="27" width="24.8" height="3" rx="1.2" />
        <rect x="18.2" y="39" width="27.6" height="3" rx="1.2" />
        <rect x="16.8" y="51" width="30.4" height="3" rx="1.2" />
      </g>
      <Shadow cx={32} cy={59} rx={20} />
    </>
  ),
  mower: (
    <>
      <path d="M37 33l14-26h4L41 35z" fill={MID} />
      <rect x="48" y="4" width="11" height="4.5" rx="2.25" fill={DARK} transform="rotate(-28 53.5 6.25)" />
      <rect x="10" y="26" width="22" height="11" rx="3" fill={LIGHT} />
      <rect x="12" y="28" width="14" height="2" rx="1" fill="#fff" opacity=".35" />
      <path d="M8 36h34a6 6 0 0 1 6 6v6H8a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z" fill={INK} />
      <Shine x="9" y="38.5" width="26" height="2" />
      <circle cx="13" cy="50" r="5.5" fill={DARK} />
      <circle cx="41" cy="50" r="5.5" fill={DARK} />
      <circle cx="13" cy="50" r="2" fill={LIGHT} />
      <circle cx="41" cy="50" r="2" fill={LIGHT} />
      <Shadow cx={28} cy={57} rx={22} />
    </>
  ),
  mixer: (
    <>
      <rect x="40" y="20" width="6" height="34" rx="2" fill={INK} />
      <path d="M12 13h31a4 4 0 0 1 4 4v6H12z" fill={INK} />
      <Shine x="15" y="15" width="20" height="2" />
      <path d="M14 31h25l-3 16H17z" fill={LIGHT} />
      <path d="M16 33h21" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
      <rect x="24" y="23" width="2.4" height="8" fill={MID} />
      <rect x="10" y="52" width="42" height="4" rx="2" fill={DARK} />
      <Shadow cx={31} cy={58} rx={20} />
    </>
  ),
  tent: (
    <>
      <path d="M32 9 57 53H7z" fill={INK} />
      <path d="M32 9 57 53H44z" fill="#000" opacity=".18" />
      <path d="M32 24l7 29H25z" fill={PLATE} />
      <ellipse cx="32" cy="55" rx="26" ry="1.8" fill="#000" opacity=".08" />
    </>
  ),
  stove: (
    <>
      <rect x="17" y="9" width="30" height="15" rx="3" fill={LIGHT} />
      <rect x="19" y="11" width="22" height="2" rx="1" fill="#fff" opacity=".4" />
      <path d="M13 14h4M47 14h4" stroke={MID} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="32" cy="30" rx="17" ry="4.5" fill={INK} />
      <path d="M19 32l-6 21M45 32l6 21M32 34.5V53" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
      <Shadow cx={32} cy={56} rx={20} />
    </>
  ),
  washer: (
    <>
      <rect x="8" y="25" width="24" height="23" rx="5" fill={INK} />
      <Shine x="11" y="28" width="12" height="2" />
      <path d="M12 25V12h12" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="52" r="4.5" fill={DARK} />
      <circle cx="27" cy="52" r="4.5" fill={DARK} />
      <path d="M32 35c12 0 8-15 18-15" fill="none" stroke={MID} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 20l9-8" stroke={LIGHT} strokeWidth="3" strokeLinecap="round" />
      <Shadow cx={22} cy={58} rx={16} />
    </>
  ),
  cleaner: (
    <>
      <rect x="29" y="6" width="5" height="34" rx="2" fill={MID} />
      <rect x="25" y="4" width="13" height="5" rx="2.5" fill={DARK} />
      <rect x="21" y="20" width="21" height="24" rx="6" fill={INK} />
      <Shine x="24" y="23" width="9" height="2" />
      <rect x="25" y="28" width="13" height="9" rx="3" fill={LIGHT} />
      <path d="M14 44h35a4 4 0 0 1 4 4v3H10v-3a4 4 0 0 1 4-4z" fill={DARK} />
      <Shadow cx={32} cy={55} rx={22} />
    </>
  ),
  table: (
    <>
      <path d="M12 31h4l-3 23h-4z" fill={MID} />
      <path d="M48 31h4l3 23h-4z" fill={MID} />
      <rect x="12" y="44" width="40" height="2" rx="1" fill={LIGHT} />
      <rect x="9" y="28" width="46" height="3" fill={DARK} />
      <rect x="5" y="22" width="54" height="6" rx="2" fill={INK} />
      <Shine x="8" y="23.2" width="30" height="1.6" />
      <Shadow cx={32} cy={57} rx={26} />
    </>
  ),
  box: (
    <>
      <path d="M12 26h40v26a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3z" fill={INK} />
      <path d="M9 19a3 3 0 0 1 3-3h40a3 3 0 0 1 3 3v7H9z" fill={MID} />
      <rect x="12" y="18" width="24" height="2" rx="1" fill="#fff" opacity=".25" />
      <rect x="26" y="33" width="12" height="4" rx="2" fill={PLATE} />
      <Shadow cx={32} cy={58} rx={22} />
    </>
  ),
};

/**
 * The shared gradient the drawings use, rendered once per page. Kept in the layout as a zero-size
 * SVG (not display:none, which makes Chrome drop the gradient).
 */
export function DrawingDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ll-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4256" />
          <stop offset="1" stopColor="#1b2030" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Drawing({ kind, ...props }: { kind: DrawingKind } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
      {SHAPES[kind]}
    </svg>
  );
}
