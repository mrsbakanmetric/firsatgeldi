// Formatting for Tracked Items: short calendar days ("1 Kasım") in the user's language.
import { DEFAULT_TIME_ZONE } from "@firsatgeldi/core";
import type { Locale } from "@firsatgeldi/i18n";

/** Noon in Türkiye time, so a calendar day never shifts when formatted (Europe/Istanbul is UTC+3). */
const DAY_NOON_SUFFIX = "T12:00:00+03:00";

/** "2026-11-01" → "1 Kasım" / "1 November". */
export function shortDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: DEFAULT_TIME_ZONE }).format(new Date(`${day}${DAY_NOON_SUFFIX}`));
}
