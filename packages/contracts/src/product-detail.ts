// Product Detail incl. Want to Buy mode (modules.md Product Detail, Price and Stock History,
// Ratings, Return Window, Want to Buy; pagedesign.md §8.3 design v2; implementation_plan.md
// Appendix B.2). Field shapes are [ASSUMPTION — shape] until architecture.md §16.1 writes them
// out. Cheaper sellers are referred to by rank only; a seller and platform appear only in the
// offers the user revealed (RevealedOfferView) and for the user's own purchase.
import { z } from "zod";
import { ApiLocale, CalendarDay, Id, Money, Rating, StockState, Timestamp } from "./common";
import { HiddenOfferView, RevealedOfferView } from "./offers";
import { OrderStatus, ReturnRule, SellerTrust, TrackingDuration, TrackedItemListItem } from "./tracking";

// ── Header and action steps ─────────────────────────────────────────────────

/**
 * Action steps (modules.md Product Detail › Action steps): with a right of withdrawal
 * RETURN_REQUEST (cancel while ordered) → REORDER → END; without it PRICE_DIFFERENCE → END.
 * Want-to-buy items have none.
 */
export const ActionStep = z.enum(["RETURN_REQUEST", "PRICE_DIFFERENCE", "REORDER", "END"]);
export type ActionStep = z.infer<typeof ActionStep>;

/** Request tracking ("talep takibi", modules.md Return Window): what the user asked the seller, and the answer. */
export const RequestKind = z.enum(["PRICE_DIFFERENCE", "RETURN"]);
export const RequestOutcome = z.enum(["GIVEN", "REFUSED", "COUPON"]);
export const TrackingRequest = z.object({ kind: RequestKind, since: Timestamp, outcome: RequestOutcome.nullable() });
export type TrackingRequest = z.infer<typeof TrackingRequest>;

/** The two optional buyer questions (modules.md Ratings › Our buyers' answers). */
export const PriceDifferenceAnswer = z.enum(["YES", "NO", "NOT_ASKED"]);
export const ReturnSmoothAnswer = z.enum(["YES", "PROBLEM", "NOT_DONE"]);
export const BuyerFeedback = z.object({ priceDifferenceGiven: PriceDifferenceAnswer.nullable(), returnSmooth: ReturnSmoothAnswer.nullable() });
export type BuyerFeedback = z.infer<typeof BuyerFeedback>;

/**
 * `GET /tracked-items/:id` — one tracked item for Product Detail: the list item (same figures as
 * Tracked Items and Home) plus what the detail page shows. The user's own platform and seller
 * are visible; `returnRule` is the rule of the user's own platform (null on "Diğer").
 */
export const TrackedItemDetail = TrackedItemListItem.extend({
  product: TrackedItemListItem.shape.product.extend({ variantLine: z.string().min(1).nullable() }),
  trackingStartedOn: CalendarDay,
  returnRule: ReturnRule.nullable(),
  /** Phones etc.: no right of withdrawal → price-difference steps, never "iade". */
  noWithdrawalRight: z.boolean(),
  /** The estimated delivery day has passed and the last day is still estimated → "Teslim aldın mı?". */
  deliveryPrompt: z.boolean(),
  steps: z.array(z.object({ step: ActionStep, done: z.boolean() })),
  request: TrackingRequest.nullable(),
  /** Want-to-buy target suggestions from the seller-less cheapest history (null = not enough history). */
  targetHints: z.object({ lowest30Days: Money.nullable(), lowest6Months: Money.nullable() }).nullable(),
  /** Answers already given to the two buyer questions (bought items), else null. */
  feedback: BuyerFeedback.nullable(),
});
export type TrackedItemDetail = z.infer<typeof TrackedItemDetail>;

// ── Offers ──────────────────────────────────────────────────────────────────

/**
 * One-line summary of an offer before "Göster" (design v2: "✓ Güvenilir satıcı · Peşin fiyatına en
 * çok 6 taksit · Sepette 500 TL"): nothing that identifies the seller. `trust` = the FırsatGeldi
 * indicator (verdict + reason key); `installments` = the most interest-free instalments, null when
 * not read; `campaign` = a structured kind + amount, never the store's own text.
 */
export const OfferSummary = z.object({
  trust: SellerTrust,
  installments: z.object({ maxInterestFree: z.number().int().positive() }).nullable(),
  campaign: z.object({ kind: z.enum(["BASKET", "COUPON", "BANK"]), amount: Money.nullable() }).nullable(),
});
export type OfferSummary = z.infer<typeof OfferSummary>;

/** A hidden offer on Product Detail: rank only, with its summary line. */
export const DetailHiddenOffer = HiddenOfferView.extend({ revealed: z.literal(false), summary: OfferSummary });
/** An offer the user revealed (still open): seller, platform, store ratings and the link. */
export const DetailRevealedOffer = RevealedOfferView.extend({ revealed: z.literal(true), summary: OfferSummary });
export const DetailOffer = z.discriminatedUnion("revealed", [DetailHiddenOffer, DetailRevealedOffer]);
export type DetailOffer = z.infer<typeof DetailOffer>;

/**
 * `GET /tracked-items/:id/offers` — bought: offers cheaper than the price paid (own listing
 * excluded); want: in-stock offers, cheapest first. `own` = the user's own listing as the
 * reference row ("Aldığın satıcı · <seller> · <platform>"), null for want or "Diğer".
 * `checkedCount` = sellers checked ("7 satıcı kontrol edildi"); `underReview` = offers left out
 * while reports are reviewed (design States 4). Ended items and a closed return window list no offers.
 */
export const DetailOffers = z.object({
  offers: z.array(DetailOffer),
  own: z
    .object({
      sellerName: z.string().min(1).nullable(),
      platformName: z.string().min(1),
      price: Money,
      shippingCost: Money.nullable(),
      stockState: StockState,
      lastCheckedAt: Timestamp,
    })
    .nullable(),
  checkedCount: z.number().int().nonnegative(),
  underReview: z.number().int().nonnegative(),
});
export type DetailOffers = z.infer<typeof DetailOffers>;

// ── Price history (full) ────────────────────────────────────────────────────

/** Ranges (modules.md Price history › Ranges [DECIDED]). */
export const HistoryRange = z.enum(["14d", "1m", "3m", "6m", "1y", "2y", "all"]);
export type HistoryRange = z.infer<typeof HistoryRange>;

/** Buy-or-wait hint (modules.md Price history [DECIDED, all modes]): one factual line, never advice. */
export const BuyOrWaitHint = z.discriminatedUnion("kind", [
  /** "Son 30 günün en düşüğü". */
  z.object({ kind: z.literal("LOWEST_IN_DAYS"), days: z.number().int().positive() }),
  /** "Son 6 ayın en düşüğüne 1.098 TL var". */
  z.object({ kind: z.literal("ABOVE_LOWEST"), days: z.number().int().positive(), amount: Money }),
]);
export type BuyOrWaitHint = z.infer<typeof BuyOrWaitHint>;

/**
 * `GET /tracked-items/:id/price-history?range=` — the cheapest price per day (kuruş, shipping
 * included, seller unnamed), oldest first from `from`; null = no data that day (nothing guessed).
 * Days before `trackingStartedOn` are drawn dimmed ("Takip başladı"). `lowest` names the seller
 * only by its rank on that day. `tiles` cover the range; `dataDays` = days with data ("veri N günlük").
 */
export const PriceHistoryDetail = z.object({
  range: HistoryRange,
  from: CalendarDay,
  cheapest: z.array(z.number().int().nonnegative().nullable()).min(1),
  trackingStartedOn: CalendarDay,
  reference: z.object({ kind: z.enum(["PAID", "TARGET"]), price: Money }).nullable(),
  lowest: z.object({ day: CalendarDay, price: Money, rankThen: z.number().int().positive() }).nullable(),
  tiles: z.object({ lowest: Money, highest: Money, average: Money, change: Money }).nullable(),
  dataDays: z.number().int().nonnegative(),
  hint: BuyOrWaitHint.nullable(),
});
export type PriceHistoryDetail = z.infer<typeof PriceHistoryDetail>;

// ── Stock history (full) ────────────────────────────────────────────────────

/** Whose stock a row shows: a cheaper offer by rank, or the user's own seller ("aldığın satıcı"). */
export const StockSubject = z.discriminatedUnion("kind", [z.object({ kind: z.literal("RANK"), rank: z.number().int().positive() }), z.object({ kind: z.literal("OWN") })]);
export type StockSubject = z.infer<typeof StockSubject>;

export const StockHistoryRange = z.enum(["14d", "1m"]);

/**
 * `GET /tracked-items/:id/stock-history?range=14d|1m` — one row per subject, one state per day
 * (null = no data), a dated change log (newest first) and the conclusion ("Şu an stokta · en az 7 gündür").
 */
export const StockHistoryDetail = z.object({
  range: StockHistoryRange,
  from: CalendarDay,
  rows: z.array(z.object({ subject: StockSubject, days: z.array(StockState.nullable()).min(1) })),
  changes: z.array(z.object({ day: CalendarDay, subject: StockSubject, from: StockState.nullable(), to: StockState })),
  conclusion: z.object({ subject: StockSubject, state: StockState, atLeastDays: z.number().int().positive() }).nullable(),
});
export type StockHistoryDetail = z.infer<typeof StockHistoryDetail>;

// ── Ready texts and ratings ─────────────────────────────────────────────────

/**
 * `GET /tracked-items/:id/price-difference-message?locale=` — the customer-service text for the
 * seller the user bought from (modules.md Product Detail › v1 helpers). It never names a hidden
 * seller. `text` is null when there is no cheaper price to ask about.
 */
export const PriceDifferenceMessage = z.object({
  locale: ApiLocale,
  recipient: z.string().min(1),
  text: z.string().min(1).nullable(),
  difference: Money.nullable(),
});
export type PriceDifferenceMessage = z.infer<typeof PriceDifferenceMessage>;

/**
 * `GET /products/:id/ratings` — one product-level figure across stores, no store names
 * ("4 mağazada 3.850 değerlendirme · ortalama 4,5 ★"); `few` under `ratings.min_count`. `average`
 * is on the shared 5-point scale ("4,5 / 5"): a store on another scale is brought to 5 only for this
 * average; each store's own rating appears after "Göster" on its own scale [ASSUMPTION — user
 * decision 2026-11-15, to be checked in the data test].
 */
export const ProductRatings = z.object({
  average: Rating.nullable(),
  storeCount: z.number().int().nonnegative(),
  few: z.boolean(),
  readAt: Timestamp.nullable(),
});
export type ProductRatings = z.infer<typeof ProductRatings>;

// ── Writes ──────────────────────────────────────────────────────────────────

/** `PATCH /tracked-items/:id` — price paid, order status, last day (bought) or target (want); at least one field. */
export const UpdateTrackedItemRequest = z
  .object({
    pricePaid: Money.optional(),
    orderStatus: OrderStatus.optional(),
    returnDeadline: CalendarDay.optional(),
    targetPrice: Money.nullable().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: "nothing to change" });
export type UpdateTrackedItemRequest = z.infer<typeof UpdateTrackedItemRequest>;

/** `POST /tracked-items/:id/delivered` — "Teslim aldın mı?": today · another day (with the day) · not yet. */
export const DeliveredRequest = z
  .object({ answer: z.enum(["TODAY", "OTHER_DAY", "NOT_YET"]), day: CalendarDay.nullable() })
  .refine((body) => (body.answer === "OTHER_DAY") === (body.day !== null), { message: "day only with OTHER_DAY", path: ["day"] });
export const DeliveredResult = z.object({
  returnDeadline: CalendarDay.nullable(),
  returnDeadlineStatus: z.enum(["ESTIMATED", "CONFIRMED", "USER_EDITED", "UNVERIFIED_DEFAULT"]).nullable(),
});

/** `POST /tracked-items/:id/steps/:step` { done } — "Yaptım ✓", reversible. */
export const StepParams = z.object({ id: Id, step: ActionStep });
export const StepRequest = z.object({ done: z.boolean() });
export const StepResult = z.object({ steps: TrackedItemDetail.shape.steps });

/** `PATCH /tracked-items/:id/request` — kind null clears it; the outcome when the seller answered. */
export const UpdateRequestRequest = z.object({ kind: RequestKind.nullable(), outcome: RequestOutcome.nullable() });
export const UpdateRequestResult = z.object({ request: TrackingRequest.nullable() });

/** `POST /tracked-items/:id/extend` { duration } — want-to-buy only ("uzatmak ister misin?"). */
export const ExtendRequest = z.object({ duration: TrackingDuration });
export const ExtendResult = z.object({ trackingDuration: TrackingDuration, trackingEndsAt: Timestamp.nullable() });

/** `POST /tracked-items/:id/feedback` — the two optional buyer questions; one answer per item, at least one question. */
export const FeedbackRequest = BuyerFeedback.refine((body) => body.priceDifferenceGiven !== null || body.returnSmooth !== null, { message: "no answer" });
export const FeedbackResult = z.object({ feedback: BuyerFeedback });

/** `POST /offers/:ref/notify-back-in-stock` — "Stoğa gelince haber ver" for that offer. */
export const NotifyBackInStockResult = z.object({ subscribed: z.literal(true) });

/** Longest optional note on a report. */
export const REPORT_NOTE_MAX = 500;

/**
 * `POST /reports` — "Yanlış fiyat bildir" (an offer, by its ref) or "Farklı ürün bildir" (the
 * tracked item's product match). The answer comes later as a notification (Trust and Accuracy).
 */
export const CreateReportRequest = z
  .object({
    trackedItemId: Id,
    kind: z.enum(["WRONG_PRICE", "DIFFERENT_PRODUCT"]),
    offerRef: HiddenOfferView.shape.ref.nullable(),
    note: z.string().trim().max(REPORT_NOTE_MAX).nullable(),
  })
  .refine((body) => (body.kind === "WRONG_PRICE") === (body.offerRef !== null), { message: "offerRef only with WRONG_PRICE", path: ["offerRef"] });
export const CreateReportResult = z.object({ id: Id, status: z.literal("RECEIVED") });
