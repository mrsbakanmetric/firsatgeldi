// Applying and storing the user's theme choice in the browser. The colours
// themselves live in @firsatgeldi/tokens/theme.css; "system" needs no script
// because the CSS follows prefers-color-scheme on its own.
import { parseThemePreference, THEME_PREFERENCES, type ThemePreference } from "@firsatgeldi/core";
import { THEME_ATTRIBUTE } from "@firsatgeldi/tokens";

/** localStorage key for the choice. Moves to GET/PATCH /me in Phase 2; the browser copy stays for a flash-free first paint. */
export const THEME_STORAGE_KEY = "fg-theme";

/** Fired on window after a change in this tab (the "storage" event covers other tabs). */
export const THEME_CHANGE_EVENT = "fg-theme-change";

type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ThemeRoot = Pick<Element, "setAttribute" | "removeAttribute">;

export function readThemePreference(storage: ThemeStorage | undefined): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage blocked (private mode, disabled site data): follow the system.
    return parseThemePreference(null);
  }
}

export function writeThemePreference(storage: ThemeStorage | undefined, preference: ThemePreference): void {
  try {
    if (preference === "system") storage?.removeItem(THEME_STORAGE_KEY);
    else storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not persisted; the choice still applies to this page.
  }
}

/** "light"/"dark" pin the theme on <html>; "system" removes the pin so the CSS follows the system. */
export function applyThemePreference(root: ThemeRoot, preference: ThemePreference): void {
  if (preference === "system") root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, preference);
}

/**
 * Runs inline in <head> before the first paint. Self-contained (it is
 * serialised with toString), so it may only use its arguments.
 */
function applyStoredTheme(key: string, attribute: string, allowed: readonly string[]): void {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null && value !== "system" && allowed.includes(value)) {
      document.documentElement.setAttribute(attribute, value);
    }
  } catch {
    // Storage unavailable: the CSS already follows the system setting.
  }
}

export const themeInitScript = `(${applyStoredTheme.toString()})(${JSON.stringify(THEME_STORAGE_KEY)},${JSON.stringify(THEME_ATTRIBUTE)},${JSON.stringify(THEME_PREFERENCES)});`;
