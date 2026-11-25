"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export function SignInCta() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/tools">
          <button className="rounded-lg bg-brand-700 px-5 py-2.5 font-medium text-white hover:bg-brand-800">
            Sign in to lend or borrow
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Link href="/tools" className="rounded-lg bg-brand-700 px-5 py-2.5 font-medium text-white hover:bg-brand-800">
          Open LendLoop →
        </Link>
      </Show>
    </>
  );
}
