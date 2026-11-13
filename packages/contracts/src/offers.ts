// Hidden-seller views (architecture.md §6.1). Hiding happens when the response
// is built: identity fields are NOT defined in HiddenOfferView, and output
// validation (z.object strips unknown keys) removes anything extra.
import { z } from "zod";
import { Money, StockState, Timestamp, WarrantyType } from "./common";

/** Opaque offer reference (architecture.md §6.2): base64url, not enumerable, not valid for another user. */
export const OfferRef = z.string().regex(/^[A-Za-z0-9_-]{16,}$/);

/** Delivery time (database.md §6 `offers.delivery_days_min/max`); visible before reveal [DECIDED]. */
export const DeliveryDays = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
});

/**
 * Fields visible before "Göster" (architecture.md §6.1, column `HiddenOfferView`).
 * `rank` carries the doc's `rankLabel`: the label ("En ucuz satıcı", "2. ucuz satıcı")
 * is built on the client from the catalogue [ASSUMPTION].
 */
export const HiddenOfferView = z.object({
  ref: OfferRef,
  rank: z.number().int().positive(),
  price: Money,
  previousPrice: Money.nullable(),
  /** Saving against the price paid (shipping included); null when there is nothing to compare. */
  saving: Money.nullable(),
  netSaving: Money.nullable(),
  /** null = unknown → "kargo hariç" (database.md §6). */
  shippingCost: Money.nullable(),
  deliveryDays: DeliveryDays.nullable(),
  stockState: StockState,
  stockSince: Timestamp,
  priceSince: Timestamp,
  warrantyType: WarrantyType,
  lastCheckedAt: Timestamp,
  /** Old price claimed by the listing when it looks fake (database.md §6 `claimed_old_price`). */
  fakeDiscountNote: z.object({ claimedOldPrice: Money }).nullable(),
});
export type HiddenOfferView = z.infer<typeof HiddenOfferView>;

/** Allowance used for a reveal (database.md §9 `offer_reveals.gate`). */
export const RevealGate = z.enum(["FREE_TOGGLE", "PREMIUM", "MONTHLY_FREE", "TOKEN", "ADMIN"]);

/** After "Göster" (architecture.md §6.1, column `RevealedOfferView`). */
export const RevealedOfferView = HiddenOfferView.extend({
  sellerName: z.string().min(1),
  sellerRating: z.number().min(0).max(5).nullable(),
  platformName: z.string().min(1),
  /** Our outbound link; shown with the commission note. */
  listingUrl: z.url(),
  commissionNote: z.boolean(),
  revealExpiresAt: Timestamp,
  gateUsed: RevealGate,
});
export type RevealedOfferView = z.infer<typeof RevealedOfferView>;

/** Names of the identity fields that exist only in RevealedOfferView (used by the leak test). */
export const REVEALED_ONLY_FIELDS = ["sellerName", "sellerRating", "platformName", "listingUrl", "commissionNote", "revealExpiresAt", "gateUsed"] as const;

/** `POST /offers/:ref/reveal` → RevealedOfferView | { allowed: false, reason, options } (architecture.md §6.3, §16). */
export const RevealResult = z.discriminatedUnion("allowed", [
  z.object({ allowed: z.literal(true), offer: RevealedOfferView }),
  z.object({
    allowed: z.literal(false),
    reason: z.enum(["LIMIT_REACHED", "RESTRICTED"]),
    options: z.array(z.enum(["REQUEST_PREMIUM", "REQUEST_TOKENS"])),
  }),
]);
export type RevealResult = z.infer<typeof RevealResult>;

/** `POST /offers/:ref/hide` → the offer hidden again. */
export const HideResult = z.object({ offer: HiddenOfferView });

/** `POST /offers/:ref/go` → re-check → { url } | { gone|priceChanged, next } (architecture.md §16). */
export const GoResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("OK"), url: z.url() }),
  z.object({ status: z.enum(["GONE", "PRICE_CHANGED"]), next: HiddenOfferView.nullable() }),
]);
export type GoResult = z.infer<typeof GoResult>;
