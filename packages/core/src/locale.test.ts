import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage, parseAcceptLanguage, resolveLocale } from "./locale";

const config = { supported: ["tr", "en"] as const, defaultLocale: "tr" as const };

describe("parseAcceptLanguage", () => {
  it("orders by q and keeps header order for ties", () => {
    expect(parseAcceptLanguage("de;q=0.5, en;q=0.8, tr")).toEqual(["tr", "en", "de"]);
    expect(parseAcceptLanguage("fr, de")).toEqual(["fr", "de"]);
  });

  it("drops q=0, wildcards and empty input", () => {
    expect(parseAcceptLanguage("en;q=0, *, tr;q=0.1")).toEqual(["tr"]);
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("localeFromAcceptLanguage", () => {
  it.each([
    ["tr-TR,tr;q=0.9", "tr"],
    ["en-GB,en;q=0.9", "en"],
    ["de, en;q=0.8", "en"],
    ["de, tr;q=0.3, en;q=0.8", "en"],
    ["de, fr", null],
  ])("%s → %s", (header, expected) => {
    expect(localeFromAcceptLanguage(header, config.supported)).toBe(expected);
  });
});

describe("resolveLocale — first match wins", () => {
  it("URL locale beats everything", () => {
    expect(resolveLocale({ urlLocale: "en", userLocale: "tr", cookieLocale: "tr", acceptLanguage: "tr" }, config)).toBe("en");
  });

  it("then the signed-in user's locale", () => {
    expect(resolveLocale({ userLocale: "en", cookieLocale: "tr", acceptLanguage: "tr" }, config)).toBe("en");
  });

  it("then the cookie", () => {
    expect(resolveLocale({ cookieLocale: "en", acceptLanguage: "tr" }, config)).toBe("en");
  });

  it("then Accept-Language", () => {
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" }, config)).toBe("en");
  });

  it("then the default", () => {
    expect(resolveLocale({ acceptLanguage: "de-DE" }, config)).toBe("tr");
    expect(resolveLocale({}, config)).toBe("tr");
  });

  it("ignores unsupported values at every level", () => {
    expect(resolveLocale({ urlLocale: "de", userLocale: "fr", cookieLocale: "xx", acceptLanguage: "en" }, config)).toBe("en");
  });
});
