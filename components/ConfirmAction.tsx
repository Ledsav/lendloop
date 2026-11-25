"use client";

import { useState } from "react";
import { ErrorText } from "@/components/states";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * A button for something that can't be undone: it asks first. The dialog closes only when the
 * action worked; otherwise it stays open and shows what went wrong (say, someone else acted first).
 */
export function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  cancelLabel = "Go back",
  onConfirm,
  error,
  pending,
  onOpen,
  variant = "secondary",
  destructive = false,
  size = "default",
}: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => Promise<boolean>;
  error: string | null;
  pending: boolean;
  onOpen?: () => void;
  variant?: "default" | "secondary" | "ghost";
  destructive?: boolean;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (next) onOpen?.();
        setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorText>{error}</ErrorText>
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">{cancelLabel}</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={async () => {
              if (await onConfirm()) setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
