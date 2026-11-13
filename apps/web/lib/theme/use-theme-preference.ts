"use client";

import type { ThemePreference } from "@firsatgeldi/core";
import { useCallback, useSyncExternalStore } from "react";
import { applyThemePreference, readThemePreference, THEME_CHANGE_EVENT, THEME_STORAGE_KEY, writeThemePreference } from "./theme-dom";

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    // Another tab changed the choice: apply it here too.
    applyThemePreference(document.documentElement, readThemePreference(storage()));
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

const getSnapshot = () => readThemePreference(storage());
const getServerSnapshot = (): ThemePreference => readThemePreference(undefined);

/**
 * The user's theme choice (system / light / dark) and a setter that applies it
 * instantly and remembers it in this browser. No UI here: the control, its
 * texts and its place come from the approved design and the i18n catalogue.
 */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setPreference = useCallback((next: ThemePreference) => {
    writeThemePreference(storage(), next);
    applyThemePreference(document.documentElement, next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);
  return [preference, setPreference];
}
