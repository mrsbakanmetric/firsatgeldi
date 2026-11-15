import { describe, expect, it } from "vitest";
import { priceChartModel } from "./price-chart";
import { topDropOf } from "./top-drops";

const RULE = { windowDays: 30, minDropPct: 10, minHistoryDays: 14 } as const;
const days = (count: number, value: number | null) => Array.from({ length: count }, () => value);

describe("topDropOf (modules.md Home › D)", () => {
  it("qualifies a drop of at least min_drop_pct against the window average", () => {
    const drop = topDropOf([...days(29, 1_840_000), 1_499_900], 1_499_900, RULE);
    expect(drop).toEqual({ average: 1_828_663, current: 1_499_900, dropAmount: 328_763, dropPct: 17 });
  });

  it("ignores days before the window and days without data", () => {
    const old = days(60, 9_000_000);
    expect(topDropOf([...old, ...days(20, 1_000_000), ...days(10, null)], 850_000, RULE)?.average).toBe(1_000_000);
  });

  it("needs enough history, stock and a big enough drop", () => {
    expect(topDropOf([...days(17, null), ...days(12, 1_000_000), 800_000], 800_000, RULE)).toBeNull();
    expect(topDropOf(days(30, 1_000_000), null, RULE)).toBeNull();
    expect(topDropOf(days(30, 1_000_000), 910_000, RULE)).toBeNull();
    expect(topDropOf(days(30, 1_000_000), 900_000, RULE)?.dropPct).toBe(10);
    expect(topDropOf(days(30, 1_000_000), 1_100_000, RULE)).toBeNull();
  });
});

describe("priceChartModel (pagedesign.md §8.1 chart)", () => {
  const series = [2_849_900, 2_849_900, 2_789_900, 2_789_900, 2_699_900, 2_699_900, 2_599_700];

  it("round grid that contains the series and the reference", () => {
    const model = priceChartModel({ cheapest: series, references: [2_899_900], gridLines: 4 });
    expect(model.min).toBeLessThanOrEqual(2_599_700);
    expect(model.max).toBeGreaterThanOrEqual(2_899_900);
    expect(model.grid.every((value) => value % 50_000 === 0)).toBe(true);
    expect(model.grid[0]).toBe(model.max);
  });

  it("marks every step change and sums up the period", () => {
    const model = priceChartModel({ cheapest: [null, ...series], references: [], gridLines: 4 });
    expect(model.steps).toEqual([1, 3, 5, 7]);
    expect(model.highest).toBe(2_849_900);
    expect(model.lowest).toBe(2_599_700);
    expect(model.lowestIndex).toBe(7);
    expect(model.change).toBe(-250_200);
    expect(model.changePct).toBe(-8.8);
  });

  it("flat or empty series", () => {
    const flat = priceChartModel({ cheapest: days(14, 1_000_000), references: [], gridLines: 4 });
    expect(flat.max).toBeGreaterThan(flat.min);
    expect(flat.steps).toEqual([0]);
    expect(flat.change).toBe(0);
    const empty = priceChartModel({ cheapest: days(14, null), references: [], gridLines: 4 });
    expect(empty.grid).toEqual([]);
    expect(empty.change).toBeNull();
  });
});
