// Where sign-in returns to (pagedesign.md §9: "returns to the place they came from").
// Pages hand it over as `?next=<path>`; only a page of this site in a supported
// language is accepted, so the parameter can never send the user to another site.
import { isLocale, type Locale, localizedPath } from "@firsatgeldi/i18n";

export const NEXT_PARAM = "next";
/** Opens the "Kayıt ol" tab first (Landing Page "Ücretsiz başla", pagedesign.md §9). */
export const SIGN_UP_PARAM = { name: "mod", value: "kayit" } as const;
/** The return path kept across the e-mail link (sign-up → verification), this browser tab only. */
const NEXT_KEY = "fg-auth-next";
const BASE = "https://firsatgeldi.invalid";

/** A same-site page path `/{locale}/…` (with its query), else Home. */
export function safeNext(raw: string | null | undefined, locale: Locale): string {
  const home = localizedPath("/", locale);
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return home;
  try {
    const url = new URL(raw, BASE);
    if (url.origin !== BASE) return home;
    const first = url.pathname.split("/")[1] ?? "";
    return isLocale(first) ? `${url.pathname}${url.search}${url.hash}` : home;
  } catch {
    return home;
  }
}

/** `/giris?next=…` for a page that asks a guest to sign in. */
export function signInHref(locale: Locale, next?: string): string {
  const path = localizedPath("/giris", locale);
  return next ? `${path}?${NEXT_PARAM}=${encodeURIComponent(next)}` : path;
}

/** `/giris?…&mod=kayit`: the same page with "Kayıt ol" selected. */
export function signUpHref(locale: Locale, next?: string): string {
  const href = signInHref(locale, next);
  return `${href}${href.includes("?") ? "&" : "?"}${SIGN_UP_PARAM.name}=${SIGN_UP_PARAM.value}`;
}

function storage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function rememberNext(next: string): void {
  try {
    storage()?.setItem(NEXT_KEY, next);
  } catch {
    // Blocked storage: the verified page continues to Home.
  }
}

export function takeRememberedNext(locale: Locale): string {
  try {
    const value = storage()?.getItem(NEXT_KEY) ?? null;
    storage()?.removeItem(NEXT_KEY);
    return safeNext(value, locale);
  } catch {
    return safeNext(null, locale);
  }
}
