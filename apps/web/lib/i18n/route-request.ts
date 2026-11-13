// Decides what the proxy does with a page request (architecture.md §19):
// - no locale in the path → redirect to the resolved locale (root "/" included);
// - a segment in another language's form → permanent redirect to this language's form;
// - a translated segment → rewrite to the Turkish folder the app router serves.
// Pure function, so it is tested without Next.js.
import { resolveLocale } from "@firsatgeldi/core";
import { DEFAULT_LOCALE, isLocale, LOCALES, matchLocalizedPath } from "@firsatgeldi/i18n";

export interface PageRequest {
  pathname: string;
  search: string;
  cookieLocale: string | undefined;
  acceptLanguage: string | null;
}

export type RouteDecision =
  | { action: "next" }
  | { action: "redirect"; location: string; permanent: boolean }
  | { action: "rewrite"; pathname: string };

const LOCALE_CONFIG = { supported: LOCALES, defaultLocale: DEFAULT_LOCALE };

export function routeRequest({ pathname, search, cookieLocale, acceptLanguage }: PageRequest): RouteDecision {
  const [first = "", ...rest] = pathname.split("/").filter(Boolean);
  const restPath = `/${rest.join("/")}`;

  if (isLocale(first)) {
    const match = matchLocalizedPath(restPath, first);
    if (!match) return { action: "next" };
    if (match.canonical !== restPath) {
      return { action: "redirect", location: `/${first}${match.canonical === "/" ? "" : match.canonical}${search}`, permanent: true };
    }
    if (match.internal !== restPath) return { action: "rewrite", pathname: `/${first}${match.internal}` };
    return { action: "next" };
  }

  // No locale (the root "/" or an old/shared link): the user's language decides.
  // Signed-in users' users.locale joins here in Phase 2.
  const locale = resolveLocale({ cookieLocale, acceptLanguage }, LOCALE_CONFIG);
  const target = matchLocalizedPath(pathname, locale)?.canonical ?? pathname;
  return { action: "redirect", location: `/${locale}${target === "/" ? "" : target}${search}`, permanent: false };
}
