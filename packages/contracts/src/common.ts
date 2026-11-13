// Shared building blocks of the API contract (architecture.md §15.2, database.md §1).
import { z } from "zod";

/** Supported languages of API data (architecture.md §19; `i18n.locales`). */
export const ApiLocale = z.enum(["tr", "en"]);
export type ApiLocale = z.infer<typeof ApiLocale>;

export const Id = z.uuid();
export const Timestamp = z.iso.datetime({ offset: true });
/** A calendar day in Europe/Istanbul (YYYY-MM-DD), e.g. the last return day. */
export const CalendarDay = z.iso.date();

/** Currencies the product handles today; the label "TL" comes from `core`. */
export const Currency = z.enum(["TRY"]);

/**
 * Money `{ amount, currency }` (architecture.md §15.2). `amount` is an integer
 * in minor units (kuruş), as stored (database.md §1: "Money in integer kuruş").
 */
export const Money = z.object({
  amount: z.number().int(),
  currency: Currency,
});
export type Money = z.infer<typeof Money>;

/** Minor units (kuruş) → major units (TL) for `formatMoney` in `core`. */
export const MINOR_UNITS_PER_MAJOR = 100;
export function toMajorUnits(money: Money): number {
  return money.amount / MINOR_UNITS_PER_MAJOR;
}

/** SHA-256 content address of a catalogue image; served at `/img/:sha256/:variant` (architecture.md §11a). */
export const ImageSha256 = z.string().regex(/^[0-9a-f]{64}$/);

/** Image variants (database.md §14b `media_variants.variant`). */
export const ImageVariant = z.enum(["THUMB_160", "CARD_480", "DETAIL_1080", "OG_1200"]);
export type ImageVariant = z.infer<typeof ImageVariant>;

/** A localised name of a category or attribute (category template translations, architecture.md §19). */
export const CategoryRef = z.object({
  id: Id,
  name: z.string().min(1),
});

/** Stock states (database.md §6 `offers.stock_state`). */
export const StockState = z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]);
/** Warranty types (database.md §6 `offers.warranty_type`). */
export const WarrantyType = z.enum(["DISTRIBUTOR", "IMPORTER", "UNKNOWN"]);

/** Opaque cursor for paged lists (architecture.md §15.2 `meta.nextCursor`). */
export const Cursor = z.string().min(1);
