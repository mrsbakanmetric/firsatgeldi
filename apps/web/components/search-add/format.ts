// Formatting for Search and Add: money in the user's language (core), ages of
// checked values from catalogue plurals (architecture.md §19), calendar days,
// and reading a typed price ("28.999" in Turkish, "28,999" in English).
import { type Money, toMajorUnits, type UploadPolicy } from "@firsatgeldi/contracts";
import { formatDate, formatMoney } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { useEffect, useState } from "react";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINOR_PER_MAJOR = 100;
const BYTES_PER_MEGABYTE = 1024 * 1024;
/** Ages are refreshed once a minute while the page is open. */
const NOW_REFRESH_MS = MS_PER_MINUTE;
/** Noon in Türkiye time, so a calendar day never shifts when formatted (Europe/Istanbul is UTC+3). */
const DAY_NOON_SUFFIX = "T12:00:00+03:00";

export function money(amount: Money, locale: Locale): string {
  return formatMoney(toMajorUnits(amount), locale, amount.currency);
}

/** "6 dk önce" / "az önce" — catalogue plurals, worded as in the design. */
export function ago(t: Translator, iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / MS_PER_MINUTE));
  if (minutes < 1) return t("time.justNow");
  if (minutes < MINUTES_PER_HOUR) return t("time.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return t("time.hoursAgo", { count: hours });
  return t("time.daysAgo", { count: Math.floor(hours / HOURS_PER_DAY) });
}

/** "6 dk önce kontrol edildi". */
export function checkedAgo(t: Translator, iso: string, now: number): string {
  return t("time.checked", { ago: ago(t, iso, now) });
}

/** "2026-11-24" → "24 Kasım 2026". */
export function formatDay(day: string, locale: Locale): string {
  return formatDate(new Date(`${day}${DAY_NOON_SUFFIX}`), locale, { dateStyle: "long" });
}

/** The current time, refreshed once a minute (ages stay right while the page is open). */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * A typed price → kuruş, or null when it is not a price. Turkish groups with "."
 * and uses "," for decimals; English the other way round. Spaces and "TL" are ignored.
 */
export function parsePrice(text: string, locale: Locale): number | null {
  const cleaned = text.replace(/\s|TL|₺/gi, "");
  if (!cleaned) return null;
  const [group, decimal] = locale === "tr" ? [".", ","] : [",", "."];
  if (!new RegExp(`^\\d{1,3}(\\${group}\\d{3})*(\\${decimal}\\d{1,2})?$|^\\d+(\\${decimal}\\d{1,2})?$`).test(cleaned)) return null;
  const [whole = "", fraction = ""] = cleaned.split(group).join("").split(decimal);
  const value = Number.parseInt(whole, 10) * MINOR_PER_MAJOR + Number.parseInt(fraction.padEnd(2, "0") || "0", 10);
  return value > 0 ? value : null;
}

/** Kuruş → the way the user types it ("28.999"), for prefilled fields. */
export function priceInput(amount: Money, locale: Locale): string {
  const major = toMajorUnits(amount);
  return new Intl.NumberFormat(locale, { minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: 2 }).format(major);
}

/** "10 MB" from the upload policy. */
export function megabytes(t: Translator, policy: UploadPolicy): string {
  return t("searchAdd.photos.megabytes", { count: Math.round(policy.maxBytes / BYTES_PER_MEGABYTE) });
}

/** "JPEG, PNG, WebP, HEIC" from the accepted types. */
export function typeList(policy: UploadPolicy): string {
  const names: Record<string, string> = { "image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WebP", "image/heic": "HEIC" };
  return policy.acceptedTypes.map((type) => names[type] ?? type).join(", ");
}
