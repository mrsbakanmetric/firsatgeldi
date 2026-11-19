// Starting category list for link identification (data test, user decision 2026-11-19:
// a small list from the Google product taxonomy's electronics and clothing branches;
// product_spect.md §8.2 category templates). In Phase 2 categories and their templates come
// from the `categories` and `category_templates` tables (database.md); until then this list
// is the single place that knows them. Names are data, localised like `categories.name`.
//
// Field kinds:
//   VARIANT — tells one variant of the product from another (colour, size, storage). Read only
//             from the link: a model that "knows" a colour is guessing which variant it is.
//   FACT    — true of the product itself (headphone type, connection). May come from the
//             model's knowledge when the link does not say it; marked as such.

export type FieldKind = "VARIANT" | "FACT";

export interface LocalisedName {
  readonly tr: string;
  readonly en: string;
}

export interface CategoryField {
  readonly key: string;
  readonly kind: FieldKind;
  readonly name: LocalisedName;
  /** What the model is told the field means (English, inside the prompt only). */
  readonly hint: string;
}

export interface Category {
  readonly key: string;
  readonly name: LocalisedName;
  /** What belongs here, for the model (English, inside the prompt only). */
  readonly hint: string;
  readonly fields: readonly CategoryField[];
}

const field = (key: string, kind: FieldKind, tr: string, en: string, hint: string): CategoryField => ({ key, kind, name: { tr, en }, hint });

const COLOUR = field("colour", "VARIANT", "Renk", "Colour", "colour as written in the link");
const STORAGE = field("storage", "VARIANT", "Depolama", "Storage", "storage capacity, e.g. 256 GB");
const SCREEN = field("screen", "VARIANT", "Ekran", "Screen", "screen size, e.g. 65 inch");
const GENDER = field("gender", "VARIANT", "Cinsiyet", "Gender", "women, men, unisex or kids");
const SIZE = field("size", "VARIANT", "Beden / numara", "Size", "clothing size or shoe number");

export const CATEGORIES: readonly Category[] = [
  { key: "phone", name: { tr: "Cep telefonu", en: "Mobile phone" }, hint: "smartphones", fields: [STORAGE, COLOUR] },
  {
    key: "tablet",
    name: { tr: "Tablet", en: "Tablet" },
    hint: "tablet computers",
    fields: [STORAGE, SCREEN, COLOUR, field("connectivity", "VARIANT", "Bağlantı", "Connectivity", "Wi-Fi or Wi-Fi + Cellular")],
  },
  {
    key: "laptop",
    name: { tr: "Dizüstü bilgisayar", en: "Laptop" },
    hint: "laptops and notebooks",
    fields: [field("processor", "VARIANT", "İşlemci", "Processor", "CPU model"), field("ram", "VARIANT", "Bellek", "Memory", "RAM, e.g. 16 GB"), STORAGE, SCREEN, COLOUR],
  },
  {
    key: "tv",
    name: { tr: "Televizyon", en: "Television" },
    hint: "televisions",
    fields: [SCREEN, field("resolution", "FACT", "Çözünürlük", "Resolution", "Full HD, 4K, 8K"), field("panel", "FACT", "Panel", "Panel", "LED, QLED, OLED, Mini LED"), field("platform", "FACT", "Akıllı TV sistemi", "Smart TV system", "Google TV, webOS, Tizen …")],
  },
  {
    key: "headphones",
    name: { tr: "Kulaklık", en: "Headphones" },
    hint: "headphones and earbuds",
    fields: [field("type", "FACT", "Tip", "Type", "in-ear, over-ear or on-ear"), field("connection", "FACT", "Bağlantı", "Connection", "wireless or wired"), COLOUR],
  },
  {
    key: "smartwatch",
    name: { tr: "Akıllı saat", en: "Smartwatch" },
    hint: "smartwatches",
    fields: [field("case", "VARIANT", "Kasa", "Case", "case size and material, e.g. 40 mm aluminium"), field("connectivity", "VARIANT", "Bağlantı", "Connectivity", "GPS or GPS + Cellular"), field("band", "VARIANT", "Kordon", "Band", "band type and size"), COLOUR],
  },
  {
    key: "camera",
    name: { tr: "Kamera", en: "Camera" },
    hint: "cameras, action cameras, security cameras",
    fields: [field("type", "FACT", "Tip", "Type", "action, mirrorless, security …"), field("bundle", "VARIANT", "Set / paket", "Bundle", "bundle or kit name, number of cameras")],
  },
  {
    key: "vacuum",
    name: { tr: "Süpürge", en: "Vacuum cleaner" },
    hint: "robot, stick and other vacuum cleaners",
    fields: [field("type", "FACT", "Tip", "Type", "robot, stick, canister"), COLOUR],
  },
  {
    key: "electronics_accessory",
    name: { tr: "Elektronik aksesuar", en: "Electronics accessory" },
    hint: "chargers, cables, cases, keyboards, mice and other accessories",
    fields: [field("type", "FACT", "Tip", "Type", "charger, cable, case, keyboard …"), field("power", "VARIANT", "Güç", "Power", "watts"), COLOUR],
  },
  {
    key: "clothing",
    name: { tr: "Giyim", en: "Clothing" },
    hint: "clothes",
    fields: [
      field("type", "FACT", "Tip", "Type", "shirt, coat, dress …"),
      GENDER,
      COLOUR,
      SIZE,
      field("fit", "VARIANT", "Kalıp", "Fit", "cut such as regular, slim, oversize; not a size"),
      field("material", "VARIANT", "Kumaş", "Material", "fabric"),
    ],
  },
  {
    key: "shoes",
    name: { tr: "Ayakkabı", en: "Shoes" },
    hint: "shoes, boots, sneakers",
    fields: [field("type", "FACT", "Tip", "Type", "sneaker, boot, tennis shoe …"), GENDER, COLOUR, SIZE],
  },
  { key: "other", name: { tr: "Diğer", en: "Other" }, hint: "anything else", fields: [] },
];

export const categoryByKey = (key: string): Category | undefined => CATEGORIES.find((category) => category.key === key);
