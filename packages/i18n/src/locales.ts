// Supported UI languages (architecture.md §19). These become the system
// settings i18n.locales / i18n.default_locale in Phase 2; adding a language
// means adding it here, a catalogue and the route segments.

export const LOCALES = ["tr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

/** Guest's explicit language choice (architecture.md §19). */
export const LOCALE_COOKIE = "fg_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
