"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ListingForm } from "@/components/ListingForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { thing } from "@/lib/format";
import { useAction } from "@/lib/useAction";

export type ItemDetail = NonNullable<FunctionReturnType<typeof api.tools.get>>;

/** What the owner sees on their own item: requests waiting, edit, remove. */
export function OwnerControls({ item }: { item: ItemDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const update = useAction(useMutation(api.tools.update));
  const remove = useAction(useMutation(api.tools.remove));

  return (
    <div className="space-y-4">
      {item.pendingRequests > 0 && (
        <p className="text-[15px]">
          <Link href="/incoming" className="font-semibold underline decoration-hairline underline-offset-4 hover:decoration-ink">
            {item.pendingRequests} {item.pendingRequests === 1 ? "request" : "requests"} waiting
          </Link>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Dialog
          open={editing}
          onOpenChange={(open) => {
            if (open) update.clearError();
            setEditing(open);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="secondary">Edit listing</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit listing</DialogTitle>
              <DialogDescription>Neighbours see the changes straight away.</DialogDescription>
            </DialogHeader>
            <ListingForm
              initial={{ name: item.name, category: item.category, condition: item.condition, description: item.description }}
              submitLabel="Save changes"
              error={update.error}
              pending={update.pending}
              onCancel={() => setEditing(false)}
              onSubmit={async (values) => {
                const ok = await update.run({ toolId: item._id, ...values });
                if (ok) {
                  toast.success("Changes saved.");
                  setEditing(false);
                }
                return ok;
              }}
            />
          </DialogContent>
        </Dialog>
        <ConfirmAction
          label="Remove listing"
          title={`Remove ${thing(item.name)}?`}
          body="It disappears for everyone. Open requests are declined and those neighbours get an email."
          confirmLabel="Remove listing"
          destructive
          error={remove.error}
          pending={remove.pending}
          onOpen={remove.clearError}
          onConfirm={async () => {
            const ok = await remove.run({ toolId: item._id });
            if (ok) {
              toast.success("Listing removed.");
              router.push("/listings");
            }
            return ok;
          }}
        />
      </div>
    </div>
  );
}
