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

/** CLDR plural category for a count ("one", "other", …) used to pick a catalogue message. */
export function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(count);
}

/** Plural categories a locale uses; every plural message must define all of them. */
export function pluralCategories(locale: string): Intl.LDMLPluralRule[] {
  return new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
}
