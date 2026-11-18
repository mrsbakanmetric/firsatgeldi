import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pathTwoQuery, readGoogleShopping } from "./google-shopping.ts";
import { readLinkText } from "./link-text.ts";
import { cacheKey } from "./serpapi.ts";

/** The one live search of 2026-11-19 (user-approved), saved by the client. */
const RECORDED = join(import.meta.dirname, "..", "recordings", "serpapi", `${cacheKey({ engine: "google_shopping", gl: "tr", hl: "tr", google_domain: "google.com.tr", q: "asics 1042A237-101" })}.json`);
const ASICS_LINK = "https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415";

describe("path 2 — Google Shopping answer", () => {
  it("searches by brand + model code when the link has one", () => {
    const result = readLinkText(ASICS_LINK);
    if (!result.ok) throw new Error(result.reason);
    expect(pathTwoQuery(result.reading)).toBe("asics 1042A237-101");
  });

  it("falls back to every word read from the link", () => {
    const result = readLinkText("https://www.trendyol.com/dyson/v15-detect-absolute-p-1");
    if (!result.ok) throw new Error(result.reason);
    expect(pathTwoQuery(result.reading)).toBe("dyson v15 detect absolute");
  });

  it("reads the recorded answer: the first offer is the linked product", async () => {
    const reading = readGoogleShopping(JSON.parse(await readFile(RECORDED, "utf8")));
    expect(reading.error).toBeNull();
    expect(reading.offers).toHaveLength(12);
    expect(reading.offers[0]).toMatchObject({
      position: 1,
      title: "ASICS GEL-DEDICATE 8 - BLUE - 40",
      source: "Bayramoğlu Shoes",
      price: 3749.25,
      oldPrice: 4999,
    });
    expect(reading.offers[0]?.thumbnail).toMatch(/^https:/);
  });

  it("ignores unknown shapes and wrong types instead of guessing", () => {
    expect(readGoogleShopping(null)).toEqual({ error: "not a JSON object", offers: [] });
    expect(readGoogleShopping({ error: "Google hasn't returned any results for this query." })).toEqual({
      error: "Google hasn't returned any results for this query.",
      offers: [],
    });
    const reading = readGoogleShopping({ shopping_results: [{ title: "X", extracted_price: "12", rating: Number.NaN }, { price: 5 }, "junk"] });
    expect(reading.offers).toEqual([{ position: null, title: "X", source: null, price: null, oldPrice: null, rating: null, reviews: null, delivery: null, link: null, thumbnail: null }]);
  });

  it("reads grouped and inline results too", () => {
    const reading = readGoogleShopping({ inline_shopping_results: [{ title: "A" }], categorized_shopping_results: [{ shopping_results: [{ title: "B" }] }] });
    expect(reading.offers.map((offer) => offer.title)).toEqual(["A", "B"]);
  });
});
