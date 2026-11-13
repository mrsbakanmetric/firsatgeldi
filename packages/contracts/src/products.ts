// Catalogue and search (architecture.md §16 IDENTIFY, SEARCH AND UPLOADS;
// database.md §5). Catalogue data never carries a price, store or seller.
import { z } from "zod";
import { CategoryRef, Cursor, Id, ImageSha256 } from "./common";

/**
 * One autocomplete result (architecture.md §16 `GET /search/autocomplete`:
 * "id, name, image variant, category, brand, generation, colours, bundles,
 * store count; never price or store"). Texts are in the request's language.
 */
export const ProductSummary = z.object({
  id: Id,
  name: z.string().min(1),
  imageSha256: ImageSha256.nullable(),
  category: CategoryRef,
  brand: z.string().nullable(),
  generation: z.string().nullable(),
  colors: z.array(z.string()),
  bundles: z.array(z.string()),
  /** Number of stores carrying the product — a count, never the store names. */
  storeCount: z.number().int().nonnegative(),
});
export type ProductSummary = z.infer<typeof ProductSummary>;

export const AutocompleteQuery = z.object({
  q: z.string().trim().min(1),
  cursor: Cursor.optional(),
});

/**
 * `GET /search/autocomplete` data. `meta.total` = all matches, `meta.nextCursor` = next page.
 * `tileCount` (setting `search.autocomplete_tiles`) and `didYouMean` (design
 * "Bunu mu demek istedin") are [ASSUMPTION].
 */
export const AutocompleteResult = z.object({
  items: z.array(ProductSummary),
  tileCount: z.number().int().positive(),
  didYouMean: z.string().nullable(),
});
export type AutocompleteResult = z.infer<typeof AutocompleteResult>;

/** A localised attribute (database.md §5 `product_attributes`; names via category templates, architecture.md §19). */
export const ProductAttribute = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
});

/** `GET /products/:id` (database.md §5 `products`, `product_images`). */
export const ProductView = z.object({
  id: Id,
  slug: z.string().min(1),
  title: z.string().min(1),
  /** One line with generation · bundle · colour, as drawn under the name. */
  variantLine: z.string().nullable(),
  category: CategoryRef,
  brand: z.string().nullable(),
  attributes: z.array(ProductAttribute),
  images: z.array(ImageSha256),
  storeCount: z.number().int().nonnegative(),
});
export type ProductView = z.infer<typeof ProductView>;

/** How a similar product differs (design "Benzer ama farklı": other generation, bundle or accessory) [ASSUMPTION]. */
export const SimilarDifference = z.enum(["GENERATION", "BUNDLE", "VARIANT", "ACCESSORY"]);

/** `GET /products/:id/similar` — not compared, only offered as alternatives. */
export const SimilarProducts = z.object({
  items: z.array(z.object({ product: ProductSummary, difference: SimilarDifference })),
});
export type SimilarProducts = z.infer<typeof SimilarProducts>;
