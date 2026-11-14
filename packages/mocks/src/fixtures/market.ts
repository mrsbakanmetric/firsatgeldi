// Market fixtures: platforms, return rules, sellers and offers (database.md §6).
// Kept on the mock "server side" only; responses are shaped through the
// contract views, so cheaper sellers stay hidden until "Göster".
// Values from the design "1 Ara ve Ekle" (ConfirmPanel, Cases): price paid
// 28.999 TL at "Kamera Dünyası · Hepsiburada"; cheapest 25.997 TL (kargo 0 TL,
// 2 gün); 2nd 27.199 TL (kargo 50 TL, 3 gün, az stok); last return day = order + 2 + 14.
// Cheaper-seller names are invented for the mock and never appear in a design.
import { uuidFor } from "../ids";
import { PRODUCTS, type ProductKey } from "./catalog";

export interface PlatformFixture {
  readonly key: string;
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly domain: string;
  readonly returnRule: { days: number; startType: "ORDER" | "DELIVERY"; avgDeliveryDays: number | null; sourceState: "AUTO" | "LOCKED" | "DEFAULT"; policyUrl: string | null };
}

function platform(code: string, name: string, domain: string, returnRule: PlatformFixture["returnRule"]): PlatformFixture {
  return { key: code, id: uuidFor(`platform:${code}`), code, name, domain, returnRule };
}

/** Launch stores [DECIDED 2026-11-13] (implementation_plan.md Appendix A). Return rules are sample values. */
export const PLATFORMS = {
  HEPSIBURADA: platform("HEPSIBURADA", "Hepsiburada", "hepsiburada.com", {
    days: 14, startType: "DELIVERY", avgDeliveryDays: 2, sourceState: "AUTO", policyUrl: "https://www.hepsiburada.com/iade-kosullari",
  }),
  TRENDYOL: platform("TRENDYOL", "Trendyol", "trendyol.com", {
    days: 15, startType: "DELIVERY", avgDeliveryDays: 3, sourceState: "AUTO", policyUrl: "https://www.trendyol.com/iade-kosullari",
  }),
  AMAZON_TR: platform("AMAZON_TR", "Amazon TR", "amazon.com.tr", {
    days: 30, startType: "DELIVERY", avgDeliveryDays: 2, sourceState: "LOCKED", policyUrl: "https://www.amazon.com.tr/iade",
  }),
  MEDIAMARKT: platform("MEDIAMARKT", "MediaMarkt", "mediamarkt.com.tr", {
    days: 14, startType: "DELIVERY", avgDeliveryDays: null, sourceState: "DEFAULT", policyUrl: null,
  }),
  TEKNOSA: platform("TEKNOSA", "Teknosa", "teknosa.com", {
    days: 14, startType: "DELIVERY", avgDeliveryDays: 3, sourceState: "AUTO", policyUrl: "https://www.teknosa.com/iade",
  }),
} as const satisfies Record<string, PlatformFixture>;

export type PlatformKey = keyof typeof PLATFORMS;
export const PLATFORM_LIST: readonly PlatformFixture[] = Object.values(PLATFORMS);

export interface SellerFixture {
  readonly id: string;
  readonly platform: PlatformKey;
  readonly externalId: string;
  readonly name: string;
  readonly rating: number | null;
  readonly ratingCount: number | null;
  /** `seller_trust` (database.md, computed daily): verdict + reason key; INSUFFICIENT falls back to the store rating. */
  readonly trust: { readonly verdict: "GOOD" | "CAUTION" | "INSUFFICIENT"; readonly reasonKey: string | null };
}

const INSUFFICIENT = { verdict: "INSUFFICIENT", reasonKey: null } as const;

function seller(
  platformKey: PlatformKey,
  externalId: string,
  name: string,
  rating: number | null,
  ratingCount: number | null,
  trust: SellerFixture["trust"] = INSUFFICIENT,
): SellerFixture {
  return { id: uuidFor(`seller:${platformKey}:${externalId}`), platform: platformKey, externalId, name, rating, ratingCount, trust };
}

export const SELLERS = {
  // The user's own seller in the design.
  kameraDunyasi: seller("HEPSIBURADA", "HB-SLR-48213", "Kamera Dünyası", 4.7, 2140),
  // Design case J "karışık": rating 3,1 / 5, out of stock, importer warranty.
  hizliElektronik: seller("TRENDYOL", "TY-SLR-77102", "Hızlı Elektronik Dünyası", 3.1, 87),
  // Hidden cheaper sellers (mock-only names).
  aksiyonMarket: seller("TRENDYOL", "TY-SLR-90311", "Aksiyon Market", 4.8, 5320),
  lensDeposu: seller("AMAZON_TR", "AMZ-SLR-A1Q9", "Lens Deposu", 4.5, 911),
  teknikDukkan: seller("MEDIAMARKT", "MM-SLR-0042", "Teknik Dükkan", 4.2, 310, { verdict: "GOOD", reasonKey: "trust.reason.consistent" }),
  // Trust cases for the rating tile (modules.md seller trust indicator): caution with a reason; no data at all.
  fotoPazari: seller("TEKNOSA", "TK-SLR-3307", "Foto Pazarı", 4.4, 640, { verdict: "CAUTION", reasonKey: "trust.reason.stockOutOften" }),
  yeniDukkan: seller("TEKNOSA", "TK-SLR-9001", "Yeni Kamera Dükkanı", null, null),
  // Tracked Items rows (design "4 Takip Ettiklerim"): the other products' sellers (mock-only names).
  modaDeposu: seller("TRENDYOL", "TY-SLR-40518", "Moda Deposu", 4.6, 1204),
  evTeknik: seller("HEPSIBURADA", "HB-SLR-66120", "Ev Teknik", 4.5, 830),
  teknosaMagaza: seller("TEKNOSA", "TK-SLR-0001", "Teknosa", 4.6, 15400),
  sesDunyasi: seller("AMAZON_TR", "AMZ-SLR-S7K2", "Ses Dünyası", 4.7, 2210),
  kulaklikPazari: seller("HEPSIBURADA", "HB-SLR-71844", "Kulaklık Pazarı", 4.3, 415),
} as const satisfies Record<string, SellerFixture>;

export type SellerKey = keyof typeof SELLERS;

export interface OfferFixture {
  readonly id: string;
  readonly product: ProductKey;
  readonly seller: SellerKey;
  /** Kuruş. */
  readonly priceMinor: number;
  readonly previousPriceMinor: number | null;
  readonly claimedOldPriceMinor: number | null;
  /** null = unknown → "kargo hariç". */
  readonly shippingMinor: number | null;
  readonly deliveryDays: { min: number; max: number } | null;
  readonly stockState: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  readonly warrantyType: "DISTRIBUTOR" | "IMPORTER" | "UNKNOWN";
  /** Times relative to "now" (implementation_plan.md §5 rule 6). */
  readonly stockSinceDaysAgo: number;
  readonly priceSinceDaysAgo: number;
  readonly checkedMinutesAgo: number;
  readonly listingPath: string;
}

function offer(productKey: ProductKey, sellerKey: SellerKey, values: Omit<OfferFixture, "id" | "product" | "seller">): OfferFixture {
  return { id: uuidFor(`offer:${productKey}:${sellerKey}`), product: productKey, seller: sellerKey, ...values };
}

export const OFFERS: readonly OfferFixture[] = [
  offer("acePro2FlashPrint", "kameraDunyasi", {
    priceMinor: 2_899_900, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 1, max: 2 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 12, priceSinceDaysAgo: 9, checkedMinutesAgo: 6,
    listingPath: "/insta360-ace-pro-2-flash-print-bundle-p-HBC00007K2P9",
  }),
  offer("acePro2FlashPrint", "aksiyonMarket", {
    priceMinor: 2_599_700, previousPriceMinor: 2_799_900, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 2, max: 2 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 3, priceSinceDaysAgo: 1, checkedMinutesAgo: 4,
    listingPath: "/insta360/ace-pro-2-flash-print-p-871233019",
  }),
  offer("acePro2FlashPrint", "lensDeposu", {
    priceMinor: 2_719_900, previousPriceMinor: 2_849_900, claimedOldPriceMinor: 3_499_900, shippingMinor: 5_000, deliveryDays: { min: 3, max: 3 },
    stockState: "LOW_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 1, priceSinceDaysAgo: 2, checkedMinutesAgo: 4,
    listingPath: "/dp/B0DACEPRO2FP",
  }),
  offer("acePro2FlashPrint", "teknikDukkan", {
    priceMinor: 2_949_900, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: null, deliveryDays: null,
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 20, priceSinceDaysAgo: 20, checkedMinutesAgo: 35,
    listingPath: "/tr-tr/product/_insta360-ace-pro-2-flash-print-1243321.html",
  }),
  offer("acePro2FlashPrint", "hizliElektronik", {
    priceMinor: 3_025_000, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: 4_900, deliveryDays: { min: 4, max: 6 },
    stockState: "OUT_OF_STOCK", warrantyType: "IMPORTER", stockSinceDaysAgo: 2, priceSinceDaysAgo: 15, checkedMinutesAgo: 50,
    listingPath: "/hizli-elektronik/insta360-ace-pro-2-p-55012998",
  }),
  // Trust cases (not cheaper than the price paid, so they never enter the teaser).
  offer("acePro2FlashPrint", "fotoPazari", {
    priceMinor: 2_999_000, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 2, max: 3 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 5, priceSinceDaysAgo: 5, checkedMinutesAgo: 20,
    listingPath: "/foto-pazari/insta360-ace-pro-2-flash-print",
  }),
  offer("acePro2FlashPrint", "yeniDukkan", {
    priceMinor: 3_049_000, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: null, deliveryDays: null,
    stockState: "IN_STOCK", warrantyType: "UNKNOWN", stockSinceDaysAgo: 1, priceSinceDaysAgo: 1, checkedMinutesAgo: 15,
    listingPath: "/yeni-kamera-dukkani/insta360-ace-pro-2",
  }),
  // Tracked Items rows (design "4 Takip Ettiklerim"): coat 2.999 TL < paid 3.299 TL; vacuum: nothing
  // cheaper than the paid 30.999 TL (next 31.499 TL); earbuds: cheapest 8.150 TL against a 7.500 TL target.
  offer("winterCoat", "modaDeposu", {
    priceMinor: 299_900, previousPriceMinor: 329_900, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 2, max: 3 },
    stockState: "IN_STOCK", warrantyType: "UNKNOWN", stockSinceDaysAgo: 14, priceSinceDaysAgo: 1, checkedMinutesAgo: 12,
    listingPath: "/moda-deposu/kapusonlu-kislik-mont-p-60411872",
  }),
  offer("dysonV15", "teknosaMagaza", {
    priceMinor: 3_099_900, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 1, max: 2 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 14, priceSinceDaysAgo: 11, checkedMinutesAgo: 6,
    listingPath: "/dyson-v15-detect-absolute-p-125023",
  }),
  offer("dysonV15", "evTeknik", {
    priceMinor: 3_149_900, previousPriceMinor: 3_199_900, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 2, max: 2 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 14, priceSinceDaysAgo: 9, checkedMinutesAgo: 6,
    listingPath: "/ev-teknik/dyson-v15-detect-absolute-p-HBC0000DV15",
  }),
  offer("airPodsPro2", "sesDunyasi", {
    priceMinor: 815_000, previousPriceMinor: 829_900, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 1, max: 2 },
    stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 3, priceSinceDaysAgo: 3, checkedMinutesAgo: 9,
    listingPath: "/dp/B0DAIRPODSP2",
  }),
  offer("airPodsPro2", "kulaklikPazari", {
    priceMinor: 839_900, previousPriceMinor: null, claimedOldPriceMinor: null, shippingMinor: 0, deliveryDays: { min: 2, max: 3 },
    stockState: "LOW_STOCK", warrantyType: "DISTRIBUTOR", stockSinceDaysAgo: 2, priceSinceDaysAgo: 6, checkedMinutesAgo: 9,
    listingPath: "/kulaklik-pazari/apple-airpods-pro-2-p-HBC0000AP2",
  }),
];

export function listingUrl(offerFixture: OfferFixture): string {
  const sellerFixture = SELLERS[offerFixture.seller];
  return `https://www.${PLATFORMS[sellerFixture.platform].domain}${offerFixture.listingPath}`;
}

export function offersFor(productKey: ProductKey): readonly OfferFixture[] {
  return OFFERS.filter((item) => item.product === productKey);
}

/** Product of a pasted store link (design case A: a Hepsiburada link to the Flash Print Bundle). */
export function offerByListingUrl(url: string): OfferFixture | undefined {
  return OFFERS.find((item) => url.startsWith(listingUrl(item)));
}

export function productKeyOf(id: string): ProductKey | undefined {
  return (Object.keys(PRODUCTS) as ProductKey[]).find((key) => PRODUCTS[key].id === id);
}
