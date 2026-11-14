import { describe, expect, it } from "vitest";
import { readHandoff, searchAddHref, trackedItemsHref } from "./handoff";

const id = "0b6e2b0e-8f3c-4b8f-9f55-6d1e5b2a7c10";

describe("hand-over links (no Add product dialog: Search and Add is the one flow)", () => {
  it("“Ürün ekle” opens Search and Add and comes back to Tracked Items, in each language", () => {
    expect(searchAddHref("tr", { backToTracking: true })).toBe("/tr/ara?donus=takip");
    expect(searchAddHref("en", { backToTracking: true })).toBe("/en/search?donus=takip");
    expect(readHandoff("?donus=takip")).toEqual({ productId: null, mode: null, backToTracking: true });
  });

  it("“Takip et” marks the product and preselects the mode; it always comes back to Tracked Items", () => {
    const href = searchAddHref("tr", { productId: id, mode: "WANT" });
    expect(href).toBe(`/tr/ara?urun=${id}&mod=istiyorum`);
    expect(readHandoff(href.slice(href.indexOf("?")))).toEqual({ productId: id, mode: "WANT", backToTracking: true });
    expect(readHandoff(`?urun=${id}&mod=aldim`).mode).toBe("BOUGHT");
    expect(readHandoff("?mod=bilinmiyor")).toEqual({ productId: null, mode: null, backToTracking: false });
  });

  it("Tracked Items can name the item just added", () => {
    expect(trackedItemsHref("en", id)).toBe(`/en/tracking?eklendi=${id}`);
    expect(trackedItemsHref("tr")).toBe("/tr/takip");
  });
});
