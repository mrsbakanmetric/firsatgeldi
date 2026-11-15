"use client";

// Product Detail header card (design v2, pagedesign.md §8.3): the Home Hemen Gözat header —
// image 120 with the status icon · flags ("Fırsat geldi" is the page's one coral element; return
// badge; "Takvime ekle") · name (h1) · variant line · seller-less rating line · purchase line ·
// check time; on the right "En çok kazanç" + "Satıcıları gör". The action row inside the card:
// Takibi bitir (secondary) · Yanlış fiyat bildir · Farklı ürün bildir (ghost) on the left, the
// allowance + "Şimdi kontrol et" on the right. No ⋯ menu.
import { API_PREFIX, buildPath, ENDPOINTS, type ProductRatings, type TrackedItemDetail } from "@firsatgeldi/contracts";
import { daysBetween, formatNumber, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, cn, Flag, FreshnessLine, Icon } from "@firsatgeldi/ui";
import { CalendarPlus, CircleStop, Clock, Flag as FlagIcon, PackageX, Star, Zap } from "lucide-react";
import { API_BASE_URL } from "../../lib/api/config";
import { ago, checkedAgo, money } from "../search-add/format";
import { CheckNowControls } from "../tracked-items/check-now";
import { shortDay } from "../tracked-items/format";
import { TrackedHeader } from "../tracked-items/header";

const RATING_DIGITS = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
/** Anchor of the offers section ("Satıcıları gör ↓"). */
export const OFFERS_ANCHOR = "saticilar";

export function DetailHeader({
  t,
  locale,
  item,
  ratings,
  now,
  remaining,
  onEnd,
  onReport,
}: {
  t: Translator;
  locale: Locale;
  item: TrackedItemDetail;
  ratings: ProductRatings | null;
  now: number;
  remaining: number | null;
  onEnd: () => void;
  onReport: (kind: "WRONG_PRICE" | "DIFFERENT_PRODUCT") => void;
}) {
  const active = item.state === "ACTIVE";
  const deal = active && item.deal && !item.stale ? item.deal : null;
  const left = active && item.returnDeadline ? daysBetween(toCalendarDay(new Date(now)), item.returnDeadline) : null;
  const purchase = item.purchase;
  const calendar = active && item.returnDeadline ? `${API_BASE_URL}${API_PREFIX}${buildPath(ENDPOINTS.getCalendar.path, { id: item.id })}` : null;

  const aside = deal ? (
    <>
      <span className="text-caption text-text-muted">{t("home.featured.maxGain")}</span>
      <span className="text-display text-savings">{money(deal.maxSaving, locale)}</span>
      <span className="text-caption text-text-muted">{t("productDetail.header.cheaperIn", { count: deal.cheaperCount })}</span>
      <a href={`#${OFFERS_ANCHOR}`} className="text-body-sm font-semibold text-primary">
        {t("productDetail.header.seeSellers")}
      </a>
    </>
  ) : active && !item.stale ? (
    <span className="text-body-sm font-semibold text-text">{t("home.featured.cheapestNow")}</span>
  ) : null;

  return (
    <section
      aria-labelledby="pd-title"
      className={cn("flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-md md:p-6", deal ? "border-(length:--border-width-strong) border-savings" : "border border-border")}
    >
      <TrackedHeader t={t} item={item} aside={aside}>
        <div className="flex flex-wrap items-center gap-2">
          {deal && (
            // No "Fırsatı gör" on this page, so the flag is the surface's one coral element.
            <Flag tone="deal" icon={Zap}>
              {t("trackedItems.row.flags.deal")}
            </Flag>
          )}
          {left !== null && left >= 0 && item.returnDeadline && (
            <Flag tone={left <= RETURN_URGENT_DAYS ? "warning" : "info"} icon={Clock}>
              {left === 0 ? t("home.featured.returnToday", { date: shortDay(item.returnDeadline, locale) }) : t("home.featured.returnFlag", { count: left, date: shortDay(item.returnDeadline, locale) })}
            </Flag>
          )}
          {item.stale && (
            <Flag tone="warning" icon={Clock}>
              {t("trackedItems.row.flags.stale")}
            </Flag>
          )}
          {!active && <Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>}
          {calendar && (
            <a href={calendar} download className="inline-flex min-h-(--size-touch-target-min) items-center gap-1 text-caption font-semibold text-primary">
              <Icon icon={CalendarPlus} size="sm" />
              {t("productDetail.header.calendar")}
            </a>
          )}
        </div>
        <h1 id="pd-title" className="text-h1 text-text">
          {item.product.name}
        </h1>
        {item.product.variantLine && <span className="text-body-sm text-text-muted">{item.product.variantLine}</span>}
        {ratings?.average && (
          <span className="inline-flex flex-wrap items-center gap-1 text-caption text-text-muted">
            <Icon icon={Star} size="sm" />
            <strong className="font-semibold text-text">{t("productDetail.header.ratingValue", { rating: formatNumber(ratings.average.value, locale, RATING_DIGITS), scale: ratings.average.scale })}</strong>
            <span>
              {[
                t("productDetail.header.ratingStores", { count: ratings.storeCount, ratings: formatNumber(ratings.average.count ?? 0, locale) }),
                ratings.few ? t("productDetail.header.ratingFew") : null,
                ratings.readAt ? t("productDetail.header.ratingRead", { ago: ago(t, ratings.readAt, now) }) : null,
              ]
                .filter(Boolean)
                .join(t("common.listSeparator"))}
            </span>
          </span>
        )}
        {purchase && (
          <span className="text-body-sm font-medium text-text">
            {[
              t("productDetail.header.paid", { price: money(purchase.pricePaid, locale) }),
              purchase.platformName,
              purchase.sellerName && purchase.sellerName !== purchase.platformName ? purchase.sellerName : null,
              shortDay(purchase.orderedOn, locale),
              t(`searchAdd.confirm.status.${purchase.orderStatus}`),
            ]
              .filter(Boolean)
              .join(t("common.listSeparator"))}
          </span>
        )}
        {item.lastCheckedAt && (
          <FreshnessLine stale={item.stale}>{item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}</FreshnessLine>
        )}
      </TrackedHeader>

      {active && (
        <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-4">
          <Button variant="secondary" size="compact" icon={CircleStop} onClick={onEnd}>
            {t("trackedItems.v3.end")}
          </Button>
          <Button variant="ghost" size="compact" icon={FlagIcon} onClick={() => onReport("WRONG_PRICE")}>
            {t("productDetail.report.wrongPrice")}
          </Button>
          <Button variant="ghost" size="compact" icon={PackageX} onClick={() => onReport("DIFFERENT_PRODUCT")}>
            {t("productDetail.report.differentProduct")}
          </Button>
          <span className="md:ml-auto">
            <CheckNowControls t={t} item={item} remaining={remaining} />
          </span>
        </div>
      )}
    </section>
  );
}
