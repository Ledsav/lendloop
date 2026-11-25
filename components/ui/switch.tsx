"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-10 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-ink data-[state=unchecked]:bg-hairline",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-surface ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
