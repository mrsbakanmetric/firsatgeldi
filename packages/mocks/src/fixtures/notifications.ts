// Notification fixtures (design "5 Bildirimler" v2.1 Main + Panel): one or more of each drawn type
// for the user, created on first use. Product items point at the user's tracking seeds by key, so
// the mode, the own store and the delivery answer come from the tracked item itself. Values are in
// kuruş; times are minutes before now. No seller identity anywhere.
import type { NotificationType } from "@firsatgeldi/contracts";
import type { PRODUCTS } from "./catalog";
import { text, type Localized } from "./text";
import type { UserKey } from "./users";

const KURUS = 100;
const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface NotificationSeed {
  readonly key: string;
  readonly type: NotificationType;
  readonly minutesAgo: number;
  readonly read: boolean;
  readonly subject:
    | { readonly kind: "PRODUCT"; readonly product: keyof typeof PRODUCTS; readonly trackingSeed: string | null; readonly mode: "BOUGHT" | "WANT" | "NOT_TRACKED" }
    | { readonly kind: "ACCOUNT" }
    | { readonly kind: "PERSON"; readonly username: string };
  /** Kuruş amounts and the other values the type is worded from. */
  readonly values?: {
    readonly pricePaid?: number;
    readonly cheapest?: number;
    readonly saving?: number;
    readonly drop?: number;
    readonly dropPct?: number;
    readonly target?: number;
    readonly previousPrice?: number;
    readonly returnDaysLeft?: number;
    readonly storeCount?: number;
    readonly cheaperSellerCount?: number;
    readonly outOfStockDays?: number;
    readonly lowest30Days?: boolean;
    readonly trackingDaysLeft?: number;
    readonly report?: { readonly kind: "WRONG_PRICE" | "DIFFERENT_PRODUCT"; readonly outcome: "CORRECTED" | "DATA_CORRECT"; readonly reportedDaysAgo: number };
    readonly device?: { readonly browser: string; readonly os: string };
    readonly digest?: { readonly products: number; readonly changes: number; readonly lines: readonly NotificationType[] };
  };
  /** Minutes before now the price or stock was checked; null = nothing checked. */
  readonly checkedMinutesAgo: number | null;
  /** 14 daily cheapest prices (kuruş), oldest first: the preview chart. */
  readonly history?: readonly number[];
  readonly mandatory?: boolean;
}

const tl = (value: number) => value * KURUS;
const days14 = (from: number, to: number) => Array.from({ length: 14 }, (_, index) => tl(Math.round(from + ((to - from) * index) / 13)));

export const NOTIFICATION_SEEDS: Partial<Record<UserKey, readonly NotificationSeed[]>> = {
  user: [
    {
      key: "deal-ace",
      type: "DEAL_FOUND",
      minutesAgo: 30 * MINUTE,
      read: false,
      subject: { kind: "PRODUCT", product: "acePro2FlashPrint", trackingSeed: "ace-pro-2", mode: "BOUGHT" },
      values: { pricePaid: tl(28_999), cheapest: tl(25_997), saving: tl(3_002), returnDaysLeft: 4, cheaperSellerCount: 3 },
      checkedMinutesAgo: 2,
      history: days14(29_499, 25_997),
    },
    {
      key: "search-osmo",
      type: "SEARCHED_PRODUCT_DROP",
      minutesAgo: 2 * HOUR,
      read: false,
      subject: { kind: "PRODUCT", product: "osmoAction5Pro", trackingSeed: null, mode: "NOT_TRACKED" },
      values: { cheapest: tl(18_999), drop: tl(1_200), lowest30Days: true, storeCount: 9 },
      checkedMinutesAgo: 2 * HOUR,
      history: days14(20_199, 18_999),
    },
    {
      key: "return-dyson",
      type: "DEADLINE_SOON",
      minutesAgo: 5 * HOUR,
      read: false,
      subject: { kind: "PRODUCT", product: "dysonV15", trackingSeed: "dyson-v15", mode: "BOUGHT" },
      values: { returnDaysLeft: 2 },
      checkedMinutesAgo: 6,
    },
    {
      key: "delivery-x4",
      type: "DELIVERY_PROMPT",
      minutesAgo: 6 * HOUR,
      read: false,
      subject: { kind: "PRODUCT", product: "x4", trackingSeed: "insta360-x4", mode: "BOUGHT" },
      checkedMinutesAgo: 1 * HOUR,
    },
    {
      key: "deal-coat",
      type: "DEAL_FOUND",
      minutesAgo: 3 * DAY,
      read: true,
      subject: { kind: "PRODUCT", product: "winterCoat", trackingSeed: "winter-coat", mode: "BOUGHT" },
      values: { pricePaid: tl(3_299), cheapest: tl(2_999), saving: tl(300), cheaperSellerCount: 1 },
      checkedMinutesAgo: 3 * DAY,
    },
    {
      key: "ended-coat",
      type: "DEAL_ENDED",
      minutesAgo: 1 * DAY + 3 * HOUR,
      read: true,
      subject: { kind: "PRODUCT", product: "winterCoat", trackingSeed: "winter-coat", mode: "BOUGHT" },
      checkedMinutesAgo: 1 * HOUR,
    },
    {
      key: "drop-airpods",
      type: "PRICE_DROP",
      minutesAgo: 1 * DAY + 6 * HOUR,
      read: true,
      subject: { kind: "PRODUCT", product: "airPodsPro2", trackingSeed: "airpods-pro-2", mode: "WANT" },
      values: { dropPct: 4, cheapest: tl(8_150), target: tl(7_500), trackingDaysLeft: 18, storeCount: 15 },
      checkedMinutesAgo: 1 * DAY + 6 * HOUR,
      history: days14(8_699, 8_150),
    },
    {
      key: "stock-ace",
      type: "BACK_IN_STOCK",
      minutesAgo: 1 * DAY + 13 * HOUR,
      read: true,
      subject: { kind: "PRODUCT", product: "acePro2FlashPrint", trackingSeed: "ace-pro-2", mode: "BOUGHT" },
      values: { cheapest: tl(25_997), outOfStockDays: 3 },
      checkedMinutesAgo: 1 * DAY + 13 * HOUR,
    },
    { key: "follow-ayse", type: "FOLLOW_ACCEPTED", minutesAgo: 3 * DAY, read: true, subject: { kind: "PERSON", username: "ayse_d" }, checkedMinutesAgo: null },
    {
      key: "priceup-pocket",
      type: "REVEAL_PRICE_UP",
      minutesAgo: 4 * DAY,
      read: true,
      subject: { kind: "PRODUCT", product: "osmoPocket3", trackingSeed: "osmo-pocket-3", mode: "WANT" },
      values: { previousPrice: tl(16_499), cheapest: tl(17_199) },
      checkedMinutesAgo: 4 * DAY,
    },
    {
      key: "report-ace",
      type: "REPORT_RESOLVED",
      minutesAgo: 4 * DAY + 2 * HOUR,
      read: true,
      subject: { kind: "PRODUCT", product: "acePro2FlashPrint", trackingSeed: "ace-pro-2", mode: "BOUGHT" },
      values: { report: { kind: "WRONG_PRICE", outcome: "CORRECTED", reportedDaysAgo: 5 } },
      checkedMinutesAgo: null,
    },
    {
      key: "device",
      type: "NEW_DEVICE_SIGNIN",
      minutesAgo: 5 * DAY,
      read: true,
      subject: { kind: "ACCOUNT" },
      values: { device: { browser: "Chrome", os: "Windows" } },
      checkedMinutesAgo: null,
      mandatory: true,
    },
    {
      key: "saving-wh",
      type: "SAVING_RECORDED",
      minutesAgo: 6 * DAY,
      read: true,
      subject: { kind: "PRODUCT", product: "wh1000xm5", trackingSeed: "wh-1000xm5", mode: "BOUGHT" },
      values: { saving: tl(650) },
      checkedMinutesAgo: null,
    },
    // Older than `notify.list_days`: kept as evidence, not listed.
    {
      key: "old-drop",
      type: "PRICE_DROP",
      minutesAgo: 40 * DAY,
      read: true,
      subject: { kind: "PRODUCT", product: "airPodsPro2", trackingSeed: "airpods-pro-2", mode: "WANT" },
      values: { dropPct: 2, cheapest: tl(8_490) },
      checkedMinutesAgo: 40 * DAY,
    },
  ],
  newUser: [{ key: "welcome", type: "WELCOME", minutesAgo: 10 * MINUTE, read: false, subject: { kind: "ACCOUNT" }, checkedMinutesAgo: null, mandatory: true }],
  manager: [
    { key: "admin-fraud", type: "ADMIN_FRAUD_CASE", minutesAgo: 2 * HOUR, read: false, subject: { kind: "ACCOUNT" }, checkedMinutesAgo: null, mandatory: true },
    { key: "manager-device", type: "NEW_DEVICE_SIGNIN", minutesAgo: 2 * DAY, read: true, subject: { kind: "ACCOUNT" }, values: { device: { browser: "Safari", os: "macOS" } }, checkedMinutesAgo: null, mandatory: true },
  ],
};

/** "Senin için" › "Takip listende son düşüşler": by tracking seed. */
export const FOR_YOU_DROPS: Partial<Record<UserKey, readonly { trackingSeed: string; drop: number | null; dropPct: number | null; price: number; minutesAgo: number }[]>> = {
  user: [
    { trackingSeed: "ace-pro-2", drop: tl(3_002), dropPct: null, price: tl(25_997), minutesAgo: 3 * HOUR },
    { trackingSeed: "winter-coat", drop: tl(300), dropPct: null, price: tl(2_999), minutesAgo: 1 * DAY },
    { trackingSeed: "airpods-pro-2", drop: null, dropPct: 4, price: tl(8_150), minutesAgo: 1 * DAY + 6 * HOUR },
  ],
};

/** "Son aramaların" (not tracked): the product each search matched, its change and cheapest price. */
export const FOR_YOU_SEARCHES: Partial<Record<UserKey, readonly { query: Localized; product: keyof typeof PRODUCTS; drop: number | null; dropPct: number | null; price: number; checkedMinutesAgo: number }[]>> = {
  user: [
    { query: text("dji osmo action 5", "dji osmo action 5"), product: "osmoAction5Pro", drop: tl(1_200), dropPct: null, price: tl(18_999), checkedMinutesAgo: 2 * HOUR },
    { query: text("sony zv-e10", "sony zv-e10"), product: "zvE10II", drop: null, dropPct: 5, price: tl(32_499), checkedMinutesAgo: 10 },
    { query: text("gopro hero 13", "gopro hero 13"), product: "goProHero13", drop: null, dropPct: null, price: tl(21_999), checkedMinutesAgo: 1 * HOUR },
  ],
};

/** "Sık aradıkların". */
export const FREQUENT_SEARCHES: Partial<Record<UserKey, readonly Localized[]>> = {
  user: [text("aksiyon kamerası", "action camera"), text("insta360", "insta360"), text("airpods", "airpods"), text("kışlık mont", "winter coat"), text("dyson", "dyson")],
};
