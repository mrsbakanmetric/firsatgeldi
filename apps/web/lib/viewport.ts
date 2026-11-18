"use client";

// Below breakpoint.md (phone width)? Read from the theme token, never a literal width; follows
// changes (rotation, resize). Server render and environments without matchMedia count as wide.
import { useSyncExternalStore } from "react";

function query(): MediaQueryList | null {
  if (typeof document === "undefined" || typeof globalThis.matchMedia !== "function") return null;
  const width = getComputedStyle(document.documentElement).getPropertyValue("--breakpoint-md").trim();
  return width ? globalThis.matchMedia(`(min-width: ${width})`) : null;
}

const subscribe = (listener: () => void) => {
  const list = query();
  list?.addEventListener("change", listener);
  return () => list?.removeEventListener("change", listener);
};

export function useIsPhoneWidth(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches === false, () => false);
}
