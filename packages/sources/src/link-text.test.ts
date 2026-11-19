import { describe, expect, it } from "vitest";
import { readLinkText } from "./link-text.ts";

function reading(link: string) {
  const result = readLinkText(link);
  if (!result.ok) throw new Error(`expected a reading, got ${result.reason}`);
  return result.reading;
}

describe("readLinkText — path 1, the link text itself", () => {
  it("reads the user's Trendyol link (2026-11-19): brand, name, model code, product id", () => {
    expect(reading("https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415")).toEqual({
      path: "LINK_TEXT",
      platform: "TRENDYOL",
      productExternalId: "754059415",
      url: "https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415",
      brand: "asics",
      nameWords: ["gel", "dedicate", "8", "kadin", "tenis", "ayakkabisi"],
      modelCode: "1042A237-101",
      sellerExternalId: null,
      searchText: "asics gel dedicate 8 kadin tenis ayakkabisi 1042a237-101",
    });
  });

  it("drops tracking parameters from the URL but keeps the Trendyol seller id", () => {
    const result = reading("https://www.trendyol.com/dyson/v15-detect-absolute-supurge-p-123456?boutiqueId=61&merchantId=968&utm_source=share#reviews");
    expect(result.url).toBe("https://www.trendyol.com/dyson/v15-detect-absolute-supurge-p-123456");
    expect(result.sellerExternalId).toBe("968");
    // "v15" is a name part, not a model code.
    expect(result.modelCode).toBeNull();
    expect(result.searchText).toBe("dyson v15 detect absolute supurge");
  });

  it("does not repeat the brand when the name already starts with it", () => {
    expect(reading("https://www.trendyol.com/philips/philips-ep2231-40-tam-otomatik-espresso-makinesi-p-38211234").searchText).toBe(
      "philips tam otomatik espresso makinesi ep2231-40",
    );
  });

  it("takes a code in the middle of the name when none ends it", () => {
    const result = reading("https://www.trendyol.com/sony/wh-1000xm5-kablosuz-kulaklik-p-345678");
    expect(result.modelCode).toBe("1000XM5");
    expect(result.nameWords).toEqual(["wh", "kablosuz", "kulaklik"]);
  });

  it("starts the code at the code word, not at a number in the name", () => {
    expect(reading("https://www.trendyol.com/asics/gel-dedicate-8-1042a237-101-p-1").modelCode).toBe("1042A237-101");
  });

  it("finds no model code in a name of plain numbers", () => {
    expect(reading("https://www.teknosa.com/apple-iphone-15-128-gb-siyah-p-125077505").modelCode).toBeNull();
  });

  it("reads a Trendyol link without the brand segment; brand is then not guessed", () => {
    expect(reading("https://www.trendyol.com/herhangi-bir-urun-p-998877")).toMatchObject({ platform: "TRENDYOL", productExternalId: "998877", brand: null, nameWords: ["herhangi", "bir", "urun"] });
  });

  it("reads mobile and bare store hosts", () => {
    expect(reading("https://m.trendyol.com/asics/gel-p-1").platform).toBe("TRENDYOL");
    expect(reading("https://trendyol.com/asics/gel-p-1").platform).toBe("TRENDYOL");
  });

  it("reads Hepsiburada listing and product-family links; brand is not guessed", () => {
    const listing = reading("https://www.hepsiburada.com/insta360-ace-pro-2-flash-print-bundle-p-hbcv00006abcde?magaza=Kamera");
    expect(listing).toMatchObject({ platform: "HEPSIBURADA", productExternalId: "HBCV00006ABCDE", brand: null, sellerExternalId: null });
    expect(listing.nameWords).toEqual(["insta360", "ace", "pro", "2", "flash", "print", "bundle"]);
    expect(reading("https://www.hepsiburada.com/apple-iphone-15-pm-HBC00004XYZ12").productExternalId).toBe("HBC00004XYZ12");
  });

  it("reads Amazon links with and without a name", () => {
    expect(reading("https://www.amazon.com.tr/Dyson-V15-Detect-Absolute/dp/B09XYZ1234/ref=sr_1_1?keywords=dyson")).toMatchObject({
      platform: "AMAZON_TR",
      productExternalId: "B09XYZ1234",
      nameWords: ["dyson", "v15", "detect", "absolute"],
    });
    expect(reading("https://www.amazon.com.tr/dp/B09XYZ1234")).toMatchObject({ productExternalId: "B09XYZ1234", nameWords: [], searchText: "" });
    expect(reading("https://www.amazon.com.tr/gp/product/B09XYZ1234").productExternalId).toBe("B09XYZ1234");
  });

  it("reads MediaMarkt and Teknosa links", () => {
    expect(reading("https://www.mediamarkt.com.tr/tr/product/_dji-osmo-pocket-3-creator-combo-1234567.html")).toMatchObject({
      platform: "MEDIAMARKT",
      productExternalId: "1234567",
      nameWords: ["dji", "osmo", "pocket", "3", "creator", "combo"],
    });
    expect(reading("https://www.teknosa.com/apple-iphone-15-128-gb-siyah-p-125077505")).toMatchObject({ platform: "TEKNOSA", productExternalId: "125077505" });
  });

  it("decodes encoded characters in the name", () => {
    expect(reading("https://www.trendyol.com/koton/kad%C4%B1n-g%C3%B6mlek-p-99").nameWords).toEqual(["kadın", "gömlek"]);
  });

  it.each([
    ["not a URL", "asics gel dedicate", "NOT_A_URL", null],
    ["not http", "ftp://www.trendyol.com/asics/gel-p-1", "NOT_A_URL", null],
    ["unknown store", "https://www.n11.com/urun/asics-gel-123", "UNKNOWN_STORE", null],
    ["look-alike domain", "https://trendyol.com.example.net/asics/gel-p-1", "UNKNOWN_STORE", null],
    ["share link", "https://ty.gl/abc123", "SHORT_LINK", "TRENDYOL"],
    ["Amazon share link", "https://amzn.eu/d/abc123", "SHORT_LINK", "AMAZON_TR"],
    ["store home", "https://www.trendyol.com/", "NOT_A_PRODUCT_PAGE", "TRENDYOL"],
    ["store search", "https://www.trendyol.com/sr?q=asics", "NOT_A_PRODUCT_PAGE", "TRENDYOL"],
    ["category page", "https://www.hepsiburada.com/kosu-ayakkabilari-c-80526003", "NOT_A_PRODUCT_PAGE", "HEPSIBURADA"],
  ])("says why it reads nothing: %s", (_case, link, reason, platform) => {
    expect(readLinkText(link)).toEqual({ ok: false, reason, platform });
  });
});
