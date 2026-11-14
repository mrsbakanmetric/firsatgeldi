import { createTranslator } from "@firsatgeldi/i18n";
import { describe, expect, it } from "vitest";
import { ago, checkedAgo, formatDay, money, parsePrice, priceInput } from "./format";

const NOW = Date.parse("2026-11-14T09:00:00.000Z");
const MINUTE = 60_000;

describe("typed price", () => {
  it.each([
    ["tr", "28.999", 2_899_900],
    ["tr", "28999", 2_899_900],
    ["tr", "28.999,50", 2_899_950],
    ["tr", "28.999 TL", 2_899_900],
    ["en", "28,999", 2_899_900],
    ["en", "28,999.50", 2_899_950],
  ] as const)("%s %s → %i kuruş", (locale, text, expected) => {
    expect(parsePrice(text, locale)).toBe(expected);
  });

  it.each([["tr", ""], ["tr", "abc"], ["tr", "28,99,9"], ["tr", "0"], ["en", "28.999.5"]] as const)("%s %j is not a price", (locale, text) => {
    expect(parsePrice(text, locale)).toBeNull();
  });

  it("prefilled prices read the way the user types them", () => {
    expect(priceInput({ amount: 2_899_900, currency: "TRY" }, "tr")).toBe("28.999");
    expect(priceInput({ amount: 2_899_900, currency: "TRY" }, "en")).toBe("28,999");
  });
});

describe("ages and days", () => {
  it.each(["tr", "en"] as const)("ages come from the catalogue (%s)", (locale) => {
    const t = createTranslator(locale);
    expect(ago(t, new Date(NOW - 20_000).toISOString(), NOW)).toBe(t("time.justNow"));
    expect(ago(t, new Date(NOW - 6 * MINUTE).toISOString(), NOW)).toBe(t("time.minutesAgo", { count: 6 }));
    expect(ago(t, new Date(NOW - 3 * 60 * MINUTE).toISOString(), NOW)).toBe(t("time.hoursAgo", { count: 3 }));
    expect(checkedAgo(t, new Date(NOW - 6 * MINUTE).toISOString(), NOW)).toBe(locale === "tr" ? "6 dk önce kontrol edildi" : "checked 6 min ago");
  });

  it("days and money in the user's language", () => {
    expect(formatDay("2026-11-24", "tr")).toBe("24 Kasım 2026");
    expect(formatDay("2026-11-24", "en")).toBe("November 24, 2026");
    expect(money({ amount: 2_599_700, currency: "TRY" }, "tr")).toBe("25.997\u00a0TL");
  });
});
