/** The mark: a ring in ink with a short ultramarine arc and the item's dot on it. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" />
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="var(--color-ultramarine)"
        strokeWidth="2.4"
        strokeDasharray="20 60"
        transform="rotate(90 12 12)"
      />
      <circle cx="4.6" cy="7.8" r="2.9" fill="var(--color-ultramarine)" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`flex items-center gap-[9px] font-bold tracking-[-0.015em] text-ink ${size === "lg" ? "text-[20px]" : "text-[18px]"}`}>
      <LogoMark size={size === "lg" ? 26 : 22} />
      LendLoop
    </span>
  );
}
