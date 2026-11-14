// Confirm and tracking (architecture.md §16 CONFIRM AND TRACKING; database.md §6, §8).
import { z } from "zod";
import { CalendarDay, Id, Money, StockState, Timestamp, WarrantyType } from "./common";
import { HiddenOfferView, OfferRef } from "./offers";

/** Return rule of a platform (database.md §6 `platform_return_rules`). */
export const ReturnRule = z.object({
  days: z.number().int().nonnegative(),
  startType: z.enum(["ORDER", "DELIVERY"]),
  avgDeliveryDays: z.number().int().nonnegative().nullable(),
  /** AUTO = read from the store page · LOCKED = admin-corrected · DEFAULT = nothing read ("Varsayılan"). */
  sourceState: z.enum(["AUTO", "LOCKED", "DEFAULT"]),
  policyUrl: z.url().nullable(),
});
export type ReturnRule = z.infer<typeof ReturnRule>;

/**
 * Category notes shown next to the related field (design case H) [ASSUMPTION]:
 * NO_BRAND_CODE = tracked only at the user's seller; CATEGORY_UNSUPPORTED = cannot be tracked yet.
 */
export const ConfirmWarning = z.enum(["NO_BRAND_CODE", "CATEGORY_UNSUPPORTED"]);

/** Tracking modes (database.md §8 `tracked_items.mode`). */
export const TrackingMode = z.enum(["BOUGHT", "WANT"]);
export const TrackingDuration = z.enum(["1W", "1M", "3M", "UNLIMITED"]);
export const OrderStatus = z.enum(["ORDERED", "SHIPPED", "DELIVERED"]);

/**
 * `GET /products/:id/confirm-context` — "platforms, return suggestion, withdrawal warning"
 * (architecture.md §16). The platform list is the full list to pick the user's own
 * platform from; it is not tied to any offer. Allowances come in `meta.entitlements`.
 */
export const ConfirmContext = z.object({
  productId: Id,
  platforms: z.array(z.object({ id: Id, name: z.string().min(1), returnRule: ReturnRule })),
  /** Phones etc.: no right of withdrawal → suggest a price-difference request, not a return. */
  noWithdrawalRight: z.boolean(),
  warnings: z.array(ConfirmWarning),
  /** Active tracking of the same product (design case G: "Zaten takip ediyorsun"). */
  alreadyTracking: z.array(z.object({ trackedItemId: Id, mode: TrackingMode, since: Timestamp })),
  /** Want-to-buy hints from the seller-less cheapest history (design case E) [ASSUMPTION]. */
  targetHints: z.object({ lowest30Days: Money.nullable(), lowest6Months: Money.nullable() }),
});
export type ConfirmContext = z.infer<typeof ConfirmContext>;

/** `POST /products/:id/seller-lookup` { platformId, name } → exact match or none; rate-limited (architecture.md §6.4 R1). */
export const SellerLookupRequest = z.object({
  platformId: Id,
  name: z.string().trim().min(1),
});

/**
 * FırsatGeldi seller trust for the confirm panel's rating tile (modules.md "FırsatGeldi
 * seller trust indicator"; database.md `seller_trust.verdict`) [ASSUMPTION — field;
 * user decision 2026-11-14, to be written into architecture.md §16.1 by a spec PR].
 * Never a number or a breakdown. `reasonKey` is a catalogue key (`trust.reason.*`).
 * INSUFFICIENT → the server applies the fallback on the store rating
 * (`listing.seller_rating_good_min`): reasonKey `trust.reason.storeRatingGood` /
 * `trust.reason.storeRatingLow`; no store rating either → reasonKey null ("henüz yeterli veri yok").
 */
export const SellerTrustVerdict = z.enum(["GOOD", "CAUTION", "INSUFFICIENT"]);
export const SellerTrust = z.object({
  verdict: SellerTrustVerdict,
  reasonKey: z.string().min(1).nullable(),
});
export type SellerTrust = z.infer<typeof SellerTrust>;

/** The user's own seller: identity visible (architecture.md §6.1, column "Seller bought from"). */
export const SellerLookupResult = z.object({
  match: z
    .object({
      sellerRef: OfferRef,
      sellerName: z.string().min(1),
      sellerRating: z.number().min(0).max(5).nullable(),
      sellerRatingCount: z.number().int().nonnegative().nullable(),
      trust: SellerTrust,
      stockState: StockState,
      warrantyType: WarrantyType,
      listingUrl: z.url(),
      lastCheckedAt: Timestamp,
    })
    .nullable(),
});
export type SellerLookupResult = z.infer<typeof SellerLookupResult>;

/** `POST /products/:id/teaser` { pricePaid, sellerRef } — price in the body, never in the URL. */
export const TeaserRequest = z.object({
  pricePaid: Money,
  sellerRef: OfferRef.nullable(),
});

/** → hidden cheaper offers (HiddenOfferView) + the line "N satıcıda daha ucuz · en çok X kazanç". */
export const TeaserResult = z.object({
  offers: z.array(HiddenOfferView),
  summary: z.object({
    cheaperCount: z.number().int().nonnegative(),
    maxSaving: Money.nullable(),
    lastCheckedAt: Timestamp.nullable(),
  }),
});
export type TeaserResult = z.infer<typeof TeaserResult>;

/** Longest platform or seller name the user may type ("Diğer" platform). */
const TYPED_NAME_MAX = 80;

/**
 * `POST /tracked-items` — BOUGHT | WANT; pricePaid only from the user (database.md §8, R1).
 * "Diğer" platform (modules.md Search and Add step 4; field names and rules in
 * architecture.md §16.1, decided 2026-11-14, #69): `platformId` null +
 * `otherPlatformName` typed; the seller is saved as typed (`sellerName`, no exact-match
 * check, so no `sellerRef`); the return last day comes only from the user (null = unknown).
 */
export const CreateTrackedItemRequest = z
  .discriminatedUnion("mode", [
    z.object({
      mode: z.literal("BOUGHT"),
      productId: Id,
      identifyRequestId: Id.nullable(),
      /** A known platform; null when the user picked "Diğer". */
      platformId: Id.nullable(),
      otherPlatformName: z.string().trim().min(1).max(TYPED_NAME_MAX).nullable().optional(),
      /** Typed seller on a "Diğer" platform, saved as typed. */
      sellerName: z.string().trim().min(1).max(TYPED_NAME_MAX).nullable().optional(),
      sellerRef: OfferRef.nullable(),
      pricePaid: Money,
      pricePaidSource: z.enum(["USER_TYPED", "USER_LINK", "USER_SCREENSHOT"]),
      orderedOn: CalendarDay,
      orderStatus: OrderStatus,
      /** Set only when the user picked the last day (always the user's on a "Diğer" platform). */
      returnDeadline: CalendarDay.nullable(),
    }),
    z.object({
      mode: z.literal("WANT"),
      productId: Id,
      identifyRequestId: Id.nullable(),
      targetPrice: Money.nullable(),
      trackingDuration: TrackingDuration,
    }),
  ])
  .superRefine((request, context) => {
    if (request.mode !== "BOUGHT") return;
    const other = Boolean(request.otherPlatformName);
    // Exactly one: a known platform or a typed "Diğer" platform.
    if ((request.platformId === null) !== other) context.addIssue({ code: "custom", path: ["platformId"], message: "platformId or otherPlatformName" });
    // A typed seller only on a "Diğer" platform; there it is never looked up.
    if (other && request.sellerRef !== null) context.addIssue({ code: "custom", path: ["sellerRef"], message: "no sellerRef on another platform" });
    if (!other && request.sellerName) context.addIssue({ code: "custom", path: ["sellerName"], message: "sellerName only on another platform" });
  });
export type CreateTrackedItemRequest = z.infer<typeof CreateTrackedItemRequest>;

/** The new tracked item (database.md §8 `tracked_items`). */
export const TrackedItemCreated = z.object({
  id: Id,
  productId: Id,
  mode: TrackingMode,
  state: z.enum(["ACTIVE", "ENDED", "EXPIRED"]),
  returnDeadline: CalendarDay.nullable(),
  returnDeadlineStatus: z.enum(["ESTIMATED", "CONFIRMED", "USER_EDITED", "UNVERIFIED_DEFAULT"]).nullable(),
  noWithdrawalRight: z.boolean(),
  trackingEndsAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
export type TrackedItemCreated = z.infer<typeof TrackedItemCreated>;
