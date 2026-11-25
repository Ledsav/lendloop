"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;
const snapshot = () => Math.floor(Date.now() / MINUTE) * MINUTE;
const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, MINUTE / 4);
  return () => clearInterval(id);
};

/** The current time to the minute, kept fresh so dials keep moving while a page stays open. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
