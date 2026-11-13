// The guest's explicit language choice, kept in the fg_locale cookie so the
// proxy can read it (architecture.md §19). Only an explicit choice writes it;
// opening a /en link does not. Saving it to the user (users.locale) is Phase 2.
// No UI here: the control, its texts and its place come from the approved design.
import { LOCALE_COOKIE, type Locale } from "@firsatgeldi/i18n";

/** Kept for a year. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function localeCookie(locale: Locale, secure: boolean): string {
  return [`${LOCALE_COOKIE}=${locale}`, "Path=/", `Max-Age=${MAX_AGE_SECONDS}`, "SameSite=Lax", ...(secure ? ["Secure"] : [])].join("; ");
}

/** Stores the choice in this browser (call it from the future language control, then navigate to the localised URL). */
export function writeLocalePreference(locale: Locale): void {
  document.cookie = localeCookie(locale, window.location.protocol === "https:");
}
