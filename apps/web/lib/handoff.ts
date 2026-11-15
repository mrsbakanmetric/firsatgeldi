// Hand-over links between screens (pagedesign.md §8.4 "No Add product dialog";
// modules.md Tracked Items, Notifications, Discover, SEO product page):
// "Ürün ekle" opens Search and Add and comes back to Tracked Items; "Takip et"
// (notification, recent search, Keşfet, product page) opens Search and Add with
// the product already marked, the confirm panel open and the mode preselected,
// then comes back to Tracked Items. One flow, one implementation.
import { type Locale, localizedPath } from "@firsatgeldi/i18n";

/** URL parameters (stable across languages, like `q` and `devam`). */
export const HANDOFF_PARAMS = {
  product: "urun",
  mode: "mod",
  back: "donus",
  /** Tracked Items: the item just added, to say so once. */
  added: "eklendi",
  /** "Aldım, kaydet" on a want-to-buy item: the tracked item that becomes a bought one. */
  convert: "takip",
} as const;

export type HandoffMode = "BOUGHT" | "WANT";
const MODE_VALUES: Record<HandoffMode, string> = { BOUGHT: "aldim", WANT: "istiyorum" };
const BACK_TO_TRACKING = "takip";
/** Search and Add reads `q` on arrival (the same parameter as its own search). */
const SEARCH_QUERY = "q";

export interface Handoff {
  readonly productId: string | null;
  readonly mode: HandoffMode | null;
  /** After confirming, go to Tracked Items. */
  readonly backToTracking: boolean;
  /** "Aldım, kaydet": this want-to-buy item is switched to bought instead of adding a new one. */
  readonly convertId: string | null;
}

/** Search and Add, optionally with a product marked (confirm panel open) and a mode. */
export function searchAddHref(locale: Locale, options: { productId?: string; mode?: HandoffMode; backToTracking?: boolean; convertId?: string; query?: string } = {}): string {
  const params = new URLSearchParams();
  // Typed text or a recent search: Search and Add searches it on arrival.
  if (options.query) params.set(SEARCH_QUERY, options.query.trim());
  if (options.productId) params.set(HANDOFF_PARAMS.product, options.productId);
  if (options.convertId) params.set(HANDOFF_PARAMS.convert, options.convertId);
  if (options.mode) params.set(HANDOFF_PARAMS.mode, MODE_VALUES[options.mode]);
  if (options.backToTracking) params.set(HANDOFF_PARAMS.back, BACK_TO_TRACKING);
  const query = params.toString();
  return `${localizedPath("/ara", locale)}${query ? `?${query}` : ""}`;
}

export function readHandoff(search: string): Handoff {
  const params = new URLSearchParams(search);
  const productId = params.get(HANDOFF_PARAMS.product)?.trim() || null;
  const modeValue = params.get(HANDOFF_PARAMS.mode);
  const mode = (Object.keys(MODE_VALUES) as HandoffMode[]).find((key) => MODE_VALUES[key] === modeValue) ?? null;
  // A "Takip et" hand-over always comes back to Tracked Items.
  const convertId = productId ? params.get(HANDOFF_PARAMS.convert)?.trim() || null : null;
  return { productId, mode: convertId ? "BOUGHT" : mode, backToTracking: productId !== null || params.get(HANDOFF_PARAMS.back) === BACK_TO_TRACKING, convertId };
}

/** Tracked Items, optionally naming the item just added. */
export function trackedItemsHref(locale: Locale, addedId?: string): string {
  const path = localizedPath("/takip", locale);
  return addedId ? `${path}?${new URLSearchParams({ [HANDOFF_PARAMS.added]: addedId }).toString()}` : path;
}
