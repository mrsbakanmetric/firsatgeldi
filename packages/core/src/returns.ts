// Return-window maths (architecture.md §12.2; database.md §6 `platform_return_rules`,
// §8 `tracked_items.return_deadline`). Days are Europe/Istanbul calendar days.
import { DEFAULT_TIME_ZONE } from "./format";

const MS_PER_DAY = 86_400_000;

/**
 * A return deadline this close is urgent: amber flag, "İadesi yaklaşan" on Tracked Items
 * (product_design_pattern.md §5.4: amber at ≤ 3 days, otherwise the neutral info style).
 */
export const RETURN_URGENT_DAYS = 3;

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/** A calendar day `YYYY-MM-DD` of an instant in the given zone. */
export function toCalendarDay(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/** `YYYY-MM-DD` + n days (calendar arithmetic, no time zone involved). */
export function addCalendarDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  if (year === undefined || month === undefined || date === undefined) throw new Error(`Invalid calendar day "${day}"`);
  return new Date(Date.UTC(year, month - 1, date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export interface ReturnRuleInput {
  readonly days: number;
  readonly startType: "ORDER" | "DELIVERY";
  /** Average delivery time for the estimate when the delivery day is not known yet. */
  readonly avgDeliveryDays: number | null;
}

export interface ReturnDeadline {
  readonly day: string;
  /** True when the delivery day was estimated ("tahmini"); the user is asked on delivery. */
  readonly estimated: boolean;
}

/**
 * Last return day. ORDER rules count from the order day; DELIVERY rules count
 * from the delivery day, estimated with the average delivery time until the
 * user answers "Teslim aldın mı?".
 */
export function returnDeadline(orderedOn: string, rule: ReturnRuleInput, deliveredOn: string | null = null): ReturnDeadline {
  if (rule.startType === "ORDER") return { day: addCalendarDays(orderedOn, rule.days), estimated: false };
  if (deliveredOn !== null) return { day: addCalendarDays(deliveredOn, rule.days), estimated: false };
  return { day: addCalendarDays(orderedOn, (rule.avgDeliveryDays ?? 0) + rule.days), estimated: true };
}
