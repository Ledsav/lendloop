"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

/**
 * Makes sure the signed-in Clerk user has a row in Convex before the app queries anything.
 * Returns true once it does.
 */
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const [storedFor, setStoredFor] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    store({}).then(() => {
      if (!cancelled) setStoredFor(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, store]);

  return isAuthenticated && storedFor;
}
