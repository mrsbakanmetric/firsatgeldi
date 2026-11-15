// "Şu an en çok düşenler" rule (modules.md Home › D; architecture.md §9 job `top-drops`):
// a product qualifies when its current cheapest in-stock price (shipping included) is at
// least `min_drop_pct` below the average daily cheapest price of the last `window_days`,
// with price data on at least `min_history_days` of those days. Built only from our own
// price checks — no user data. Pure, so the mock API and the Phase 2 worker share it.

export interface TopDropRule {
  /** `home.top_drops.window_days` */
  readonly windowDays: number;
  /** `home.top_drops.min_drop_pct` */
  readonly minDropPct: number;
  /** `home.top_drops.min_history_days` */
  readonly minHistoryDays: number;
}

export interface TopDrop {
  /** Rounded to whole kuruş. */
  readonly average: number;
  readonly current: number;
  readonly dropAmount: number;
  /** Whole percent, rounded down (never overstates the drop). */
  readonly dropPct: number;
}

/**
 * `daily` = cheapest price per day in kuruş, oldest first, the last entry being today (null = no data);
 * `current` = the current cheapest in-stock price, or null when out of stock everywhere.
 * Days before the window are ignored. Returns null when the product does not qualify.
 */
export function topDropOf(daily: readonly (number | null)[], current: number | null, rule: TopDropRule): TopDrop | null {
  if (current === null) return null;
  const window = daily.slice(-rule.windowDays).filter((value): value is number => value !== null);
  if (window.length < rule.minHistoryDays) return null;
  const average = Math.round(window.reduce((sum, value) => sum + value, 0) / window.length);
  const dropAmount = average - current;
  if (dropAmount <= 0) return null;
  const dropPct = Math.floor((dropAmount / average) * 100);
  return dropPct >= rule.minDropPct ? { average, current, dropAmount, dropPct } : null;
}
