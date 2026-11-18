// Notifications — the page `/bildirimler` and the bell panel (modules.md Notifications and
// Preferences; architecture.md §16 NOTIFICATIONS; pagedesign.md §8.5 design v2.1; decisions
// 2026-11-19). Shapes and the endpoints not named in §16 are [ASSUMPTION — shape] until §16.1.
// A notification is structured: the client words it from the catalogue in the page's language.
// Rules carried by the shapes:
// - No seller identity anywhere (database.md §10 `notifications.payload`); the only store name is
//   the user's own purchase ("Hepsiburada · 1 Kasım'da aldın"), and only in the preview.
// - Every price and stock value comes with its check time.
import { z } from "zod";
import { CalendarDay, CategoryRef, Cursor, Id, ImageSha256, Money, Timestamp } from "./common";

/** `notifications.type` (database.md §10 `notification_templates.type`). */
export const NotificationType = z.enum([
  // Tracking
  "DEAL_FOUND",
  "PRICE_DROP",
  "DEADLINE_SOON",
  "RETURN_REMINDER",
  "TARGET_REACHED",
  "BACK_IN_STOCK",
  "DELIVERY_PROMPT",
  "TRACKING_EXPIRING",
  "SAVING_RECORDED",
  "REVEAL_PRICE_UP",
  "REPORT_RESOLVED",
  "DEAL_ENDED",
  "SEARCHED_PRODUCT_DROP",
  "DIGEST",
  // Account and security
  "WELCOME",
  "VERIFY_EMAIL",
  "NEW_DEVICE_SIGNIN",
  "PASSWORD_CHANGED",
  "IDENTITY_LINKED",
  "DELETION_STARTED",
  "DELETION_RESTORED",
  "DELETION_COMPLETED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_UNSUSPENDED",
  "DATA_EXPORT_READY",
  "PACKAGE_REQUEST_RESULT",
  "SUPPORT_REPLY",
  "CONSENT_REQUIRED",
  // Community
  "FOLLOW_ACCEPTED",
  // Admin
  "ADMIN_FRAUD_CASE",
  "ADMIN_SOURCE_ALERT",
  "ADMIN_BUDGET",
  "ADMIN_PENDING_DIGEST",
  "ADMIN_ROLE_CHANGED",
]);
export type NotificationType = z.infer<typeof NotificationType>;

/** Page filters with counts (modules.md): Tümü · Fırsat · İade · Aramalarım · Diğer. */
export const NotificationFilter = z.enum(["ALL", "DEAL", "RETURN", "SEARCH", "OTHER"]);
export type NotificationFilter = z.infer<typeof NotificationFilter>;

const FILTER_TYPES: Readonly<Record<"DEAL" | "RETURN" | "SEARCH", readonly NotificationType[]>> = {
  DEAL: ["DEAL_FOUND", "DEAL_ENDED"],
  RETURN: ["DEADLINE_SOON", "RETURN_REMINDER", "DELIVERY_PROMPT"],
  SEARCH: ["SEARCHED_PRODUCT_DROP"],
};

/** Fırsat = deal found + deal ended · İade = return window + delivery question · Aramalarım · Diğer = the rest. */
export function notificationFilterOf(type: NotificationType): Exclude<NotificationFilter, "ALL"> {
  for (const filter of ["DEAL", "RETURN", "SEARCH"] as const) if (FILTER_TYPES[filter].includes(type)) return filter;
  return "OTHER";
}

/** `GET /notifications?filter=&q=&category=&unread=true` — the last `notify.list_days` (30) days, newest first. */
export const NotificationsQuery = z.object({
  filter: NotificationFilter.optional(),
  q: z.string().trim().max(80).optional(),
  category: Id.optional(),
  /** "Yalnızca okunmamışlar". */
  unread: z.enum(["true"]).optional(),
  cursor: Cursor.optional(),
});

/** What the item is about: a product (image + mode), the account (lock tile) or a person (person tile). */
export const NotificationSubject = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PRODUCT"),
    product: z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable(), category: CategoryRef }),
    /** "Aldım" · "Almak istiyorum" · "Takipte değil". */
    mode: z.enum(["BOUGHT", "WANT", "NOT_TRACKED"]),
    trackedItemId: Id.nullable(),
  }),
  z.object({ kind: z.literal("ACCOUNT") }),
  z.object({ kind: z.literal("PERSON"), username: z.string().min(1) }),
]);
export type NotificationSubject = z.infer<typeof NotificationSubject>;

/**
 * The values a type is worded from; a type uses only its own (null otherwise). Never a seller;
 * `ownStore` is the user's own purchase, shown in the preview only.
 */
export const NotificationValues = z.object({
  pricePaid: Money.nullable(),
  cheapest: Money.nullable(),
  saving: Money.nullable(),
  /** A drop as an amount, or in percent (`dropPct`). */
  drop: Money.nullable(),
  dropPct: z.number().int().positive().nullable(),
  target: Money.nullable(),
  /** REVEAL_PRICE_UP: the price seen at "Göster" and the price now. */
  previousPrice: Money.nullable(),
  returnDaysLeft: z.number().int().nonnegative().nullable(),
  returnDeadline: CalendarDay.nullable(),
  /** How long the return window is ("teslimden 14 gün"). */
  returnPeriodDays: z.number().int().positive().nullable(),
  orderedOn: CalendarDay.nullable(),
  deliveredOn: CalendarDay.nullable(),
  orderStatus: z.enum(["ORDERED", "SHIPPED", "DELIVERED"]).nullable(),
  ownStore: z.string().min(1).nullable(),
  storeCount: z.number().int().nonnegative().nullable(),
  /** DEAL_FOUND: how many sellers are cheaper than what the user paid. */
  cheaperSellerCount: z.number().int().nonnegative().nullable(),
  /** BACK_IN_STOCK: out of stock at least this many days before. */
  outOfStockDays: z.number().int().positive().nullable(),
  /** SEARCHED_PRODUCT_DROP: the lowest price of the last 30 days. */
  lowest30Days: z.boolean().nullable(),
  /** TRACKING_EXPIRING / want-to-buy: days of tracking left. */
  trackingDaysLeft: z.number().int().nonnegative().nullable(),
  /** REPORT_RESOLVED. */
  report: z.object({ kind: z.enum(["WRONG_PRICE", "DIFFERENT_PRODUCT"]), outcome: z.enum(["CORRECTED", "DATA_CORRECT"]), reportedOn: CalendarDay }).nullable(),
  /** NEW_DEVICE_SIGNIN: device and browser only, never a location (decision 2026-11-18). */
  device: z.object({ browser: z.string().min(1), os: z.string().min(1), at: Timestamp }).nullable(),
  /** DIGEST: products and changes in one notification. */
  digest: z.object({ products: z.number().int().nonnegative(), changes: z.number().int().nonnegative(), lines: z.array(NotificationType).max(5) }).nullable(),
  /** When the price or stock was checked (honest data); null for items without one. */
  checkedAt: Timestamp.nullable(),
});
export type NotificationValues = z.infer<typeof NotificationValues>;

export const NotificationItem = z.object({
  id: Id,
  type: NotificationType,
  createdAt: Timestamp,
  read: z.boolean(),
  /** An earlier "Fırsat geldi" whose deal has ended since (60 % on the page). */
  faded: z.boolean(),
  /** Account and security: cannot be turned off ("Bu bildirim kapatılamaz"). */
  mandatory: z.boolean(),
  subject: NotificationSubject,
  values: NotificationValues,
  /** DELIVERY_PROMPT: still waiting for an answer ("Evet, aldım" / "Henüz değil"). */
  awaitingAnswer: z.boolean(),
});
export type NotificationItem = z.infer<typeof NotificationItem>;

export const NotificationList = z.object({
  items: z.array(NotificationItem),
  /** `notify.list_days`: the window the list covers ("son 30 gün"). */
  listDays: z.number().int().positive(),
  facets: z.object({
    filters: z.object({ ALL: z.number().int().nonnegative(), DEAL: z.number().int().nonnegative(), RETURN: z.number().int().nonnegative(), SEARCH: z.number().int().nonnegative(), OTHER: z.number().int().nonnegative() }),
    categories: z.array(z.object({ id: Id, name: z.string().min(1), count: z.number().int().nonnegative() })),
    unread: z.number().int().nonnegative(),
  }),
});
export type NotificationList = z.infer<typeof NotificationList>;

/** `GET /notifications/:id` — the bell preview: the item plus the 14-day cheapest price where it applies. */
export const NotificationDetail = NotificationItem.extend({
  history: z.array(z.object({ day: CalendarDay, cheapest: Money })).nullable(),
});
export type NotificationDetail = z.infer<typeof NotificationDetail>;

export const UnreadCount = z.object({ unread: z.number().int().nonnegative(), unreadDeal: z.boolean() });
export const ReadResult = z.object({ id: Id, read: z.literal(true) });
export const ReadAllResult = z.object({ updated: z.number().int().nonnegative() });

/** `GET /notifications/for-you` — "Senin için": the cheapest offer only, never a seller. */
export const ForYou = z.object({
  drops: z.array(
    z.object({
      trackedItemId: Id,
      product: z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable() }),
      mode: z.enum(["BOUGHT", "WANT"]),
      drop: Money.nullable(),
      dropPct: z.number().int().positive().nullable(),
      price: Money,
      at: Timestamp,
    }),
  ),
  searches: z.array(
    z.object({
      query: z.string().min(1),
      product: z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable() }),
      drop: Money.nullable(),
      dropPct: z.number().int().positive().nullable(),
      price: Money,
      checkedAt: Timestamp,
    }),
  ),
  frequent: z.array(z.string().min(1)).max(8),
});
export type ForYou = z.infer<typeof ForYou>;

/** `GET /notifications/delivery-status` — digest on (pending count, time) and the daily cap. */
export const DeliveryStatus = z.object({
  digest: z.object({ on: z.boolean(), time: z.string().regex(/^\d{2}:\d{2}$/), pending: z.number().int().nonnegative() }),
  cap: z.object({ limit: z.number().int().positive(), sentToday: z.number().int().nonnegative(), deferred: z.number().int().nonnegative() }),
});
export type DeliveryStatus = z.infer<typeof DeliveryStatus>;

/**
 * `POST /notifications/:id/delivery-answer` [DECIDED 2026-11-19]: YES = delivered today (the return
 * deadline starts; editable on Product Detail) · NOT_YET = asked again in `notify.delivery_reask_days`,
 * at most `notify.delivery_reask_max` times.
 */
export const DeliveryAnswerRequest = z.object({ answer: z.enum(["YES", "NOT_YET"]) });
export const DeliveryAnswerResult = z.object({
  trackedItemId: Id,
  deliveredOn: CalendarDay.nullable(),
  returnDeadline: CalendarDay.nullable(),
  /** NOT_YET: when it is asked again; null when no ask is left. */
  nextAskAt: Timestamp.nullable(),
  asksLeft: z.number().int().nonnegative(),
});
export type DeliveryAnswerResult = z.infer<typeof DeliveryAnswerResult>;
