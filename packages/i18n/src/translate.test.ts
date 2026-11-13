import { describe, expect, it } from "vitest";
import { LOCALES, type Locale } from "./locales";
import { catalogues, createTranslator } from "./translate";
import type { MessageTree } from "./types";

// Test-only catalogues (not product texts) to exercise interpolation and plurals in both languages.
const fixtures: Record<Locale, MessageTree> = {
  tr: { greeting: "Merhaba {name}", items: { one: "{count} ürün", other: "{count} ürün" } },
  en: { greeting: "Hello {name}", items: { one: "{count} item", other: "{count} items" } },
};

const expected: Record<Locale, { greeting: string; one: string; many: string }> = {
  tr: { greeting: "Merhaba Ayşe", one: "1 ürün", many: "1.250 ürün" },
  en: { greeting: "Hello Ayşe", one: "1 item", many: "1,250 items" },
};

describe.each(LOCALES)("translator — %s", (locale) => {
  const t = createTranslator(locale, fixtures[locale]);
  const fixtureKey = (key: string) => key as Parameters<typeof t>[0];

  it("interpolates values", () => {
    expect(t(fixtureKey("greeting"), { name: "Ayşe" })).toBe(expected[locale].greeting);
  });

  it("picks the plural form and formats the count", () => {
    expect(t(fixtureKey("items"), { count: 1 })).toBe(expected[locale].one);
    expect(t(fixtureKey("items"), { count: 1250 })).toBe(expected[locale].many);
  });

  it("fails loudly on a missing value, a missing count or an unknown key", () => {
    expect(() => t(fixtureKey("greeting"))).toThrow(/Missing value "name"/);
    expect(() => t(fixtureKey("items"))).toThrow(/needs a numeric "count"/);
    expect(() => t(fixtureKey("nope"))).toThrow(/Unknown message key/);
  });

  it("reads the real catalogue", () => {
    const real = createTranslator(locale);
    expect(real.locale).toBe(locale);
    expect(real("meta.title")).toBe(catalogues[locale].meta.title);
  });
});
