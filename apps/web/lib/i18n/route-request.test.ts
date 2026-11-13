import { describe, expect, it } from "vitest";
import { localeCookie } from "./locale-preference";
import { routeRequest, type PageRequest } from "./route-request";

const request = (overrides: Partial<PageRequest>): PageRequest => ({
  pathname: "/",
  search: "",
  cookieLocale: undefined,
  acceptLanguage: null,
  ...overrides,
});

describe("root / redirects to the resolved locale", () => {
  it.each([
    ["no hints → default tr", {}, "/tr"],
    ["Accept-Language en", { acceptLanguage: "en-US,en;q=0.9" }, "/en"],
    ["Accept-Language in q order", { acceptLanguage: "de, en;q=0.8, tr;q=0.5" }, "/en"],
    ["no supported language → tr", { acceptLanguage: "de, fr" }, "/tr"],
    ["cookie beats Accept-Language", { cookieLocale: "en", acceptLanguage: "tr" }, "/en"],
    ["unknown cookie is ignored", { cookieLocale: "xx", acceptLanguage: "en" }, "/en"],
  ])("%s", (_name, overrides, location) => {
    expect(routeRequest(request(overrides))).toEqual({ action: "redirect", location, permanent: false });
  });

  it("keeps the query string", () => {
    expect(routeRequest(request({ search: "?q=dyson" }))).toEqual({ action: "redirect", location: "/tr?q=dyson", permanent: false });
  });
});

describe.each([
  { locale: "tr", list: "/tr/takip", detail: "/tr/takip/42", wrong: "/tr/tracking", canonical: "/tr/takip" },
  { locale: "en", list: "/en/tracking", detail: "/en/tracking/42", wrong: "/en/takip", canonical: "/en/tracking" },
])("localised paths — $locale", ({ locale, list, detail, wrong, canonical }) => {
  it("serves the locale home as it is", () => {
    expect(routeRequest(request({ pathname: `/${locale}` }))).toEqual({ action: "next" });
  });

  it("serves or rewrites this language's segments to the Turkish folders", () => {
    const expected = locale === "tr" ? { action: "next" } : { action: "rewrite", pathname: "/en/takip/42" };
    expect(routeRequest(request({ pathname: detail }))).toEqual(expected);
    expect(routeRequest(request({ pathname: list }))).toEqual(locale === "tr" ? { action: "next" } : { action: "rewrite", pathname: "/en/takip" });
  });

  it("redirects another language's segment permanently", () => {
    expect(routeRequest(request({ pathname: wrong, search: "?a=1" }))).toEqual({ action: "redirect", location: `${canonical}?a=1`, permanent: true });
  });

  it("leaves unknown paths to the app router (404)", () => {
    expect(routeRequest(request({ pathname: `/${locale}/does-not-exist` }))).toEqual({ action: "next" });
  });
});

describe("paths without a locale", () => {
  it("get the resolved locale and that language's segments", () => {
    expect(routeRequest(request({ pathname: "/takip/42", acceptLanguage: "en" }))).toEqual({ action: "redirect", location: "/en/tracking/42", permanent: false });
    expect(routeRequest(request({ pathname: "/tracking" }))).toEqual({ action: "redirect", location: "/tr/takip", permanent: false });
  });
});

describe("locale cookie", () => {
  it.each(["tr", "en"] as const)("stores %s for a year, site-wide", (locale) => {
    expect(localeCookie(locale, true)).toBe(`fg_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    expect(localeCookie(locale, false)).not.toContain("Secure");
  });
});
