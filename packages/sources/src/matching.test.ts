import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pathTwoQuery, readGoogleShopping, type ShoppingOffer } from "./google-shopping.ts";
import { type LinkTextReading, readLinkText } from "./link-text.ts";
import { readAttributes } from "./attributes.ts";
import { fold, keyNameWords, matchProduct, normaliseWords, type ProductMatch } from "./matching.ts";
import { cacheKey } from "./serpapi.ts";

function reading(link: string): LinkTextReading {
  const result = readLinkText(link);
  if (!result.ok) throw new Error(`${link}: ${result.reason}`);
  return result.reading;
}

function offer(title: string, extra: Partial<ShoppingOffer> = {}): ShoppingOffer {
  return {
    position: null,
    title,
    source: null,
    price: null,
    priceText: "₺1.000,00",
    condition: null,
    oldPrice: null,
    rating: null,
    reviews: null,
    delivery: null,
    link: null,
    thumbnail: null,
    ...extra,
  };
}

const IPHONE_18 = reading("https://www.trendyol.com/apple/iphone-18-pro-256gb-glacier-p-1198082317");
const WATCH_SE_3 = reading("https://www.trendyol.com/apple/watch-se-3-gps-40mm-yildiz-isigi-aluminyum-kasa-ve-kum-beji-spor-kordon-s-m-p-1198475514");
const AIRPODS_4 = reading("https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954");

const dropReason = (match: ProductMatch, index = 0) => match.dropped.find((dropped) => dropped.index === index)?.reason ?? null;

describe("normalising", () => {
  it("folds Turkish letters, drops punctuation and the part-number suffix", () => {
    expect(fold("İPHONE Işığı Güç Çift Şarj Öne")).toBe("iphone isigi guc cift sarj one");
    expect(normaliseWords("Apple Airpods 4. Nesil (MXP63TU/A)")).toEqual(["apple", "airpods", "4", "nesil", "mxp63tu"]);
  });

  it("joins numbers with units and two-word names, and reads English colours as Turkish", () => {
    expect(normaliseWords("iPhone 15 128 Gb Siyah, 44 mm, 35 W")).toEqual(["iphone", "15", "128gb", "siyah", "44mm", "35w"]);
    expect(normaliseWords("Gece Yarısı · Yıldız Işığı · Starlight · Black · Açık Kutu")).toEqual(["geceyarisi", "yildizisigi", "yildizisigi", "siyah", "acikkutu"]);
    expect(normaliseWords("36.000 Pa, 2'li, 43'' TV")).toEqual(["36000", "pa", "2li", "43", "tv"]);
  });
});

describe("path 2 search text", () => {
  it("keeps the name words that identify the product and drops the brand and generic words", () => {
    const tcl = reading("https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537");
    expect(keyNameWords(tcl)).toEqual(["75", "190", "4k", "ultra", "hd", "smart", "qled", "google", "tv"]);
    const mediaMarkt = reading("https://www.mediamarkt.com.tr/tr/product/_apple-mjrr4tua-iphone-18-pro-256-gb-akilli-telefon-bordo-1256758.html");
    expect(keyNameWords(mediaMarkt)).toEqual(["iphone", "18", "pro", "256", "gb", "bordo"]);
  });
});

describe("hard filters", () => {
  it.each([
    ["Apple iPhone 18 Pro a € 1.299", "NOT_TURKISH"],
    ["Кроссовки Apple iPhone 18 Pro", "NOT_TURKISH"],
    ["Apple iPhone 18 Pro con cassa", "NOT_TURKISH"],
    ["Apple iPhone 18 Pro (Teşhir)", "NOT_NEW"],
    ["Apple Yenilenmiş iPhone 18 Pro", "NOT_NEW"],
    ["Apple iPhone 18 Pro Açık Kutu", "NOT_NEW"],
    ["Apple iPhone 18 Pro Uyumlu Kılıf", "ACCESSORY"],
    ["Apple iPhone 18 Pro 2'li Paket", "PACK"],
    ["iPhone 18 Pro", "BRAND"],
    ["Apple iPhone 17 Pro", "GENERATION"],
    ["Apple iPhone 18 Pro Max", "GENERATION"],
  ] as const)("%s → %s", (title, reason) => {
    expect(dropReason(matchProduct(IPHONE_18, [offer(title)]))).toBe(reason);
  });

  it("drops a price that is not in TL and an offer Google labels used", () => {
    expect(dropReason(matchProduct(IPHONE_18, [offer("Apple iPhone 18 Pro", { priceText: "€1.299" })]))).toBe("NOT_TURKISH");
    expect(dropReason(matchProduct(IPHONE_18, [offer("Apple iPhone 18 Pro", { condition: "yenilenmiş" })]))).toBe("NOT_NEW");
  });

  it("drops another model code, keeps the same code with or without its suffix", () => {
    expect(dropReason(matchProduct(AIRPODS_4, [offer("Apple AirPods 4 (Mxp93tu/A)")]))).toBe("MODEL_CODE");
    expect(matchProduct(AIRPODS_4, [offer("Apple AirPods 4 MXP63TU/A")]).dropped).toEqual([]);
    expect(matchProduct(AIRPODS_4, [offer("Apple AirPods 4")]).dropped).toEqual([]);
  });

  it("drops another generation, also when the title glues it ('SE2', 'SE 2022', '2nd Gen')", () => {
    for (const title of ["Apple Watch SE 2 GPS 40mm", "Apple Watch SE2 40mm", "Apple Watch SE 2022", "Apple Watch SE (2nd Gen) 40 mm"]) {
      expect(dropReason(matchProduct(WATCH_SE_3, [offer(title)]))).toBe("GENERATION");
    }
    const roborock = reading("https://www.hepsiburada.com/roborock-s8-pro-akilli-robot-supurge-beyaz-p-HBCV00008MAIV2");
    expect(dropReason(matchProduct(roborock, [offer("Roborock S7 Robot Süpürge")]))).toBe("GENERATION");
    expect(dropReason(matchProduct(roborock, [offer("Roborock S8 Sonic Robot Süpürge")]))).toBe("GENERATION");
  });
});

describe("confidence", () => {
  it("proposes one offer when it names the product and its variant details agree", () => {
    const match = matchProduct(WATCH_SE_3, [offer("Apple Watch SE GPS 40mm"), offer("Apple Watch Se3 40Mm Starlight"), offer("Apple Watch SE 3 GPS 44mm")]);
    expect(match.confidence).toBe("HIGH");
    if (match.confidence === "HIGH") expect(match.proposed.index).toBe(1);
  });

  it("returns the closest three when no offer is sure: another size or colour is not proposed", () => {
    const match = matchProduct(WATCH_SE_3, [
      offer("Apple Watch SE 3 GPS 44mm"),
      offer("Apple Watch SE 3 40mm Gece Yarısı"),
      offer("Apple Watch SE GPS 40mm"),
      offer("Apple Watch SE GPS Alüminyum Kasa"),
    ]);
    expect(match.confidence).toBe("LOW");
    if (match.confidence === "LOW") expect(match.closest).toHaveLength(3);
  });

  it("is LOW with nothing to choose from when every offer is dropped", () => {
    const match = matchProduct(IPHONE_18, [offer("Apple iPhone 17 Pro"), offer("Apple iPhone 18 Pro Max")]);
    expect(match).toMatchObject({ confidence: "LOW", closest: [], ranked: [] });
  });

  it("shows each product once in the closest three: the same normalised title from another store is skipped", () => {
    const match = matchProduct(WATCH_SE_3, [
      offer("Apple Watch SE GPS 40mm Alüminyum Kasa"),
      offer("APPLE watch se gps 40 mm aluminyum kasa"),
      offer("Apple Watch SE GPS 40mm"),
      offer("Apple Watch SE GPS"),
    ]);
    expect(match.confidence).toBe("LOW");
    if (match.confidence !== "LOW") return;
    expect(match.closest.map((scored) => scored.index)).toEqual([0, 2, 3]);
    expect(match.ranked).toHaveLength(4);
  });
});

// ── The 17 saved answers of the data test (2026-11-19) ──────────────────────────────
// No SerpApi call: each answer is read from recordings/serpapi by the search text it was
// saved under (the round 1 text — brand + model code alone for links with a model code).
// `correct` lists every offer that is the linked product, checked by hand on the titles:
// same model and generation, new, single item, and the same storage, size and colour
// where the title states them (a title without them counts, as in report §2). Offers
// whose title lacks the brand still count as correct here; the brand filter drops them.

type Outcome =
  /** One offer proposed, and it is the linked product. */
  | "HIGH_CORRECT"
  /** One offer proposed, and it is another product. */
  | "HIGH_WRONG"
  /** Closest three, and the linked product is among them. */
  | "LOW_IN_CLOSEST"
  /** Closest three without the linked product, although the answer has it. */
  | "LOW_MISSED"
  /** The answer does not have the linked product at all. */
  | "LOW_NOT_IN_ANSWER";

function outcomeOf(match: ProductMatch, correct: readonly number[]): Outcome {
  if (match.confidence === "HIGH") return correct.includes(match.proposed.index) ? "HIGH_CORRECT" : "HIGH_WRONG";
  if (match.closest.some((scored) => correct.includes(scored.index))) return "LOW_IN_CLOSEST";
  return correct.length > 0 ? "LOW_MISSED" : "LOW_NOT_IN_ANSWER";
}

/** Link 19's full URL was not kept; this is what path 1 read from it (report §2). */
const LENOVO_READING: LinkTextReading = {
  path: "LINK_TEXT",
  platform: "MEDIAMARKT",
  productExternalId: "",
  url: "",
  brand: "lenovo",
  brandFromStore: false,
  nameWords: ["lenovo", "yoga", "slim", "7", "aura", "laptop"],
  modelCode: "226V16GB",
  sellerExternalId: null,
  searchText: "",
  attributes: readAttributes(["yoga", "slim", "7", "aura", "laptop"], ["lenovo"]),
};

interface SavedCase {
  /** Link number in data_test_report.md §2. */
  readonly no: number;
  readonly link: string | LinkTextReading;
  readonly savedQuery: string;
  readonly correct: readonly number[];
  readonly expected: Outcome;
}

const SAVED_CASES: readonly SavedCase[] = [
  { no: 1, link: "https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415", savedQuery: "asics 1042A237-101", correct: [0], expected: "HIGH_CORRECT" },
  { no: 2, link: "https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537", savedQuery: "tcl 75T8C", correct: [], expected: "LOW_NOT_IN_ANSWER" },
  { no: 3, link: "https://www.trendyol.com/apple/iphone-18-pro-256gb-glacier-p-1198082317", savedQuery: "apple iphone 18 pro 256gb glacier", correct: [0], expected: "HIGH_CORRECT" },
  { no: 4, link: "https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954", savedQuery: "apple MXP63TU", correct: [29, 39], expected: "HIGH_CORRECT" },
  {
    no: 5,
    link: "https://www.trendyol.com/apple/watch-se-3-gps-40mm-yildiz-isigi-aluminyum-kasa-ve-kum-beji-spor-kordon-s-m-p-1198475514",
    savedQuery: "apple watch se 3 gps 40mm yildiz isigi aluminyum kasa ve kum beji spor kordon s m",
    correct: [6, 11, 17, 23, 24, 25],
    expected: "HIGH_CORRECT",
  },
  { no: 7, link: "https://www.hepsiburada.com/roborock-s8-pro-akilli-robot-supurge-beyaz-p-HBCV00008MAIV2", savedQuery: "roborock s8 pro akilli robot supurge beyaz", correct: [29, 30, 35], expected: "HIGH_CORRECT" },
  { no: 8, link: "https://www.hepsiburada.com/onvo-40vq80f3fa-40-102-ekran-uydu-alicili-full-hd-whaleos-qled-tv-pm-HBC0000GM15FD", savedQuery: "onvo 40VQ80F3FA", correct: [], expected: "LOW_NOT_IN_ANSWER" },
  { no: 9, link: "https://www.hepsiburada.com/apple-iphone-15-128-gb-siyah-p-HBCV00004X9ZCH", savedQuery: "apple iphone 15 128 gb siyah", correct: [0, 4, 6, 12, 19], expected: "HIGH_CORRECT" },
  {
    no: 10,
    link: "https://www.hepsiburada.com/apple-watch-se-3-gps-44-mm-gece-yarisi-aluminyum-kasa-ve-gece-yarisi-spor-kordon-m-l-p-HBCV0000A11MSB",
    savedQuery: "apple watch se 3 gps 44 mm gece yarisi aluminyum kasa ve gece yarisi spor kordon m l",
    correct: [24, 27],
    expected: "HIGH_CORRECT",
  },
  { no: 11, link: "https://www.teknosa.com/roborock-saros-20-akilli-robot-supurge-siyah-p-787133731?shopId=teknosa", savedQuery: "roborock saros 20 akilli robot supurge siyah", correct: [31, 32, 33], expected: "HIGH_CORRECT" },
  { no: 12, link: "https://www.teknosa.com/apple-iphone-17-pro-1tb-abis-akilli-telefon-p-100000058788", savedQuery: "apple iphone 17 pro 1tb abis akilli telefon", correct: [0, 9, 10], expected: "HIGH_CORRECT" },
  {
    no: 13,
    link: "https://www.teknosa.com/qromax-2-kamerali-set-arac-yuz-har-algilayan-gece-goruslu-36ir-led-5mp-sony-lensli-1080p-dome-guvenlik-kamerasi-seti-d136b-114-02-p-781351509",
    savedQuery: "qromax D136B-114-02",
    correct: [],
    expected: "LOW_NOT_IN_ANSWER",
  },
  {
    no: 15,
    link: "https://www.amazon.com.tr/Coverzone-HX-22-Kablosuz-G%C3%B6r%C3%BCn%C3%BCml%C3%BC-Dayan%C4%B1kl%C4%B1/dp/B0HP1HL9Y5?ref_=Oct_d_onr_d_13709880031_4&th=1",
    savedQuery: "coverzone hx 22 kablosuz görünümlü dayanıklı",
    correct: [],
    expected: "LOW_NOT_IN_ANSWER",
  },
  {
    no: 16,
    link: "https://www.amazon.com.tr/TP-Link-Tapo-C211-G%C3%BCvenli%C4%9Fi-Kameras%C4%B1/dp/B0CHFG8XBZ/ref=zg_bs_g_electronics_d_sccl_26/703-0835105-6584669?th=1",
    savedQuery: "tp link tapo c211 güvenliği kamerası",
    correct: [1, 4, 7, 14, 19, 21, 22, 28, 31, 32, 33, 39],
    expected: "HIGH_CORRECT",
  },
  { no: 17, link: "https://www.mediamarkt.com.tr/tr/product/_apple-mjrr4tua-iphone-18-pro-256-gb-akilli-telefon-bordo-1256758.html", savedQuery: "apple MJRR4TUA", correct: [12, 15, 17, 19, 35], expected: "HIGH_CORRECT" },
  {
    no: 18,
    link: "https://www.mediamarkt.com.tr/tr/product/_apple-35-w-cift-usb-c-baglanti-noktali-guc-adaptoru-1236495.html",
    savedQuery: "apple 35 w cift usb c baglanti noktali guc adaptoru",
    correct: [6, 17, 20],
    expected: "HIGH_CORRECT",
  },
  { no: 19, link: LENOVO_READING, savedQuery: "lenovo 226V16GB", correct: [], expected: "LOW_NOT_IN_ANSWER" },
];

async function savedOffers(query: string): Promise<readonly ShoppingOffer[]> {
  const file = join(import.meta.dirname, "..", "recordings", "serpapi", `${cacheKey({ engine: "google_shopping", gl: "tr", hl: "tr", google_domain: "google.com.tr", q: query })}.json`);
  return readGoogleShopping(JSON.parse(await readFile(file, "utf8"))).offers;
}

async function outcomes(): Promise<ReadonlyMap<number, Outcome>> {
  const result = new Map<number, Outcome>();
  for (const saved of SAVED_CASES) {
    const linkReading = typeof saved.link === "string" ? reading(saved.link) : saved.link;
    result.set(saved.no, outcomeOf(matchProduct(linkReading, await savedOffers(saved.savedQuery)), saved.correct));
  }
  return result;
}

describe("the method on the saved answers (data test round 1)", () => {
  it.each(SAVED_CASES)("link $no → $expected", async (saved) => {
    const linkReading = typeof saved.link === "string" ? reading(saved.link) : saved.link;
    expect(outcomeOf(matchProduct(linkReading, await savedOffers(saved.savedQuery)), saved.correct)).toBe(saved.expected);
  });

  it("link 8: the two offers titled 'Onvo Ekran Uydu Alıcılı Full Hd Qled Tv' appear once in the closest results", async () => {
    const onvo = SAVED_CASES.find((saved) => saved.no === 8);
    if (!onvo || typeof onvo.link !== "string") throw new Error("link 8 missing");
    const match = matchProduct(reading(onvo.link), await savedOffers(onvo.savedQuery));
    expect(match.confidence).toBe("LOW");
    if (match.confidence !== "LOW") return;
    // Offer 1 ("Onvo 4K Ultra HD …") is kept since "Ultra HD" is no longer read as a series word.
    expect(match.ranked.map((scored) => scored.index)).toEqual([2, 23, 9, 1]);
    expect(match.closest.map((scored) => scored.index)).toEqual([2, 9, 1]);
  });

  it("never proposes a wrong product, and finds the linked product whenever the answer has it (the 16 searches of round 1)", async () => {
    const roundOne = [...(await outcomes())].filter(([no]) => no !== 1).map(([, outcome]) => outcome);
    expect(roundOne).toHaveLength(16);
    const count = (outcome: Outcome) => roundOne.filter((each) => each === outcome).length;
    expect({
      highCorrect: count("HIGH_CORRECT"),
      highWrong: count("HIGH_WRONG"),
      lowInClosest: count("LOW_IN_CLOSEST"),
      lowMissed: count("LOW_MISSED"),
      lowNotInAnswer: count("LOW_NOT_IN_ANSWER"),
    }).toEqual({ highCorrect: 11, highWrong: 0, lowInClosest: 0, lowMissed: 0, lowNotInAnswer: 5 });
  });
});

// ── The 5 answers of the new search text (2026-11-19, data_test_report.md §8) ───────
// Saved under the text `pathTwoQuery` builds today, so this also checks that the search text
// has not changed. `correct` checked by hand as above.
const NEW_TEXT_CASES: readonly { no: number; link: string; correct: readonly number[] }[] = [
  // Offer 1 (index 0) writes the code with a platform suffix: "75T8CGTV".
  { no: 2, link: "https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537", correct: [0] },
  { no: 4, link: "https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954", correct: [0, 12, 21, 34, 37] },
  { no: 8, link: "https://www.hepsiburada.com/onvo-40vq80f3fa-40-102-ekran-uydu-alicili-full-hd-whaleos-qled-tv-pm-HBC0000GM15FD", correct: [1] },
  {
    no: 13,
    link: "https://www.teknosa.com/qromax-2-kamerali-set-arac-yuz-har-algilayan-gece-goruslu-36ir-led-5mp-sony-lensli-1080p-dome-guvenlik-kamerasi-seti-d136b-114-02-p-781351509",
    correct: [1],
  },
  { no: 17, link: "https://www.mediamarkt.com.tr/tr/product/_apple-mjrr4tua-iphone-18-pro-256-gb-akilli-telefon-bordo-1256758.html", correct: [2] },
];

describe("the method on the new search text answers", () => {
  it.each(NEW_TEXT_CASES)("link $no → the right product is proposed", async ({ link, correct }) => {
    const linkReading = reading(link);
    expect(outcomeOf(matchProduct(linkReading, await savedOffers(pathTwoQuery(linkReading))), correct)).toBe("HIGH_CORRECT");
  });

  it("proposes the offer that carries the link's model code over a look-alike priced far below (link 4)", async () => {
    const airpods = reading("https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954");
    const match = matchProduct(airpods, await savedOffers(pathTwoQuery(airpods)));
    expect(match.confidence === "HIGH" && match.proposed.offer.title).toBe("Kulaklik Apple AirPods 4 Mxp63");
  });
});
