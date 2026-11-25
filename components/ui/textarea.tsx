import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-[12px] border border-transparent bg-field px-3.5 py-2.5 text-[15px] text-ink transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ultramarine disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
