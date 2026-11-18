import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, formatAtTime, formatDate, formatDateTime, formatMoney, formatNumber, formatOnDay, formatSince, formatTime, formatUntil, pluralCategories, pluralCategory, turkishAblative, turkishLocative } from "./format";

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

describe("formatUntil — the month's own suffix in Turkish", () => {
  const TR = ["1 Ocak'a kadar", "1 Şubat'a kadar", "1 Mart'a kadar", "1 Nisan'a kadar", "1 Mayıs'a kadar", "1 Haziran'a kadar", "1 Temmuz'a kadar", "1 Ağustos'a kadar", "1 Eylül'e kadar", "1 Ekim'e kadar", "1 Kasım'a kadar", "1 Aralık'a kadar"];
  const EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month) => `until 1 ${month}`);

  it.each(TR.map((text, index) => [index, text, EN[index]] as const))("month %i: %s · %s", (index, tr, en) => {
    // Noon UTC on the 1st: the same day in Istanbul.
    const date = new Date(Date.UTC(2026, index, 1, 12));
    expect(formatUntil(date, "tr")).toBe(tr);
    expect(formatUntil(date, "en")).toBe(en);
  });

  it("day and month in the display zone: 12 Aralık'a kadar · until 12 December", () => {
    const lateNight = new Date("2026-12-11T22:30:00Z"); // 01:30 on 12 December in Istanbul
    expect(formatUntil(lateNight, "tr")).toBe("12 Aralık'a kadar");
    expect(formatUntil(lateNight, "en")).toBe("until 12 December");
    expect(formatUntil(lateNight, "en", { timeZone: "UTC" })).toBe("until 11 December");
  });
});

describe("formatSince — the ablative follows how the year is read", () => {
  it.each([
    [2026, "'dan"], [2027, "'den"], [2023, "'ten"], [2024, "'ten"], [2025, "'ten"], [2021, "'den"], [2029, "'dan"],
    [2030, "'dan"], [2020, "'den"], [2040, "'tan"], [2050, "'den"], [2060, "'tan"], [2070, "'ten"], [2080, "'den"], [2090, "'dan"], [2010, "'dan"],
    [2000, "'den"], [2100, "'den"], [0, "'dan"],
  ])("%i%s", (year, suffix) => {
    expect(turkishAblative(year)).toBe(suffix);
  });

  it("tr \"Ekim 2026'dan beri\" · en \"since October 2026\"", () => {
    const date = new Date("2026-10-03T12:00:00Z");
    expect(formatSince(date, "tr")).toBe("Ekim 2026'dan beri");
    expect(formatSince(date, "en")).toBe("since October 2026");
    expect(formatSince(new Date("2027-01-01T08:00:00Z"), "tr")).toBe("Ocak 2027'den beri");
  });
});

describe("locative phrases — the suffix follows how the day or time is read", () => {
  it.each([
    [0, "Ocak'ta"], [1, "Şubat'ta"], [2, "Mart'ta"], [3, "Nisan'da"], [4, "Mayıs'ta"], [5, "Haziran'da"],
    [6, "Temmuz'da"], [7, "Ağustos'ta"], [8, "Eylül'de"], [9, "Ekim'de"], [10, "Kasım'da"], [11, "Aralık'ta"],
  ])("month %i: 1 %s", (month, phrase) => {
    expect(formatOnDay(new Date(Date.UTC(2026, month, 1, 12)), "tr")).toBe(`1 ${phrase}`);
  });

  it("en: on 1 November", () => {
    expect(formatOnDay(new Date(Date.UTC(2026, 10, 1, 12)), "en")).toBe("on 1 November");
  });

  it.each([
    ["2026-11-19T09:10:00Z", "12:10'da"],
    ["2026-11-19T15:05:00Z", "18:05'te"],
    ["2026-11-19T08:20:00Z", "11:20'de"],
    ["2026-11-19T16:00:00Z", "19:00'da"],
    ["2026-11-19T06:00:00Z", "09:00'da"],
    ["2026-11-19T11:40:00Z", "14:40'ta"],
  ])("%s → %s (Istanbul)", (instant, phrase) => {
    expect(formatAtTime(new Date(instant), "tr")).toBe(phrase);
  });

  it("with the short date; en", () => {
    expect(formatAtTime(new Date("2026-11-11T13:20:00Z"), "tr", { withDate: true })).toBe("11 Kas 16:20'de");
    expect(formatAtTime(new Date("2026-11-11T13:20:00Z"), "en")).toBe("at 4:20 PM");
    expect(formatAtTime(new Date("2026-11-11T13:20:00Z"), "en", { withDate: true })).toBe("on Nov 11 at 4:20 PM");
    expect(turkishLocative(5)).toBe("'te");
  });
});
