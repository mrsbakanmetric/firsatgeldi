// Full price history figures (modules.md Price and Stock History › Price history): the four
// tiles of a range and the buy-or-wait hint. Pure functions on the daily cheapest price
// (minor units, oldest first, null = no data that day — nothing is guessed). Shared by the
// mock API now and the real API later, so both apply the same rule.

export interface HistoryTiles {
  readonly lowest: number;
  /** Index of the lowest value (the latest day when it repeats). */
  readonly lowestIndex: number;
  readonly highest: number;
  /** Rounded to whole minor units. */
  readonly average: number;
  /** Last known value − first known value (negative = cheaper now). */
  readonly change: number;
  /** Days with data. */
  readonly dataDays: number;
}

/** Lowest, highest, average and change over the days that have data; null when there is none. */
export function historyTiles(values: readonly (number | null)[]): HistoryTiles | null {
  let lowest = Number.POSITIVE_INFINITY;
  let lowestIndex = -1;
  let highest = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let dataDays = 0;
  let first: number | null = null;
  let last: number | null = null;
  values.forEach((value, index) => {
    if (value === null) return;
    if (value <= lowest) {
      lowest = value;
      lowestIndex = index;
    }
    highest = Math.max(highest, value);
    sum += value;
    dataDays += 1;
    first ??= value;
    last = value;
  });
  if (first === null || last === null) return null;
  return { lowest, lowestIndex, highest, average: Math.round(sum / dataDays), change: (last as number) - first, dataDays };
}

export interface BuyOrWaitRule {
  /** Short and long windows in days ("Son 30 günün", "Son 6 ayın"). */
  readonly shortDays: number;
  readonly longDays: number;
  /** Fewer days with data in a window → no hint from it (evidence insufficient). */
  readonly minDataDays: number;
}

export type BuyOrWait = { readonly kind: "LOWEST_IN_DAYS"; readonly days: number } | { readonly kind: "ABOVE_LOWEST"; readonly days: number; readonly amount: number };

function windowOf(values: readonly (number | null)[], days: number): number[] {
  return values.slice(-days).filter((value): value is number => value !== null);
}

/**
 * One factual line, never advice (modules.md › Buy-or-wait hint). `history` ends today; `current`
 * is today's cheapest. Bought mode leads with "lowest of the short window" (it helps the return
 * decision); want mode leads with the distance to the long window's lowest (it helps the buying
 * decision) — as drawn in Product Detail v2 [ASSUMPTION — order by mode]. Null when no window has
 * enough data or nothing true can be said.
 */
export function buyOrWaitHint(history: readonly (number | null)[], current: number, mode: "BOUGHT" | "WANT", rule: BuyOrWaitRule): BuyOrWait | null {
  const short = windowOf(history, rule.shortDays);
  const long = windowOf(history, rule.longDays);
  const lowestShort: BuyOrWait | null = short.length >= rule.minDataDays && current <= Math.min(...short) ? { kind: "LOWEST_IN_DAYS", days: rule.shortDays } : null;
  const longLow = long.length >= rule.minDataDays ? Math.min(...long) : null;
  const lowestLong: BuyOrWait | null = longLow !== null && current <= longLow && long.length > short.length ? { kind: "LOWEST_IN_DAYS", days: rule.longDays } : null;
  const aboveLong: BuyOrWait | null = longLow !== null && current > longLow ? { kind: "ABOVE_LOWEST", days: rule.longDays, amount: current - longLow } : null;
  const order = mode === "WANT" ? [lowestLong, aboveLong, lowestShort] : [lowestLong, lowestShort, aboveLong];
  return order.find((hint) => hint !== null) ?? null;
}

export interface StoreRating {
  readonly value: number;
  readonly scale: number;
  readonly count: number | null;
}

/** The shared scale of the cross-store product rating ("4,5 / 5"). */
export const CROSS_STORE_SCALE = 5;

/**
 * One product rating across stores, seller-less (modules.md Ratings › Before Göster): on the shared
 * 5-point scale, weighted by each store's rating count. A store on another scale is brought to 5
 * only for this average; each store's own rating is shown after "Göster" on its own scale
 * [ASSUMPTION — user decision 2026-11-15, to be checked in the data test]. Stores without a count
 * are left out. One decimal, as shown.
 */
export function crossStoreRating(ratings: readonly StoreRating[]): { value: number; scale: number; count: number; stores: number } | null {
  const counted = ratings.filter((rating): rating is StoreRating & { count: number } => rating.count !== null && rating.count > 0 && rating.scale > 0);
  const count = counted.reduce((sum, rating) => sum + rating.count, 0);
  if (count === 0) return null;
  const weighted = counted.reduce((sum, rating) => sum + (rating.value / rating.scale) * CROSS_STORE_SCALE * rating.count, 0);
  return { value: Math.round((weighted / count) * 10) / 10, scale: CROSS_STORE_SCALE, count, stores: counted.length };
}
