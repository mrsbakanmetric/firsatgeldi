import { describe, expect, it } from "vitest";
import { buyOrWaitHint, historyTiles } from "./price-history";

const rule = { shortDays: 30, longDays: 180, minDataDays: 14 };
const flat = (days: number, value: number) => Array.from({ length: days }, () => value);

describe("historyTiles", () => {
  it("lowest (latest when repeated), highest, rounded average and change over the days with data", () => {
    expect(historyTiles([null, 300, 200, 250, 200])).toEqual({ lowest: 200, lowestIndex: 4, highest: 300, average: 238, change: -100, dataDays: 4 });
  });

  it("no data → null (nothing is guessed)", () => {
    expect(historyTiles([null, null])).toBeNull();
  });
});

describe("buyOrWaitHint", () => {
  it("bought: today is the lowest of 30 days, while 6 months had a lower price → \"Son 30 günün en düşüğü\"", () => {
    const history = [...flat(100, 3000), 2400, ...flat(79, 3000), 2600];
    expect(buyOrWaitHint(history, 2600, "BOUGHT", rule)).toEqual({ kind: "LOWEST_IN_DAYS", days: 30 });
  });

  it("want: the same history → \"Son 6 ayın en düşüğüne X var\"", () => {
    const history = [...flat(100, 3000), 2400, ...flat(79, 3000), 2600];
    expect(buyOrWaitHint(history, 2600, "WANT", rule)).toEqual({ kind: "ABOVE_LOWEST", days: 180, amount: 200 });
  });

  it("the lowest of the long window wins in both modes when it is true", () => {
    const history = [...flat(179, 3000), 2600];
    expect(buyOrWaitHint(history, 2600, "BOUGHT", rule)).toEqual({ kind: "LOWEST_IN_DAYS", days: 180 });
    expect(buyOrWaitHint(history, 2600, "WANT", rule)).toEqual({ kind: "LOWEST_IN_DAYS", days: 180 });
  });

  it("too little data → no hint", () => {
    expect(buyOrWaitHint([...flat(10, 3000), 2600], 2600, "BOUGHT", rule)).toBeNull();
  });

  it("only 14 days of data: a short-window statement, never a 6-month one", () => {
    const history = [...Array.from({ length: 166 }, () => null), ...flat(13, 3000), 2600];
    expect(buyOrWaitHint(history, 2600, "WANT", rule)).toEqual({ kind: "LOWEST_IN_DAYS", days: 30 });
  });
});
