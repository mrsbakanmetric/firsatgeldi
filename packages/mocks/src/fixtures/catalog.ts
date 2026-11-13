// Catalogue fixtures from the approved design "1 Ara ve Ekle"
// (design/01-ara-ve-ekle: AutoComplete catalogue, Main candidates, Cases).
// No real store data and no store images: images are neutral placeholders.
import { sha256For, uuidFor } from "../ids";
import { type Localized, text } from "./text";

export interface CategoryFixture {
  readonly id: string;
  readonly name: Localized;
  /** No right of withdrawal (e.g. phones) → price-difference request instead of a return. */
  readonly noWithdrawalRight: boolean;
  /** Category not supported yet (design case H). */
  readonly supported: boolean;
}

function category(key: string, name: Localized, flags: Partial<Pick<CategoryFixture, "noWithdrawalRight" | "supported">> = {}): CategoryFixture {
  return { id: uuidFor(`category:${key}`), name, noWithdrawalRight: flags.noWithdrawalRight ?? false, supported: flags.supported ?? true };
}

export const CATEGORIES = {
  actionCamera: category("action-camera", text("Aksiyon kamerası", "Action camera")),
  camera360: category("360-camera", text("360 derece kamera", "360-degree camera")),
  handheldCamera: category("handheld-camera", text("El kamerası", "Handheld camera")),
  vlogCamera: category("vlog-camera", text("Vlog kamerası", "Vlog camera")),
  mirrorless: category("mirrorless", text("Aynasız fotoğraf makinesi", "Mirrorless camera")),
  compact: category("compact", text("Kompakt fotoğraf makinesi", "Compact camera")),
  stickVacuum: category("stick-vacuum", text("Kablosuz süpürge", "Cordless vacuum")),
  earbuds: category("earbuds", text("Kulak içi kulaklık", "In-ear headphones")),
  coat: category("coat", text("Mont", "Coat")),
  accessory: category("camera-accessory", text("Kamera aksesuarı", "Camera accessory")),
} as const;

/** Attribute labels (category template translations, architecture.md §19). */
export const ATTRIBUTE_LABELS: Readonly<Record<string, Localized>> = {
  type: text("Tür", "Type"),
  brand: text("Marka", "Brand"),
  model: text("Model", "Model"),
  generation: text("Nesil", "Generation"),
  bundle: text("Paket", "Bundle"),
  color: text("Renk", "Colour"),
};

export interface ProductFixture {
  readonly key: string;
  readonly id: string;
  readonly slug: string;
  readonly name: Localized;
  readonly category: CategoryFixture;
  readonly brand: string | null;
  readonly model: string | null;
  /** Product family: same brand + model + generation, different bundle/variant. */
  readonly family: string;
  readonly generation: Localized | null;
  readonly bundle: Localized | null;
  readonly colors: readonly Localized[];
  readonly familyBundles: readonly Localized[];
  readonly storeCount: number;
  readonly imageSha256: string;
  /** Brand or model code known (otherwise tracked only at the user's seller, design case H). */
  readonly hasBrandCode: boolean;
  readonly searchTerms: Localized;
}

interface ProductInput {
  name: Localized;
  category: CategoryFixture;
  brand: string | null;
  model: string | null;
  family: string;
  generation?: Localized;
  bundle?: Localized;
  colors: Localized[];
  familyBundles?: Localized[];
  storeCount: number;
  hasBrandCode?: boolean;
}

function product(key: string, input: ProductInput): ProductFixture {
  const terms = (locale: "tr" | "en") =>
    [input.name[locale], input.category.name[locale], input.brand ?? "", input.bundle?.[locale] ?? ""].join(" ");
  return {
    key,
    id: uuidFor(`product:${key}`),
    slug: key,
    name: input.name,
    category: input.category,
    brand: input.brand,
    model: input.model,
    family: input.family,
    generation: input.generation ?? null,
    bundle: input.bundle ?? null,
    colors: input.colors,
    familyBundles: input.familyBundles ?? (input.bundle ? [input.bundle] : []),
    storeCount: input.storeCount,
    imageSha256: sha256For(key),
    hasBrandCode: input.hasBrandCode ?? true,
    searchTerms: text(terms("tr"), terms("en")),
  };
}

const black = text("Siyah", "Black");
const white = text("Beyaz", "White");
const gen = (n: number) => text(`${n}. nesil`, `Gen ${n}`);
const standard = text("Standart paket", "Standard bundle");
const flashPrint = text("Flash Print Bundle", "Flash Print Bundle");
const creator = text("Kreatör paketi", "Creator bundle");
const acePro2Bundles = [standard, flashPrint, creator];

export const PRODUCTS = {
  acePro2Standard: product("insta360-ace-pro-2", {
    name: text("Insta360 Ace Pro 2", "Insta360 Ace Pro 2"), category: CATEGORIES.actionCamera, brand: "Insta360", model: "Ace Pro 2",
    family: "insta360-ace-pro-2", generation: gen(2), bundle: standard, colors: [black], familyBundles: acePro2Bundles, storeCount: 9,
  }),
  acePro2FlashPrint: product("insta360-ace-pro-2-flash-print", {
    name: text("Insta360 Ace Pro 2 Flash Print Bundle", "Insta360 Ace Pro 2 Flash Print Bundle"), category: CATEGORIES.actionCamera,
    brand: "Insta360", model: "Ace Pro 2", family: "insta360-ace-pro-2", generation: gen(2), bundle: flashPrint, colors: [black],
    familyBundles: acePro2Bundles, storeCount: 7,
  }),
  acePro2Creator: product("insta360-ace-pro-2-creator", {
    name: text("Insta360 Ace Pro 2 Kreatör paketi", "Insta360 Ace Pro 2 Creator bundle"), category: CATEGORIES.actionCamera,
    brand: "Insta360", model: "Ace Pro 2", family: "insta360-ace-pro-2", generation: gen(2), bundle: creator, colors: [black],
    familyBundles: acePro2Bundles, storeCount: 4,
  }),
  acePro: product("insta360-ace-pro", {
    name: text("Insta360 Ace Pro", "Insta360 Ace Pro"), category: CATEGORIES.actionCamera, brand: "Insta360", model: "Ace Pro",
    family: "insta360-ace-pro", generation: gen(1), bundle: standard, colors: [black], storeCount: 5,
  }),
  acePro2DiveCase: product("insta360-ace-pro-2-dive-case", {
    name: text("Insta360 Ace Pro 2 dalış kabı", "Insta360 Ace Pro 2 dive case"), category: CATEGORIES.accessory, brand: "Insta360",
    model: "Ace Pro 2 Dive Case", family: "insta360-ace-pro-2-dive-case", colors: [black], storeCount: 6,
  }),
  x4: product("insta360-x4", {
    name: text("Insta360 X4", "Insta360 X4"), category: CATEGORIES.camera360, brand: "Insta360", model: "X4", family: "insta360-x4",
    generation: gen(4), colors: [black], familyBundles: [text("Standart", "Standard"), text("Essentials", "Essentials")], storeCount: 11,
  }),
  goProHero13: product("gopro-hero-13-black", {
    name: text("GoPro Hero 13 Black", "GoPro Hero 13 Black"), category: CATEGORIES.actionCamera, brand: "GoPro", model: "Hero 13 Black",
    family: "gopro-hero-13", generation: gen(13), colors: [black], familyBundles: [text("Standart", "Standard"), text("Creator", "Creator")], storeCount: 12,
  }),
  goProHero12: product("gopro-hero-12-black", {
    name: text("GoPro Hero 12 Black", "GoPro Hero 12 Black"), category: CATEGORIES.actionCamera, brand: "GoPro", model: "Hero 12 Black",
    family: "gopro-hero-12", generation: gen(12), colors: [black], storeCount: 8,
  }),
  osmoAction5Pro: product("dji-osmo-action-5-pro", {
    name: text("DJI Osmo Action 5 Pro", "DJI Osmo Action 5 Pro"), category: CATEGORIES.actionCamera, brand: "DJI", model: "Osmo Action 5 Pro",
    family: "dji-osmo-action-5", generation: gen(5), colors: [black], familyBundles: [text("Standart", "Standard"), text("Adventure", "Adventure")], storeCount: 10,
  }),
  osmoPocket3: product("dji-osmo-pocket-3", {
    name: text("DJI Osmo Pocket 3", "DJI Osmo Pocket 3"), category: CATEGORIES.handheldCamera, brand: "DJI", model: "Osmo Pocket 3",
    family: "dji-osmo-pocket-3", generation: gen(3), colors: [text("Gri", "Grey")], storeCount: 13,
  }),
  zvE10II: product("sony-zv-e10-ii", {
    name: text("Sony ZV-E10 II", "Sony ZV-E10 II"), category: CATEGORIES.vlogCamera, brand: "Sony", model: "ZV-E10 II", family: "sony-zv-e10",
    generation: gen(2), colors: [black, white], familyBundles: [text("Gövde", "Body"), text("16-50 kit", "16-50 kit")], storeCount: 6,
  }),
  zv1II: product("sony-zv-1-ii", {
    name: text("Sony ZV-1 II", "Sony ZV-1 II"), category: CATEGORIES.vlogCamera, brand: "Sony", model: "ZV-1 II", family: "sony-zv-1",
    generation: gen(2), colors: [black, white], storeCount: 4,
  }),
  eosR50: product("canon-eos-r50", {
    name: text("Canon EOS R50", "Canon EOS R50"), category: CATEGORIES.mirrorless, brand: "Canon", model: "EOS R50", family: "canon-eos-r50",
    colors: [black, white], familyBundles: [text("Gövde", "Body"), text("18-45 kit", "18-45 kit")], storeCount: 9,
  }),
  x100vi: product("fujifilm-x100vi", {
    name: text("Fujifilm X100VI", "Fujifilm X100VI"), category: CATEGORIES.compact, brand: "Fujifilm", model: "X100VI", family: "fujifilm-x100",
    generation: gen(6), colors: [text("Gümüş", "Silver"), black], storeCount: 3,
  }),
  dysonV15: product("dyson-v15-detect-absolute", {
    name: text("Dyson V15 Detect Absolute", "Dyson V15 Detect Absolute"), category: CATEGORIES.stickVacuum, brand: "Dyson", model: "V15 Detect",
    family: "dyson-v15", bundle: text("Absolute", "Absolute"), colors: [text("Sarı", "Yellow")], storeCount: 8,
  }),
  airPodsPro2: product("apple-airpods-pro-2", {
    name: text("Apple AirPods Pro 2", "Apple AirPods Pro 2"), category: CATEGORIES.earbuds, brand: "Apple", model: "AirPods Pro 2",
    family: "apple-airpods-pro-2", generation: gen(2), bundle: text("USB-C", "USB-C"), colors: [white], storeCount: 15,
  }),
  // Long text for layout tests (implementation_plan.md §5 rule 3); no brand code (design case H).
  winterCoat: product("kapusonlu-kislik-mont", {
    name: text(
      "Kapüşonlu su geçirmez kışlık mont, uzun kesim, çıkarılabilir iç astarlı",
      "Hooded waterproof winter coat, long cut, with removable inner lining",
    ),
    category: CATEGORIES.coat, brand: null, model: null, family: "kapusonlu-kislik-mont", colors: [black, text("Haki", "Khaki")],
    storeCount: 3, hasBrandCode: false,
  }),
} as const satisfies Record<string, ProductFixture>;

export type ProductKey = keyof typeof PRODUCTS;
export const PRODUCT_LIST: readonly ProductFixture[] = Object.values(PRODUCTS);

/** "Benzer ama farklı" for the Ace Pro 2 family (design: 4 items — other generation, other bundle, accessory). */
export const SIMILAR: Readonly<Record<string, readonly { key: ProductKey; difference: "GENERATION" | "BUNDLE" | "VARIANT" | "ACCESSORY" }[]>> = {
  "insta360-ace-pro-2": [
    { key: "acePro", difference: "GENERATION" },
    { key: "acePro2Standard", difference: "BUNDLE" },
    { key: "acePro2Creator", difference: "BUNDLE" },
    { key: "acePro2DiveCase", difference: "ACCESSORY" },
  ],
};

/** Want-to-buy hints from the seller-less cheapest history (design case E): 24.900 TL / 23.999 TL. */
export const TARGET_HINTS_MINOR: Readonly<Partial<Record<ProductKey, { lowest30Days: number; lowest6Months: number }>>> = {
  acePro2FlashPrint: { lowest30Days: 2_490_000, lowest6Months: 2_399_900 },
};

/** "Bunu mu demek istedin" corrections drawn in the design (AutoComplete: ac → ace, gopr → gopro, dyso → dyson, kamra → kamera). */
export const SPELLING_FIXES: Readonly<Record<string, string>> = { ac: "ace", gopr: "gopro", dyso: "dyson", kamra: "kamera" };
