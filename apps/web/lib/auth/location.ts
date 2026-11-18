"use client";

// The address bar's query on a statically rendered page: null during the server
// render, the real value once the page runs in the browser (no effect, no flash).
import { useSyncExternalStore } from "react";

const noSubscription = () => () => undefined;
const browserSearch = () => globalThis.location.search;
const serverSearch = () => null;

export function useLocationSearch(): string | null {
  return useSyncExternalStore(noSubscription, browserSearch, serverSearch);
}
