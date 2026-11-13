import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, formatDate, formatDateTime, formatMoney, formatNumber, formatTime, pluralCategory, pluralCategories } from "./format";

const nbsp = "\u00a0";

describe.each([
  { locale: "tr", whole: `25.997${nbsp}TL`, fraction: `25.997,50${nbsp}TL`, number: "1.234.567", date: "14 Kas 2026", time: "01:30" },
  { locale: "en", whole: `TL${nbsp}25,997`, fraction: `TL${nbsp}25,997.50`, number: "1,234,567", date: "Nov 14, 2026", time: "1:30 AM" },
])("formatting — $locale", ({ locale, whole, fraction, number, date, time }) => {
  // 22:30 UTC on 13 Nov is 01:30 on 14 Nov in Istanbul.
  const instant = new Date("2026-11-13T22:30:00Z");

  it("money without decimals for whole amounts", () => {
    expect(formatMoney(25997, locale)).toBe(whole);
  });

  it("money with decimals only when there is a fraction", () => {
    expect(formatMoney(25997.5, locale)).toBe(fraction);
  });

  it("numbers with the locale's grouping", () => {
    expect(formatNumber(1234567, locale)).toBe(number);
  });

  it("dates and times in Europe/Istanbul by default", () => {
    expect(formatDate(instant, locale)).toBe(date);
    expect(formatTime(instant, locale).replace(/\u202f/g, " ")).toBe(time);
    expect(formatDateTime(instant, locale)).toContain(date);
  });

  it("another time zone when asked", () => {
    expect(formatDate(instant, locale, { timeZone: "UTC" })).not.toBe(date);
  });

  it("plural categories one and other", () => {
    expect(pluralCategories(locale).sort()).toEqual(["one", "other"]);
    expect(pluralCategory(1, locale)).toBe("one");
    expect(pluralCategory(5, locale)).toBe("other");
  });
});

it("uses Europe/Istanbul as the default zone", () => {
  expect(DEFAULT_TIME_ZONE).toBe("Europe/Istanbul");
});
