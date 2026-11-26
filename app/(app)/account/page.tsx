"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useConvex, useMutation } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ErrorText, PageTitle, SectionTitle } from "@/components/states";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAction } from "@/lib/useAction";

/** GDPR in the product: see and take your data, or delete your account. */
export default function AccountPage() {
  const convex = useConvex();
  const recordExport = useMutation(api.account.recordExport);
  const remove = useAction(useMutation(api.account.deleteMine));
  const { user } = useUser();
  const { signOut } = useClerk();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const data = await convex.query(api.account.exportMine, {});
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `lendloop-my-data-${data.exportedAt.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      await recordExport({});
      toast.success("Your data is downloaded.");
    } catch {
      setDownloadError("The download didn't work. Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-[640px]">
      <PageTitle title="Your data" />
      <p className="text-[15px] text-slate">
        LendLoop keeps your first name and email (from your sign-in), the things you list, the loans you&apos;re part of, and a record
        of the changes you make. The{" "}
        <Link href="/privacy" className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink">
          privacy notice
        </Link>{" "}
        explains why and for how long.
      </p>

      <SectionTitle>Download my data</SectionTitle>
      <p className="mb-4 text-[15px] text-slate">One file with everything above, to keep or to take elsewhere.</p>
      <Button onClick={download} disabled={downloading}>
        {downloading ? "Preparing…" : "Download my data"}
      </Button>
      <div className="mt-2">
        <ErrorText>{downloadError}</ErrorText>
      </div>

      <SectionTitle>Delete my account</SectionTitle>
      <p className="mb-4 text-[15px] text-slate">
        Your listings are removed and your name is taken out of past loans, which stay for the other neighbour as &ldquo;A former
        neighbour&rdquo;. Your sign-in is deleted too. You can&apos;t delete your account while a loan is open.
      </p>
      <ConfirmAction
        label="Delete my account"
        title="Delete your account?"
        body="Your listings are removed and your name is taken out of past loans. This can't be undone."
        confirmLabel="Delete my account"
        cancelLabel="Keep my account"
        destructive
        error={remove.error}
        pending={remove.pending}
        onOpen={remove.clearError}
        onConfirm={async () => {
          const ok = await remove.run({});
          if (ok) {
            try {
              await user?.delete(); // Clerk's self-service deletion, if the instance allows it
            } catch {
              // The LendLoop data is gone either way; the sign-in can be deleted from the account menu.
            }
            await signOut({ redirectUrl: "/?deleted=1" });
          }
          return ok;
        }}
      />

      <SectionTitle>Your rights</SectionTitle>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-slate">
        <li>See and take your data: the download above.</li>
        <li>Correct your name: change it in your account (the menu at the top right). LendLoop picks it up the next time you sign in.</li>
        <li>Delete your account: above.</li>
        <li>
          Object, ask a question or complain: write to privacy@lendloop.example, or to your data protection authority.
        </li>
      </ul>
    </div>
  );
}
