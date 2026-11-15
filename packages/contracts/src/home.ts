// Home (modules.md Home; pagedesign.md §8.1 design v2; architecture.md §16.1
// `HomeView`, `HomeView.topDrops`). Field shapes are [ASSUMPTION — shape] until
// architecture.md §16.1 writes them out. "Şu an en çok düşenler" never carries a
// seller, platform, listing link or offer ref: those fields are not defined here,
// and output validation strips anything undeclared (the leak test also checks the keys).
import { z } from "zod";
import { CategoryRef, Id, ImageSha256, Money, StockState, Timestamp } from "./common";
import { HiddenOfferView } from "./offers";
import { TrackedItemListItem, TrackedItemsSummary } from "./tracking";

/** Hemen Gözat: the first item in Home priority order, with up to 3 hidden offers by rank (each with Göster). */
export const HomeFeatured = TrackedItemListItem.extend({
  /** Cheaper offers (bought: than the price paid; want: the cheapest), rank only before "Göster"; at most 3. */
  offers: z.array(HiddenOfferView).max(3),
  /** All cheaper offers ("3 satıcıda daha ucuz"); more than 3 → Product Detail. */
  cheaperCount: z.number().int().nonnegative(),
});
export type HomeFeatured = z.infer<typeof HomeFeatured>;

/** A small "Takip ettiklerin" card; `emphasised` = a second item at the same priority level as Hemen Gözat. */
export const HomeCard = TrackedItemListItem.extend({ emphasised: z.boolean() });
export type HomeCard = z.infer<typeof HomeCard>;

/** One "Şu an en çok düşenler" product: seller-less, built only from our own price checks. */
export const TopDropItem = z.object({
  product: z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable(), category: CategoryRef }),
  /** Average daily cheapest price over `home.top_drops.window_days` (shipping included). */
  averagePrice: Money,
  /** Current cheapest in-stock price (shipping included). */
  currentPrice: Money,
  dropAmount: Money,
  /** Whole percent below the average. */
  dropPct: z.number().int().positive(),
  sellerCount: z.number().int().positive(),
  /** Stock of the cheapest offer. */
  stockState: StockState,
  checkedAt: Timestamp,
});
export type TopDropItem = z.infer<typeof TopDropItem>;

/** Keys a top-drop item may carry (the hidden-seller test compares them one to one). */
export const TOP_DROP_ITEM_KEYS = Object.keys(TopDropItem.shape) as (keyof TopDropItem)[];

/**
 * CATEGORIES = from the user's tracked categories (`categories` = the categories shown);
 * GENERAL = across all categories (nothing tracked yet, or fewer than `home.top_drops.count`
 * in the user's categories). null on `HomeView` = nothing qualifies → the section is hidden.
 */
export const TopDrops = z.object({
  scope: z.enum(["CATEGORIES", "GENERAL"]),
  /** [ASSUMPTION — field] GENERAL although the user tracks categories → the one-line note "Kategorilerinde büyük düşüş yok". */
  hasTrackedCategories: z.boolean(),
  categories: z.array(z.object({ id: Id, name: z.string().min(1) })),
  items: z.array(TopDropItem).min(1).max(3),
  /** [ASSUMPTION — field] Window of the average ("son 30 günün ortalamasına göre"), from `home.top_drops.window_days`. */
  windowDays: z.number().int().positive(),
});
export type TopDrops = z.infer<typeof TopDrops>;

/** `GET /home` (`HomeView`). Allowances in `meta.entitlements`; `meta.total` = active tracked items; `meta.sourcesMissing`. */
export const HomeView = z.object({
  summary: TrackedItemsSummary,
  /** "38.400 TL koruma altında": price paid of active bought items [ASSUMPTION — field]. */
  protectedTotal: Money.nullable(),
  /** null when nothing is tracked (new user). */
  featured: HomeFeatured.nullable(),
  /** Return window ends within 2 days (modules.md Home › Return reminder line). */
  returnsSoon: z.object({ count: z.number().int().nonnegative(), items: z.array(z.object({ id: Id, name: z.string().min(1) })) }),
  /** Up to `home.tracked_cards` (4), Home priority order after `featured`. */
  cards: z.array(HomeCard),
  topDrops: TopDrops.nullable(),
});
export type HomeView = z.infer<typeof HomeView>;
