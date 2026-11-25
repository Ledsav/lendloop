"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Makes sure the signed-in Clerk user has a row in Convex before the app queries anything.
 * `ready` turns true once it does; `failed` means Convex refused the user (usually a Clerk/Convex
 * configuration problem: Clerk's Convex integration, the session token's email claim, or
 * CLERK_JWT_ISSUER_DOMAIN).
 */
export function useStoreUser() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [stored, setStored] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    store({})
      .then(() => !cancelled && setStored(true))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, store]);

  return { ready: isAuthenticated && stored, failed: failed || (!isLoading && !isAuthenticated) };
}
