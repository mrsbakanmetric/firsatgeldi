import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { localizedPath, matchLocalizedPath, PATH_SEGMENTS, ROUTES } from "./routes";

describe("path segment table", () => {
  it("translates every static route segment into every language", () => {
    for (const route of ROUTES) {
      for (const segment of route.split("/").filter((part) => part && !part.startsWith("["))) {
        expect(PATH_SEGMENTS, `${route} → ${segment}`).toHaveProperty(segment);
      }
    }
  });

  it.each(LOCALES)("has unique, URL-safe segments in %s", (locale) => {
    const values = Object.values(PATH_SEGMENTS).map((forms) => forms[locale]);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("localizedPath", () => {
  it.each([
    ["tr", "/tr/takip/42", "/tr", "/tr/yardim/iletisim"],
    ["en", "/en/tracking/42", "/en", "/en/help/contact"],
  ] as const)("%s", (locale, detail, home, contact) => {
    expect(localizedPath("/takip/[id]", locale, { id: "42" })).toBe(detail);
    expect(localizedPath("/", locale)).toBe(home);
    expect(localizedPath("/yardim/iletisim", locale)).toBe(contact);
  });

  it("encodes dynamic values", () => {
    expect(localizedPath("/urun/[slug]", "en", { slug: "a b" })).toBe("/en/product/a%20b");
  });
});

describe("matchLocalizedPath", () => {
  it("maps English segments to the Turkish folders", () => {
    expect(matchLocalizedPath("/tracking/42", "en")).toEqual({ route: "/takip/[id]", internal: "/takip/42", canonical: "/tracking/42" });
  });

  it("serves Turkish paths as they are", () => {
    expect(matchLocalizedPath("/takip/42", "tr")).toEqual({ route: "/takip/[id]", internal: "/takip/42", canonical: "/takip/42" });
  });

  it("finds the canonical form of a wrong-language segment", () => {
    expect(matchLocalizedPath("/takip", "en")?.canonical).toBe("/tracking");
    expect(matchLocalizedPath("/sign-in", "tr")?.canonical).toBe("/giris");
  });

  it("prefers static segments over dynamic ones", () => {
    expect(matchLocalizedPath("/help/contact", "en")?.route).toBe("/yardim/iletisim");
    expect(matchLocalizedPath("/help/returns", "en")?.route).toBe("/yardim/[slug]");
  });

  it("does not translate dynamic values", () => {
    expect(matchLocalizedPath("/product/help", "en")).toEqual({ route: "/urun/[slug]", internal: "/urun/help", canonical: "/product/help" });
  });

  it("matches the home page and rejects unknown paths", () => {
    expect(matchLocalizedPath("/", "en")).toEqual({ route: "/", internal: "/", canonical: "/" });
    expect(matchLocalizedPath("/does-not-exist", "en")).toBeNull();
  });
});
