// Locale resolution (architecture.md §19), as a pure function shared by the
// web proxy, the API and the future mobile app. First match wins:
//   1. locale in the URL
//   2. signed-in user's users.locale (Phase 2)
//   3. fg_locale cookie (guest's explicit choice)
//   4. Accept-Language, in q order; the first supported language wins
//   5. the default locale
// Supported locales and the default are passed in (they become system settings later).

export interface LocaleSources {
  urlLocale?: string | null | undefined;
  userLocale?: string | null | undefined;
  cookieLocale?: string | null | undefined;
  acceptLanguage?: string | null | undefined;
}

export interface LocaleConfig<L extends string> {
  supported: readonly L[];
  defaultLocale: L;
}

/** Exact supported locale for a value, or null ("en" → "en"; "EN" → "en"; "en-GB" → null). */
export function supportedLocale<L extends string>(value: string | null | undefined, supported: readonly L[]): L | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  return supported.find((locale) => locale.toLowerCase() === lower) ?? null;
}

/** Language tags from an Accept-Language header, highest q first (ties keep header order); q=0 and "*" dropped. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
      const q = qParam === undefined ? 1 : Number(qParam.slice(2));
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter(({ tag, q }) => tag !== "" && tag !== "*" && q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ tag }) => tag);
}

/** First Accept-Language entry whose primary language is supported ("tr-TR" → "tr"). */
export function localeFromAcceptLanguage<L extends string>(header: string | null | undefined, supported: readonly L[]): L | null {
  for (const tag of parseAcceptLanguage(header)) {
    const primary = tag.split("-")[0];
    const match = supportedLocale(primary, supported);
    if (match) return match;
  }
  return null;
}

export function resolveLocale<L extends string>(sources: LocaleSources, config: LocaleConfig<L>): L {
  const { supported, defaultLocale } = config;
  return (
    supportedLocale(sources.urlLocale, supported) ??
    supportedLocale(sources.userLocale, supported) ??
    supportedLocale(sources.cookieLocale, supported) ??
    localeFromAcceptLanguage(sources.acceptLanguage, supported) ??
    defaultLocale
  );
}
