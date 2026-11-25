import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[12px] font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ultramarine focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-ink text-white hover:bg-ink/88",
        destructive: "bg-late text-white hover:bg-late/90",
        outline: "rounded-[10px] border-[1.5px] border-ink bg-transparent text-ink hover:bg-field",
        secondary: "bg-field text-ink hover:bg-hairline",
        ghost: "text-ink hover:bg-field",
        link: "h-auto px-0 text-ink underline underline-offset-4 decoration-hairline hover:decoration-ink",
      },
      size: {
        default: "h-11 px-[18px] text-[15px]",
        sm: "h-9 px-3 text-[14px]",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
