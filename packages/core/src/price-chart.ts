// Price chart model (product_design_pattern.md §5.6; pagedesign.md §8.1 Hemen Gözat chart,
// design v2): the value range with round grid steps, the days where the cheapest price
// changed (each marked and labelled), and the 14-day summary (highest · lowest · change).
// Pure and platform-neutral: web and mobile draw from the same numbers.

export interface PriceChartInput {
  /** Cheapest price per day in kuruş, oldest first; null = no data that day. */
  readonly cheapest: readonly (number | null)[];
  /** Reference lines (price paid, target) in kuruş; they widen the range so they stay visible. */
  readonly references: readonly (number | null)[];
  /** Number of grid lines wanted (excluding the base line). */
  readonly gridLines: number;
}

export interface PriceChartModel {
  readonly min: number;
  readonly max: number;
  /** Grid values from the top down, all round numbers inside [min, max]. */
  readonly grid: readonly number[];
  /** Index of every day where the cheapest price differs from the day before (first known day included). */
  readonly steps: readonly number[];
  readonly highest: number | null;
  readonly lowest: number | null;
  /** Index of the lowest day (the latest one when equal). */
  readonly lowestIndex: number | null;
  /** Last known − first known; null with fewer than two known days. */
  readonly change: number | null;
  /** Change against the first known value, in percent (one decimal); null like `change`. */
  readonly changePct: number | null;
}

/** 1, 2, 2.5 or 5 × 10ⁿ: the smallest round step that fits `span` in `lines` steps. */
function niceStep(span: number, lines: number): number {
  const raw = span / Math.max(1, lines);
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate * power >= raw) ?? 10;
  return factor * power;
}

export function priceChartModel({ cheapest, references, gridLines }: PriceChartInput): PriceChartModel {
  const known = cheapest.map((value, index) => ({ value, index })).filter((entry): entry is { value: number; index: number } => entry.value !== null);
  const values = [...known.map((entry) => entry.value), ...references.filter((value): value is number => value !== null)];
  const steps = known.filter((entry, position) => position === 0 || entry.value !== known[position - 1]?.value).map((entry) => entry.index);
  const highest = known.length ? Math.max(...known.map((entry) => entry.value)) : null;
  const lowest = known.length ? Math.min(...known.map((entry) => entry.value)) : null;
  const lowestIndex = lowest === null ? null : (known.filter((entry) => entry.value === lowest).at(-1)?.index ?? null);
  const first = known[0];
  const last = known.at(-1);
  const change = first && last && known.length > 1 ? last.value - first.value : null;
  const changePct = change !== null && first ? Math.round((change / first.value) * 1000) / 10 : null;

  if (!values.length) return { min: 0, max: 0, grid: [], steps, highest, lowest, lowestIndex, change, changePct };
  const low = Math.min(...values);
  const high = Math.max(...values);
  // A flat series still gets a visible band around its value.
  const step = niceStep(high > low ? high - low : Math.max(1, high * 0.1), gridLines);
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step === min ? min + step : Math.ceil(high / step) * step;
  const grid: number[] = [];
  for (let value = max; value > min; value -= step) grid.push(value);
  return { min, max, grid, steps, highest, lowest, lowestIndex, change, changePct };
}
