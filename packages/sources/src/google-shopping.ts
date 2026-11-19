// Link reading path 2: what a Google Shopping answer (SerpApi) says about the product
// found by path 1 (architecture.md §10.1). Store text is untrusted data: only known fields
// are read, each checked for its type; anything else is ignored.
import type { LinkTextReading } from "./link-text.ts";
import { keyNameWords } from "./matching.ts";

export interface ShoppingOffer {
  readonly position: number | null;
  readonly title: string;
  /** Store or seller name as Google shows it. */
  readonly source: string | null;
  /** Price in TL as a number (SerpApi `extracted_price`). */
  readonly price: number | null;
  /** The price as Google writes it ("₺5.477,98"): tells a TL listing from a foreign one. */
  readonly priceText: string | null;
  /** Google's own condition label for a used or refurbished offer (`second_hand_condition`). */
  readonly condition: string | null;
  /** Claimed old price (`extracted_old_price`), when shown. */
  readonly oldPrice: number | null;
  readonly rating: number | null;
  readonly reviews: number | null;
  readonly delivery: string | null;
  readonly link: string | null;
  readonly thumbnail: string | null;
}

export interface ShoppingReading {
  /** SerpApi's own error text (e.g. no results), when it gave one. */
  readonly error: string | null;
  readonly offers: readonly ShoppingOffer[];
}

/**
 * The search text for path 2 [DECIDED 2026-11-19] (architecture.md §10.1): brand + model
 * code + the key name words, never the model code alone (model-code-only searches found
 * 0 of 6 in round 1). Generic words ("akilli", "ekran uydu alicili") are dropped. A link
 * without a model code keeps every word path 1 read, so its saved answer stays valid.
 * One search per link.
 */
export function pathTwoQuery(reading: LinkTextReading): string {
  if (!reading.modelCode) return reading.searchText;
  return [reading.brand, reading.modelCode, ...keyNameWords(reading)].filter(Boolean).join(" ");
}

type Json = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const number = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

function offerOf(item: Json): ShoppingOffer | null {
  const title = text(item.title);
  if (!title) return null;
  return {
    position: number(item.position),
    title,
    source: text(item.source),
    price: number(item.extracted_price),
    priceText: text(item.price),
    condition: text(item.second_hand_condition),
    oldPrice: number(item.extracted_old_price),
    rating: number(item.rating),
    reviews: number(item.reviews),
    delivery: text(item.delivery),
    link: text(item.product_link) ?? text(item.link),
    thumbnail: text(item.thumbnail),
  };
}

function items(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

/** Offers from `shopping_results`, plus `inline_shopping_results` and categorized groups when Google returns those instead. */
export function readGoogleShopping(body: unknown): ShoppingReading {
  if (!isObject(body)) return { error: "not a JSON object", offers: [] };
  const grouped = items(body.categorized_shopping_results).flatMap((group) => items(group.shopping_results));
  const all = [...items(body.shopping_results), ...items(body.inline_shopping_results), ...grouped];
  return {
    error: text(body.error),
    offers: all.map(offerOf).filter((offer): offer is ShoppingOffer => offer !== null),
  };
}
