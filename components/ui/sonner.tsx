"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Toasts repeat what a button just did ("Approved. Sam gets an email."): ink, plain, bottom centre. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!rounded-[12px] !border !border-ink !bg-ink !px-4 !py-3 !font-sans !text-[15px] !text-white !shadow-none",
          error: "!border-late !bg-late",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
