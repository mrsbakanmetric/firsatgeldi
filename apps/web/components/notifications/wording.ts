// How a notification reads and where it leads (design "5 Bildirimler" v2.1; modules.md
// Notifications › Notification types; decisions 2026-11-19). One place for the page and the bell
// panel: type label, title, message, the line under it (with the check time) and the actions.
// Never a seller; the own store only in the preview ("Hepsiburada · 1 Kasım'da aldın").
import type { NotificationItem } from "@firsatgeldi/contracts";
import { DEFAULT_TIME_ZONE, formatAtTime, formatTime } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { BadgeCheck, Bell, Clock, KeyRound, Lock, type LucideIcon, PackageCheck, PiggyBank, Search, Sparkles, TrendingDown, TrendingUp, Truck, UserCheck, Undo2 } from "lucide-react";
import type { NotificationBadgeTone } from "@firsatgeldi/ui";
import { searchAddHref } from "../../lib/handoff";
import { changePasswordHref, settingsHref } from "../../lib/settings/sections";
import { ago, money } from "../search-add/format";

/** An action of a notification: a link, or one of the delivery answers. */
export type NotificationAction =
  | { kind: "link"; label: string; href: string; primary: boolean }
  | { kind: "delivery"; answer: "YES" | "NOT_YET"; label: string };

export interface NotificationWording {
  type: string;
  title: string;
  /** Where the title leads (null: plain text). */
  titleHref: string | null;
  body: string;
  meta: string | null;
  badge: { icon: LucideIcon; tone: NotificationBadgeTone };
  /** Lock (account) or person (follow) tile instead of a product image. */
  tile: LucideIcon | null;
  actions: NotificationAction[];
  /** "Fırsatı gör" — the coral action when it is the first unread deal. */
  isDeal: boolean;
}

const BADGES: Partial<Record<NotificationItem["type"], { icon: LucideIcon; tone: NotificationBadgeTone }>> = {
  DEAL_FOUND: { icon: Sparkles, tone: "ink" },
  DEAL_ENDED: { icon: Clock, tone: "muted" },
  SEARCHED_PRODUCT_DROP: { icon: Search, tone: "info" },
  DEADLINE_SOON: { icon: Undo2, tone: "warning" },
  RETURN_REMINDER: { icon: Undo2, tone: "warning" },
  DELIVERY_PROMPT: { icon: Truck, tone: "info-subtle" },
  PRICE_DROP: { icon: TrendingDown, tone: "primary" },
  TARGET_REACHED: { icon: TrendingDown, tone: "primary" },
  BACK_IN_STOCK: { icon: PackageCheck, tone: "primary" },
  SAVING_RECORDED: { icon: PiggyBank, tone: "primary" },
  TRACKING_EXPIRING: { icon: Clock, tone: "muted" },
  FOLLOW_ACCEPTED: { icon: UserCheck, tone: "primary" },
  REVEAL_PRICE_UP: { icon: TrendingUp, tone: "warning" },
  REPORT_RESOLVED: { icon: BadgeCheck, tone: "info-subtle" },
  DIGEST: { icon: Bell, tone: "primary" },
};
const ACCOUNT_BADGE = { icon: KeyRound, tone: "info" as const };

const ZONE = { timeZone: DEFAULT_TIME_ZONE } as const;
const dayKey = new Intl.DateTimeFormat("en-CA", { ...ZONE, dateStyle: "short" });

/** Days between two instants as calendar days in the display zone (0 = same day). */
export function calendarDaysAgo(iso: string, now: number): number {
  return Math.round((Date.parse(dayKey.format(new Date(now))) - Date.parse(dayKey.format(new Date(iso)))) / 86_400_000);
}

/** "14:32" today or yesterday, "12 Kas" before (as drawn). */
export function notificationTime(locale: Locale, iso: string, now: number): string {
  const date = new Date(iso);
  return calendarDaysAgo(iso, now) < 2 ? formatTime(date, locale) : new Intl.DateTimeFormat(locale, { ...ZONE, day: "numeric", month: "short" }).format(date);
}

/** "12:10'da" today, "11 Kas 16:20'de" before (checked times, as drawn). */
function checkedAt(locale: Locale, iso: string, now: number): string {
  return formatAtTime(new Date(iso), locale, { withDate: calendarDaysAgo(iso, now) > 0 });
}

/** "14 Kasım" · "November 14" (a calendar day without the year). */
const longDay = (locale: Locale, day: string) => new Intl.DateTimeFormat(locale, { ...ZONE, day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));

export function productHref(locale: Locale, item: NotificationItem): string | null {
  if (item.subject.kind !== "PRODUCT") return null;
  if (item.subject.trackedItemId) return localizedPath("/takip/[id]", locale, { id: item.subject.trackedItemId });
  return searchAddHref(locale, { productId: item.subject.product.id, backToTracking: true });
}

export function wordNotification(t: Translator, locale: Locale, item: NotificationItem, now: number): NotificationWording {
  const v = item.values;
  const m = (value: typeof v.cheapest) => (value ? money(value, locale) : "");
  const product = item.subject.kind === "PRODUCT" ? item.subject.product.name : null;
  const detail = productHref(locale, item);
  const link = (label: string, href: string | null, primary = false): NotificationAction[] => (href ? [{ kind: "link", label, href, primary }] : []);
  const priceAt = v.checkedAt ? t("notifications.meta.priceAt", { at: checkedAt(locale, v.checkedAt, now) }) : null;
  const base = {
    type: t(`notifications.types.${item.type}`),
    badge: BADGES[item.type] ?? ACCOUNT_BADGE,
    tile: item.subject.kind === "ACCOUNT" ? Lock : item.subject.kind === "PERSON" ? UserCheck : null,
    isDeal: false,
  };
  const productTitle = { title: product ?? "", titleHref: detail };

  switch (item.type) {
    case "DEAL_FOUND":
      return {
        ...base,
        ...productTitle,
        isDeal: true,
        body: v.returnDaysLeft !== null ? t("notifications.bodies.DEAL_FOUND", { count: v.returnDaysLeft, paid: m(v.pricePaid), cheapest: m(v.cheapest), saving: m(v.saving) }) : t("notifications.bodies.DEAL_FOUND_NO_RETURN", { paid: m(v.pricePaid), cheapest: m(v.cheapest), saving: m(v.saving) }),
        meta: v.checkedAt ? t("notifications.meta.checkedAgo", { ago: ago(t, v.checkedAt, now) }) : null,
        actions: link(t("notifications.actions.seeDeal"), detail, true),
      };
    case "SEARCHED_PRODUCT_DROP":
      return {
        ...base,
        ...productTitle,
        body: t("notifications.bodies.SEARCHED_PRODUCT_DROP", { drop: m(v.drop), cheapest: m(v.cheapest) }),
        meta: v.checkedAt && v.storeCount !== null ? t("notifications.meta.priceAtStores", { count: v.storeCount, at: checkedAt(locale, v.checkedAt, now) }) : priceAt,
        actions: item.subject.kind === "PRODUCT" ? link(t("notifications.actions.track"), searchAddHref(locale, { productId: item.subject.product.id, backToTracking: true }), true) : [],
      };
    case "DEADLINE_SOON":
      return {
        ...base,
        ...productTitle,
        body: t("notifications.bodies.DEADLINE_SOON", { count: v.returnDaysLeft ?? 0, date: v.returnDeadline ? longDay(locale, v.returnDeadline) : "" }),
        meta: v.deliveredOn && v.returnPeriodDays !== null ? t("notifications.meta.delivered", { count: v.returnPeriodDays, date: longDay(locale, v.deliveredOn) }) : null,
        actions: link(t("notifications.actions.returnSteps"), detail),
      };
    case "RETURN_REMINDER":
      return { ...base, ...productTitle, body: t("notifications.bodies.RETURN_REMINDER"), meta: null, actions: link(t("notifications.actions.returnSteps"), detail) };
    case "DELIVERY_PROMPT":
      return {
        ...base,
        ...productTitle,
        body: t("notifications.bodies.DELIVERY_PROMPT"),
        meta: v.orderedOn && v.orderStatus ? t("notifications.meta.ordered", { date: longDay(locale, v.orderedOn), status: t(`notifications.meta.orderStatus.${v.orderStatus}`) }) : null,
        actions: item.awaitingAnswer
          ? [
              { kind: "delivery", answer: "YES", label: t("notifications.actions.yes") },
              { kind: "delivery", answer: "NOT_YET", label: t("notifications.actions.notYet") },
            ]
          : link(t("notifications.actions.product"), detail),
      };
    case "DEAL_ENDED":
      return { ...base, ...productTitle, body: t("notifications.bodies.DEAL_ENDED"), meta: v.checkedAt ? t("notifications.meta.priceAt", { at: ago(t, v.checkedAt, now) }) : null, actions: link(t("notifications.actions.product"), detail) };
    case "PRICE_DROP":
    case "TARGET_REACHED": {
      const drop = item.type === "TARGET_REACHED" ? t("notifications.bodies.TARGET_REACHED", { cheapest: m(v.cheapest) }) : v.dropPct !== null ? t("notifications.bodies.PRICE_DROP", { pct: v.dropPct, cheapest: m(v.cheapest) }) : t("notifications.bodies.PRICE_DROP_AMOUNT", { drop: m(v.drop), cheapest: m(v.cheapest) });
      const left = item.type === "PRICE_DROP" && v.target && v.cheapest && v.cheapest.amount > v.target.amount ? t("notifications.bodies.TARGET_LEFT", { target: m(v.target), left: money({ amount: v.cheapest.amount - v.target.amount, currency: v.cheapest.currency }, locale) }) : null;
      return { ...base, ...productTitle, body: left ? [drop, left].join(" ") : drop, meta: priceAt, actions: link(t("notifications.actions.product"), detail) };
    }
    case "BACK_IN_STOCK":
      return {
        ...base,
        ...productTitle,
        body: t("notifications.bodies.BACK_IN_STOCK"),
        meta: v.checkedAt && v.outOfStockDays !== null ? t("notifications.meta.stockAt", { count: v.outOfStockDays, at: checkedAt(locale, v.checkedAt, now) }) : priceAt,
        actions: link(t("notifications.actions.product"), detail),
      };
    case "TRACKING_EXPIRING":
      return { ...base, ...productTitle, body: t("notifications.bodies.TRACKING_EXPIRING", { count: v.trackingDaysLeft ?? 0 }), meta: null, actions: link(t("notifications.actions.product"), detail) };
    case "SAVING_RECORDED":
      return { ...base, ...productTitle, body: t("notifications.bodies.SAVING_RECORDED", { saving: m(v.saving) }), meta: t("notifications.meta.savingRecorded"), actions: link(t("notifications.actions.savings"), localizedPath("/kazancim", locale)) };
    case "REVEAL_PRICE_UP":
      return { ...base, ...productTitle, body: t("notifications.bodies.REVEAL_PRICE_UP", { from: m(v.previousPrice), to: m(v.cheapest) }), meta: priceAt, actions: link(t("notifications.actions.product"), detail) };
    case "REPORT_RESOLVED": {
      const key = v.report?.outcome === "DATA_CORRECT" ? "REPORT_DATA_CORRECT" : v.report?.kind === "DIFFERENT_PRODUCT" ? "REPORT_MATCH_CORRECTED" : "REPORT_CORRECTED";
      return { ...base, ...productTitle, body: t(`notifications.bodies.${key}`), meta: v.report ? t("notifications.meta.reported", { date: longDay(locale, v.report.reportedOn) }) : null, actions: link(t("notifications.actions.product"), detail) };
    }
    case "FOLLOW_ACCEPTED":
      return { ...base, title: t("notifications.titles.FOLLOW_ACCEPTED", { username: item.subject.kind === "PERSON" ? item.subject.username : "" }), titleHref: null, body: t("notifications.bodies.FOLLOW_ACCEPTED"), meta: t("notifications.meta.inAppOnly"), actions: [] };
    case "DIGEST":
      return { ...base, title: t("notifications.titles.DIGEST"), titleHref: null, body: t("notifications.bodies.DIGEST", { products: v.digest?.products ?? 0, changes: v.digest?.changes ?? 0 }), meta: null, actions: [] };
    case "NEW_DEVICE_SIGNIN":
      return {
        ...base,
        title: t("notifications.titles.NEW_DEVICE_SIGNIN"),
        titleHref: settingsHref(locale, "security"),
        body: t("notifications.bodies.NEW_DEVICE_SIGNIN", { device: v.device ? [v.device.browser, v.device.os].join(t("common.listSeparator")) : "" }),
        meta: t("notifications.meta.mandatory"),
        actions: link(t("notifications.actions.notMe"), changePasswordHref(locale)),
      };
    default: {
      // Account and admin items: the related page where there is one, no action otherwise.
      const target = item.type === "DATA_EXPORT_READY" ? { label: t("notifications.actions.myData"), href: settingsHref(locale, "data") } : item.type === "PACKAGE_REQUEST_RESULT" ? { label: t("notifications.actions.plan"), href: localizedPath("/paketim", locale) } : item.type === "WELCOME" ? { label: t("notifications.actions.addProduct"), href: searchAddHref(locale) } : null;
      return {
        ...base,
        title: t(`notifications.titles.${item.type as Exclude<NotificationItem["type"], DrawnProductType>}`),
        titleHref: target?.href ?? null,
        body: t(`notifications.bodies.${item.type as Exclude<NotificationItem["type"], DrawnProductType>}`),
        meta: item.mandatory ? t("notifications.meta.mandatory") : null,
        actions: target ? link(target.label, target.href) : [],
      };
    }
  }
}

/** Types worded above with a product (the rest have their own title and body keys). */
type DrawnProductType =
  | "DEAL_FOUND"
  | "PRICE_DROP"
  | "DEADLINE_SOON"
  | "RETURN_REMINDER"
  | "TARGET_REACHED"
  | "BACK_IN_STOCK"
  | "DELIVERY_PROMPT"
  | "TRACKING_EXPIRING"
  | "SAVING_RECORDED"
  | "REVEAL_PRICE_UP"
  | "REPORT_RESOLVED"
  | "DEAL_ENDED"
  | "SEARCHED_PRODUCT_DROP";
