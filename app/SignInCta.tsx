"use client";

import { Show, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** The nav's small button: sign in, or go straight in when already signed in. */
export function NavSignIn() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/tools">
          <Button variant="outline" size="sm" className="text-[15px]">
            Sign in
          </Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Button asChild variant="outline" size="sm" className="text-[15px]">
          <Link href="/tools">Open LendLoop</Link>
        </Button>
      </Show>
    </>
  );
}

export function SignInCta() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/tools">
          <Button className="h-12 w-full px-[22px] text-[16px] sm:w-auto">Sign in to lend or borrow</Button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <Button asChild className="h-12 w-full px-[22px] text-[16px] sm:w-auto">
          <Link href="/tools">Open LendLoop</Link>
        </Button>
      </Show>
    </>
  );
}
