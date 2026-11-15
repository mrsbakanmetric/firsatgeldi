// Home "Şu an en çok düşenler" (design "3 Ana Sayfa" v2 Main and States; modules.md Home › D):
// the cheapest price per day over the last 30 days, from our own price checks only, and
// what the cheapest offer looks like now. The list itself is not written here: the mock
// computes it with the documented rule (`topDropOf`, `home.top_drops.*`), as the job will.
import type { ProductKey } from "./catalog";

export interface TopDropSeed {
  readonly productKey: ProductKey;
  /** Usual cheapest price (TL) on the days before the drop. */
  readonly usualTl: number;
  /** Days (counted back from today) the price has been at `nowTl`. */
  readonly droppedDays: number;
  /** Current cheapest in-stock price (TL, shipping included). */
  readonly nowTl: number;
  readonly sellerCount: number;
  readonly stockState: "IN_STOCK" | "LOW_STOCK";
  readonly checkedMinutesAgo: number;
}

/** Days of daily history kept per product (≥ `home.top_drops.window_days`). */
export const TOP_DROP_HISTORY_DAYS = 30;

export const TOP_DROP_SEEDS: readonly TopDropSeed[] = [
  // In the fixture user's tracked categories (action camera, cordless vacuum).
  { productKey: "osmoAction5Pro", usualTl: 18_400, droppedDays: 1, nowTl: 14_999, sellerCount: 4, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
  { productKey: "speedProMax", usualTl: 21_999, droppedDays: 2, nowTl: 18_499, sellerCount: 5, stockState: "LOW_STOCK", checkedMinutesAgo: 12 },
  { productKey: "goProHero13", usualTl: 17_999, droppedDays: 3, nowTl: 15_699, sellerCount: 6, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
  // Too small a drop: never listed (5 %).
  { productKey: "acePro", usualTl: 13_499, droppedDays: 2, nowTl: 12_799, sellerCount: 3, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
  // Other categories: the general list ("Genel").
  { productKey: "airfryerXxl", usualTl: 9_850, droppedDays: 1, nowTl: 7_499, sellerCount: 7, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
  { productKey: "galaxyWatch7", usualTl: 11_299, droppedDays: 2, nowTl: 9_599, sellerCount: 5, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
  { productKey: "kindlePaperwhite", usualTl: 6_299, droppedDays: 1, nowTl: 5_199, sellerCount: 4, stockState: "LOW_STOCK", checkedMinutesAgo: 12 },
  // The fixture user tracks this one: never in their own list.
  { productKey: "x4", usualTl: 27_999, droppedDays: 2, nowTl: 24_499, sellerCount: 8, stockState: "IN_STOCK", checkedMinutesAgo: 12 },
];

/** The 30 daily cheapest prices of a seed in kuruş, oldest first (today last). */
export function topDropHistory(seed: TopDropSeed): number[] {
  return Array.from({ length: TOP_DROP_HISTORY_DAYS }, (_, index) => (index >= TOP_DROP_HISTORY_DAYS - seed.droppedDays ? seed.nowTl : seed.usualTl) * 100);
}
