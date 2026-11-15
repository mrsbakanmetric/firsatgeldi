"use client";

// Product Detail header card (design v2, pagedesign.md §8.3): the Home Hemen Gözat header —
// image 120 with the status icon · flags ("Fırsat geldi" is the page's one coral element; return
// badge, "tahmini" while estimated; "Takvime ekle") · name (h1) · variant line · seller-less rating
// line · purchase line · check time; on the right "En çok kazanç" + "Satıcıları gör". Want to buy:
// "Almak istiyorum" + "Hedef · süre · N gün kaldı" flags, the target line, "Hedefe kalan" (or
// "Hedefe ulaştı ✓") on the right. "Teslim aldın mı?" while the last day is estimated (flows E).
// The action row inside the card: Takibi bitir (secondary) · Yanlış fiyat bildir · Farklı ürün
// bildir (ghost) on the left, the allowance + "Şimdi kontrol et" on the right; no allowance left →
// "Hakkın bitti · yarın tekrar" and "Otomatik kontroller sürüyor" (flows G). No ⋯ menu.
import { API_PREFIX, buildPath, ENDPOINTS, type ProductRatings, type TrackedItemDetail } from "@firsatgeldi/contracts";
import { daysBetween, formatNumber, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, cn, Flag, FreshnessLine, Icon } from "@firsatgeldi/ui";
import { Bookmark, CalendarPlus, CircleStop, Clock, Flag as FlagIcon, PackageX, Star, Target, Zap } from "lucide-react";
import { API_BASE_URL } from "../../lib/api/config";
import { ago, checkedAgo, money } from "../search-add/format";
import { CheckNowControls } from "../tracked-items/check-now";
import { shortDay } from "../tracked-items/format";
import { TrackedHeader } from "../tracked-items/header";
import { DeliveryPrompt } from "./delivery";

const RATING_DIGITS = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const MS_PER_DAY = 86_400_000;
/** Anchor of the offers section ("Satıcıları gör ↓"). */
export const OFFERS_ANCHOR = "saticilar";

function SeeSellers({ t }: { t: Translator }) {
  return (
    <a href={`#${OFFERS_ANCHOR}`} className="text-body-sm font-semibold text-primary">
      {t("productDetail.header.seeSellers")}
    </a>
  );
}

/** Want to buy, right side: "Hedefe kalan" + amount, "Hedefe ulaştı ✓", or the cheapest price when there is no target. */
function WantAside({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemDetail }) {
  const cheapest = item.cheapest;
  if (!cheapest) return null;
  const target = item.want?.targetPrice ?? null;
  const sub = t("productDetail.header.cheapestIn", { price: money(cheapest, locale), count: item.ranked.length + item.rankedMore });
  if (target === null) {
    return (
      <>
        <span className="text-caption text-text-muted">{t("productDetail.header.cheapestNow")}</span>
        <span className="text-display text-text">{money(cheapest, locale)}</span>
        <SeeSellers t={t} />
      </>
    );
  }
  const left = cheapest.amount - target.amount;
  return (
    <>
      {left > 0 ? (
        <>
          <span className="text-caption text-text-muted">{t("productDetail.header.toTarget")}</span>
          <span className="text-display text-text">{money({ amount: left, currency: cheapest.currency }, locale)}</span>
        </>
      ) : (
        <span className="text-h2 text-savings">{t("productDetail.header.reached")}</span>
      )}
      <span className="text-caption text-text-muted">{sub}</span>
      <SeeSellers t={t} />
    </>
  );
}

export function DetailHeader({
  t,
  locale,
  item,
  ratings,
  now,
  remaining,
  onEnd,
  onReport,
  onChanged,
}: {
  t: Translator;
  locale: Locale;
  item: TrackedItemDetail;
  ratings: ProductRatings | null;
  now: number;
  remaining: number | null;
  onEnd: () => void;
  onReport: (kind: "WRONG_PRICE" | "DIFFERENT_PRODUCT") => void;
  onChanged: () => void;
}) {
  const active = item.state === "ACTIVE";
  const want = item.mode === "WANT" ? item.want : null;
  const wantDaysLeft = want?.trackingEndsAt ? Math.max(0, Math.ceil((Date.parse(want.trackingEndsAt) - now) / MS_PER_DAY)) : null;
  const deal = active && item.deal && !item.stale ? item.deal : null;
  const left = active && item.returnDeadline ? daysBetween(toCalendarDay(new Date(now)), item.returnDeadline) : null;
  const purchase = item.purchase;
  const calendar = active && item.returnDeadline ? `${API_BASE_URL}${API_PREFIX}${buildPath(ENDPOINTS.getCalendar.path, { id: item.id })}` : null;

  const aside = !active || item.stale ? null : want ? (
    <WantAside t={t} locale={locale} item={item} />
  ) : deal ? (
    <>
      <span className="text-caption text-text-muted">{t("home.featured.maxGain")}</span>
      <span className="text-display text-savings">{money(deal.maxSaving, locale)}</span>
      <span className="text-caption text-text-muted">{t("productDetail.header.cheaperIn", { count: deal.cheaperCount })}</span>
      <SeeSellers t={t} />
    </>
  ) : (
    <span className="text-body-sm font-semibold text-text">{t("home.featured.cheapestNow")}</span>
  );

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
          {want && (
            <Flag tone="neutral" icon={Bookmark}>
              {t("productDetail.header.wantFlag")}
            </Flag>
          )}
          {want && active && (
            <Flag tone="info" icon={Target}>
              {[
                want.targetPrice ? t("productDetail.header.target", { price: money(want.targetPrice, locale) }) : t("productDetail.header.noTarget"),
                t(`searchAdd.confirm.durations.${want.trackingDuration}`),
                wantDaysLeft === null ? null : wantDaysLeft === 0 ? t("productDetail.header.lastDay") : t("productDetail.header.daysLeft", { count: wantDaysLeft }),
              ]
                .filter(Boolean)
                .join(t("common.listSeparator"))}
            </Flag>
          )}
          {left !== null && left >= 0 && item.returnDeadline && (
            <Flag tone={left <= RETURN_URGENT_DAYS ? "warning" : "info"} icon={Clock}>
              {[
                left === 0 ? t("home.featured.returnToday", { date: shortDay(item.returnDeadline, locale) }) : t("home.featured.returnFlag", { count: left, date: shortDay(item.returnDeadline, locale) }),
                item.returnDeadlineStatus === "ESTIMATED" ? t("productDetail.header.estimated") : null,
              ]
                .filter(Boolean)
                .join(t("common.listSeparator"))}
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
        {want && (
          <span className="text-body-sm font-medium text-text">
            {[want.targetPrice ? t("productDetail.header.wantTarget", { price: money(want.targetPrice, locale) }) : t("productDetail.header.noTarget"), t("productDetail.header.since", { date: shortDay(item.trackingStartedOn, locale) })].join(
              t("common.listSeparator"),
            )}
          </span>
        )}
        {item.lastCheckedAt && (
          <FreshnessLine stale={item.stale}>{item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}</FreshnessLine>
        )}
      </TrackedHeader>
      {active && item.deliveryPrompt && <DeliveryPrompt t={t} item={item} now={now} onChanged={onChanged} />}

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
          <span className="flex flex-col gap-1 md:ml-auto md:items-end">
            <CheckNowControls t={t} item={item} remaining={remaining} exhausted={t("productDetail.header.checksOut")} />
            {remaining === 0 && item.lastCheckedAt && <span className="text-caption text-text-muted">{t("productDetail.header.autoChecks", { ago: ago(t, item.lastCheckedAt, now) })}</span>}
          </span>
        </div>
      )}
    </section>
  );
}
