// Locale-aware formatting with Intl. Platform-neutral (web, API e-mails, mobile).

/** Dates and times are shown in this zone unless a caller passes another one. */
export const DEFAULT_TIME_ZONE = "Europe/Istanbul";

/** How a currency is written in the product ("TL", never "₺"). */
const CURRENCY_LABEL: Readonly<Record<string, string>> = { TRY: "TL" };

/** Languages that write the label after the amount ("25.997 TL"); others before it ("TL 25,997"). */
const LABEL_AFTER_AMOUNT = new Set(["tr"]);

const NO_BREAK_SPACE = "\u00a0";

const language = (locale: string) => locale.split("-")[0]?.toLowerCase() ?? locale;

export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Money: grouping and decimals from the locale; decimals only when the amount
 * has a fraction. tr "25.997 TL" · "25.997,50 TL"; en "TL 25,997" · "TL 25,997.50".
 */
export function formatMoney(amount: number, locale: string, currency = "TRY"): string {
  const fraction = Number.isInteger(amount) ? 0 : 2;
  const number = formatNumber(amount, locale, { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
  const label = CURRENCY_LABEL[currency] ?? currency;
  return LABEL_AFTER_AMOUNT.has(language(locale)) ? `${number}${NO_BREAK_SPACE}${label}` : `${label}${NO_BREAK_SPACE}${number}`;
}

export type DateStyle = NonNullable<Intl.DateTimeFormatOptions["dateStyle"]>;
export type TimeStyle = NonNullable<Intl.DateTimeFormatOptions["timeStyle"]>;

interface ZoneOption {
  timeZone?: string;
}

export function formatDate(date: Date, locale: string, { dateStyle = "medium", timeZone = DEFAULT_TIME_ZONE }: ZoneOption & { dateStyle?: DateStyle } = {}): string {
  return new Intl.DateTimeFormat(locale, { dateStyle, timeZone }).format(date);
}

export function formatTime(date: Date, locale: string, { timeStyle = "short", timeZone = DEFAULT_TIME_ZONE }: ZoneOption & { timeStyle?: TimeStyle } = {}): string {
  return new Intl.DateTimeFormat(locale, { timeStyle, timeZone }).format(date);
}

export function formatDateTime(
  date: Date,
  locale: string,
  { dateStyle = "medium", timeStyle = "short", timeZone = DEFAULT_TIME_ZONE }: ZoneOption & { dateStyle?: DateStyle; timeStyle?: TimeStyle } = {},
): string {
  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle, timeZone }).format(date);
}

/**
 * Turkish month names with the dative suffix: the suffix follows the name's last vowel and is
 * written after an apostrophe ("Aralık'a", "Eylül'e"), so it cannot be added to a formatted date.
 */
const TR_MONTHS_DATIVE = ["Ocak'a", "Şubat'a", "Mart'a", "Nisan'a", "Mayıs'a", "Haziran'a", "Temmuz'a", "Ağustos'a", "Eylül'e", "Ekim'e", "Kasım'a", "Aralık'a"] as const;

/**
 * A deadline phrase with day and month: tr "12 Aralık'a kadar" · en "until 12 December".
 * Use it wherever a sentence says something lasts until a date (restore window, …).
 */
export function formatUntil(date: Date, locale: string, { timeZone = DEFAULT_TIME_ZONE }: ZoneOption = {}): string {
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", timeZone }).format(date);
  if (language(locale) === "tr") {
    const month = Number(new Intl.DateTimeFormat("en", { month: "numeric", timeZone }).format(date));
    return `${day} ${TR_MONTHS_DATIVE[month - 1]} kadar`;
  }
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone }).format(date);
  return `until ${day} ${month}`;
}

/**
 * Turkish ablative suffix ('dan/'den/'tan/'ten) of a written number: it follows how the number's
 * last word is read — the last non-zero digit ("altı" → 'dan), else its tens ("otuz" → 'dan),
 * else "yüz", "bin" ('den). 2026'dan · 2027'den · 2030'dan · 2040'tan · 2000'den.
 */
const TR_ABLATIVE_UNITS = ["", "'den", "'den", "'ten", "'ten", "'ten", "'dan", "'den", "'den", "'dan"] as const;
const TR_ABLATIVE_TENS = ["", "'dan", "'den", "'dan", "'tan", "'den", "'tan", "'ten", "'den", "'dan"] as const;

export function turkishAblative(value: number): string {
  const n = Math.abs(Math.trunc(value));
  if (n === 0) return "'dan";
  if (n % 10 !== 0) return TR_ABLATIVE_UNITS[n % 10] ?? "";
  if (n % 100 !== 0) return TR_ABLATIVE_TENS[(n % 100) / 10] ?? "";
  if (n % 1_000_000 === 0) return "'dan"; // milyon, milyar
  return "'den"; // yüz, bin
}

/**
 * A start phrase with month and year: tr "Ekim 2026'dan beri" · en "since October 2026"
 * ("…'dan beri üye", member since).
 */
export function formatSince(date: Date, locale: string, { timeZone = DEFAULT_TIME_ZONE }: ZoneOption = {}): string {
  const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone }).format(date);
  const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(date));
  return language(locale) === "tr" ? `${month} ${year}${turkishAblative(year)} beri` : `since ${month} ${year}`;
}

/** CLDR plural category for a count ("one", "other", …) used to pick a catalogue message. */
export function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

/** Plural categories a locale uses; every plural message must define all of them. */
export function pluralCategories(locale: string): Intl.LDMLPluralRule[] {
  return new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
}
