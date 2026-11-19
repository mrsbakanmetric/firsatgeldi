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
      brandFromStore: true,
      nameWords: ["gel", "dedicate", "8", "kadin", "tenis", "ayakkabisi"],
      modelCode: "1042A237-101",
      sellerExternalId: null,
      searchText: "asics gel dedicate 8 kadin tenis ayakkabisi 1042a237-101",
      attributes: {
        generation: { line: "dedicate", number: "8" },
        model: "dedicate 8",
        series: [],
        storageGb: null,
        screenInch: null,
        sizeMm: null,
        powerW: null,
        colours: [],
        gender: "WOMEN",
        packCount: null,
      },
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

  it("reads a Trendyol link without the brand segment; the brand is then the first name word", () => {
    expect(reading("https://www.trendyol.com/herhangi-bir-urun-p-998877")).toMatchObject({
      platform: "TRENDYOL",
      productExternalId: "998877",
      brand: "herhangi",
      brandFromStore: false,
      nameWords: ["herhangi", "bir", "urun"],
    });
  });

  it("reads mobile and bare store hosts", () => {
    expect(reading("https://m.trendyol.com/asics/gel-p-1").platform).toBe("TRENDYOL");
    expect(reading("https://trendyol.com/asics/gel-p-1").platform).toBe("TRENDYOL");
  });

  it("reads Hepsiburada listing and product-family links; the brand is the first name word", () => {
    const listing = reading("https://www.hepsiburada.com/insta360-ace-pro-2-flash-print-bundle-p-hbcv00006abcde?magaza=Kamera");
    expect(listing).toMatchObject({ platform: "HEPSIBURADA", productExternalId: "HBCV00006ABCDE", brand: "insta360", brandFromStore: false, sellerExternalId: null });
    expect(listing.searchText).toBe("insta360 ace pro 2 flash print bundle");
    expect(listing.nameWords).toEqual(["insta360", "ace", "pro", "2", "flash", "print", "bundle"]);
    expect(reading("https://www.hepsiburada.com/apple-iphone-15-pm-HBC00004XYZ12").productExternalId).toBe("HBC00004XYZ12");
  });

  it("reads Amazon links with and without a name", () => {
    expect(reading("https://www.amazon.com.tr/Dyson-V15-Detect-Absolute/dp/B09XYZ1234/ref=sr_1_1?keywords=dyson")).toMatchObject({
      platform: "AMAZON_TR",
      productExternalId: "B09XYZ1234",
      nameWords: ["dyson", "v15", "detect", "absolute"],
    });
    expect(reading("https://www.amazon.com.tr/dp/B09XYZ1234")).toMatchObject({ productExternalId: "B09XYZ1234", brand: null, nameWords: [], searchText: "" });
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

  it("reads a pasted link without https://", () => {
    expect(reading("amazon.com.tr/gp/aw/d/B0GPD3SJQW?qid=1")).toMatchObject({ platform: "AMAZON_TR", productExternalId: "B0GPD3SJQW", url: "https://amazon.com.tr/gp/aw/d/B0GPD3SJQW" });
    expect(reading("www.trendyol.com/asics/gel-p-1").platform).toBe("TRENDYOL");
  });

  it("never takes a size or capacity for a model code", () => {
    expect(reading("https://www.trendyol.com/apple/iphone-18-pro-256gb-glacier-p-1").modelCode).toBeNull();
    expect(reading("https://www.teknosa.com/apple-iphone-17-pro-1tb-abis-akilli-telefon-p-1").modelCode).toBeNull();
    expect(reading("https://www.trendyol.com/apple/watch-se-3-gps-40mm-kordon-p-1").modelCode).toBeNull();
    expect(reading("https://www.teknosa.com/marka-guvenlik-kamerasi-1080p-p-1").modelCode).toBeNull();
  });

  it("stops the model code at a screen size written in inches and centimetres", () => {
    expect(reading("https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-tv-p-1")).toMatchObject({ modelCode: "75T8C", nameWords: ["75", "190", "ekran", "uydu", "alicili", "tv"] });
    expect(reading("https://www.hepsiburada.com/onvo-40vq80f3fa-40-102-ekran-tv-pm-HBC1").modelCode).toBe("40VQ80F3FA");
    // A number after the code that is not a screen size stays in the code.
    expect(reading("https://www.trendyol.com/philips/ep2231-40-tam-otomatik-p-1").modelCode).toBe("EP2231-40");
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

// Real product links the user pasted in the data test (2026-11-19). Path 1 reads these without
// any request to the store. Known limits are written down, not hidden: a hyphenated brand reads
// as its first word ("TP-Link" → "tp"), and a store slug that glues words together
// (MediaMarkt "…-226v16gb-ram512-gb-ssd14-oledw1183jx00batr-…") gives no usable model code.
describe("readLinkText — real links from the data test (2026-11-19)", () => {
  it.each([
    ["https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415", "TRENDYOL", "754059415", "asics", "1042A237-101"],
    ["https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537", "TRENDYOL", "940343537", "tcl", "75T8C"],
    ["https://www.trendyol.com/apple/iphone-18-pro-256gb-glacier-p-1198082317", "TRENDYOL", "1198082317", "apple", null],
    ["https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954", "TRENDYOL", "857508954", "apple", "MXP63TU"],
    ["https://www.trendyol.com/apple/watch-se-3-gps-40mm-yildiz-isigi-aluminyum-kasa-ve-kum-beji-spor-kordon-s-m-p-1198475514", "TRENDYOL", "1198475514", "apple", null],
    ["https://www.trendyol.com/apple/13-inc-ipad-air-m3-icin-magic-keyboard-turkce-q-klavye-p-944951815", "TRENDYOL", "944951815", "apple", null],
    ["https://www.hepsiburada.com/roborock-s8-pro-akilli-robot-supurge-beyaz-p-HBCV00008MAIV2", "HEPSIBURADA", "HBCV00008MAIV2", "roborock", null],
    ["https://www.hepsiburada.com/onvo-40vq80f3fa-40-102-ekran-uydu-alicili-full-hd-whaleos-qled-tv-pm-HBC0000GM15FD", "HEPSIBURADA", "HBC0000GM15FD", "onvo", "40VQ80F3FA"],
    ["https://www.hepsiburada.com/apple-iphone-15-128-gb-siyah-p-HBCV00004X9ZCH", "HEPSIBURADA", "HBCV00004X9ZCH", "apple", null],
    ["https://www.hepsiburada.com/apple-watch-se-3-gps-44-mm-gece-yarisi-aluminyum-kasa-ve-gece-yarisi-spor-kordon-m-l-p-HBCV0000A11MSB", "HEPSIBURADA", "HBCV0000A11MSB", "apple", null],
    ["https://www.teknosa.com/roborock-saros-20-akilli-robot-supurge-siyah-p-787133731?shopId=teknosa", "TEKNOSA", "787133731", "roborock", null],
    ["https://www.teknosa.com/apple-iphone-17-pro-1tb-abis-akilli-telefon-p-100000058788", "TEKNOSA", "100000058788", "apple", null],
    ["https://www.teknosa.com/qromax-2-kamerali-set-arac-yuz-har-algilayan-gece-goruslu-36ir-led-5mp-sony-lensli-1080p-dome-guvenlik-kamerasi-seti-d136b-114-02-p-781351509", "TEKNOSA", "781351509", "qromax", "D136B-114-02"],
    ["amazon.com.tr/gp/aw/d/B0GPD3SJQW?pd_rd_plhdr=t&qid=1795066409&i=aps", "AMAZON_TR", "B0GPD3SJQW", null, null],
    ["https://www.amazon.com.tr/Coverzone-HX-22-Kablosuz-G%C3%B6r%C3%BCn%C3%BCml%C3%BC-Dayan%C4%B1kl%C4%B1/dp/B0HP1HL9Y5?ref_=Oct_d_onr_d_13709880031_4&th=1", "AMAZON_TR", "B0HP1HL9Y5", "coverzone", null],
    ["https://www.amazon.com.tr/TP-Link-Tapo-C211-G%C3%BCvenli%C4%9Fi-Kameras%C4%B1/dp/B0CHFG8XBZ/ref=zg_bs_g_electronics_d_sccl_26/703-0835105-6584669?th=1", "AMAZON_TR", "B0CHFG8XBZ", "tp", null],
    ["https://www.mediamarkt.com.tr/tr/product/_apple-mjrr4tua-iphone-18-pro-256-gb-akilli-telefon-bordo-1256758.html", "MEDIAMARKT", "1256758", "apple", "MJRR4TUA"],
    ["https://www.mediamarkt.com.tr/tr/product/_apple-35-w-cift-usb-c-baglanti-noktali-guc-adaptoru-1236495.html", "MEDIAMARKT", "1236495", "apple", null],
  ] as const)("%s", (link, platform, productExternalId, brand, modelCode) => {
    expect(reading(link)).toMatchObject({ platform, productExternalId, brand, modelCode });
  });
});
