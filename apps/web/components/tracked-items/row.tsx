"use client";

// One Tracked Items row (design "4 Takip Ettiklerim" v2; pagedesign.md §8.4;
// modules.md Tracked Items › Each product): image 48 · flags/name/line · 14-day
// price sparkline + conclusion · 14-day stock + state in words · state + check
// time. The whole row links to Product Detail. Cheaper sellers only as counts
// and amounts (no seller name, no "Göster" on this page). No coral here.
import type { Money, TrackedItemListItem } from "@firsatgeldi/contracts";
import { daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Flag, FreshnessLine, Icon, PriceSparkline, ProductImage, ProductRow, type ProductRowColumn, StockStrip } from "@firsatgeldi/ui";
import { CircleCheck, Clock, Package, Zap } from "lucide-react";
import { ago, checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../search-add/search-box";
import { shortDay } from "./format";

const MS_PER_HOUR = 3_600_000;

function sep(t: Translator): string {
  return t("common.listSeparator");
}

/** "Aldın 28.999 TL · Kamera Dünyası · Hepsiburada · 1 Kas · Teslim alındı" / "Hedef 7.500 TL · 1 ay takip · 18 gün kaldı". */
function purchaseLine(t: Translator, locale: Locale, item: TrackedItemListItem, now: number): string | null {
  if (item.ended) {
    return t("trackedItems.row.ended.line", { reason: t(`trackedItems.row.ended.reason.${item.ended.reason}`), date: shortDay(toCalendarDay(new Date(item.ended.at)), locale) });
  }
  if (item.purchase) {
    const { pricePaid, sellerName, platformName, orderedOn, orderStatus } = item.purchase;
    return [
      t("trackedItems.row.bought", { price: money(pricePaid, locale) }),
      sellerName && sellerName !== platformName ? sellerName : null,
      platformName,
      shortDay(orderedOn, locale),
      orderStatus === "ORDERED" ? null : t(`trackedItems.row.orderStatus.${orderStatus}`),
    ]
      .filter(Boolean)
      .join(sep(t));
  }
  if (item.want) {
    const left = item.want.trackingEndsAt ? daysBetween(toCalendarDay(new Date(now)), toCalendarDay(new Date(item.want.trackingEndsAt))) : null;
    return [
      item.want.targetPrice ? t("trackedItems.row.target", { price: money(item.want.targetPrice, locale) }) : t("trackedItems.row.noTarget"),
      t(`trackedItems.row.duration.${item.want.trackingDuration}`),
      left !== null && left >= 0 ? t("trackedItems.row.daysLeft", { count: left }) : null,
    ]
      .filter(Boolean)
      .join(sep(t));
  }
  return null;
}

function Flags({ t, item, today }: { t: Translator; item: TrackedItemListItem; today: string }) {
  if (item.state !== "ACTIVE") return <Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>;
  const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
  return (
    <>
      {item.deal && !item.stale && (
        <Flag tone="neutral" icon={Zap}>
          {t("trackedItems.row.flags.deal")}
        </Flag>
      )}
      {item.mode === "WANT" && <Flag tone="neutral">{t("trackedItems.row.flags.want")}</Flag>}
      {left !== null && left >= 0 && (
        // Amber at ≤ 3 days, otherwise the neutral info style (product_design_pattern.md §5.4).
        <Flag tone={left <= RETURN_URGENT_DAYS ? "warning" : "info"} icon={Clock}>
          {left === 0 ? t("trackedItems.row.flags.returnToday") : t("trackedItems.row.flags.returnDays", { count: left })}
        </Flag>
      )}
      {item.stale && (
        <Flag tone="warning" icon={Clock}>
          {t("trackedItems.row.flags.stale")}
        </Flag>
      )}
    </>
  );
}

function chartLabel(t: Translator, locale: Locale, item: TrackedItemListItem): string {
  const cheapest = item.cheapest ? money(item.cheapest, locale) : null;
  if (!cheapest) return t("trackedItems.row.chart.noData");
  if (item.purchase) return t("trackedItems.row.chart.paidAndCheapest", { paid: money(item.purchase.pricePaid, locale), cheapest });
  if (item.want?.targetPrice) return t("trackedItems.row.chart.targetAndCheapest", { target: money(item.want.targetPrice, locale), cheapest });
  return t("trackedItems.row.chart.cheapest", { cheapest });
}

function conclusion(t: Translator, locale: Locale, item: TrackedItemListItem, now: number): string | null {
  if (item.stale && item.cheapest) return t("trackedItems.row.lastKnown", { price: money(item.cheapest, locale) });
  const found = item.conclusion;
  if (!found) return null;
  if (found.kind === "DROPPED") return t("trackedItems.row.conclusion.dropped", { ago: ago(t, found.at, now), price: money(found.price, locale) });
  if (found.kind === "NO_CHEAPER") return t("trackedItems.row.conclusion.noCheaper", { count: found.days });
  return t("trackedItems.row.conclusion.lowest", { count: found.days, price: money(found.price, locale) });
}

/** "Stokta · en az 7 gündür": the current state and how many days in a row it has held. */
function stockText(t: Translator, item: TrackedItemListItem, now: number): string {
  if (item.stale && item.lastCheckedAt) {
    return t("trackedItems.row.staleStock", { count: Math.max(1, Math.floor((now - Date.parse(item.lastCheckedAt)) / MS_PER_HOUR)) });
  }
  const days = item.stockHistory.days;
  const current = days.at(-1);
  if (!current) return t("trackedItems.row.stock.noData");
  let run = 0;
  for (let index = days.length - 1; index >= 0 && days[index] === current; index -= 1) run += 1;
  return t("trackedItems.row.stock.since", { state: t(`trackedItems.row.stock.${current}`), count: run });
}

function stateText(t: Translator, locale: Locale, item: TrackedItemListItem): { text: string; saving: boolean } {
  if (item.deal && item.stale) return { text: t("trackedItems.row.state.unverified"), saving: false };
  if (item.deal && item.mode === "BOUGHT") return { text: t("trackedItems.row.state.deal", { count: item.deal.cheaperCount, amount: money(item.deal.maxSaving, locale) }), saving: true };
  if (!item.cheapest) return { text: t("trackedItems.row.state.noPrice"), saving: false };
  const cheapest = money(item.cheapest, locale);
  if (item.mode === "BOUGHT") return { text: t("trackedItems.row.state.cheapestYours"), saving: false };
  const target = item.want?.targetPrice;
  if (target && item.deal) return { text: t("trackedItems.row.state.belowTarget", { price: cheapest }), saving: true };
  if (target) return { text: t("trackedItems.row.state.toTarget", { amount: money(difference(item.cheapest, target), locale) }), saving: false };
  return { text: t("trackedItems.row.state.cheapestNow", { price: cheapest }), saving: false };
}

function difference(a: Money, b: Money): Money {
  return { amount: Math.max(0, a.amount - b.amount), currency: a.currency };
}

/** Purchase day inside the 14-day window → the hollow "Aldın" point. */
function paidIndex(item: TrackedItemListItem): number | null {
  if (!item.purchase) return null;
  const index = daysBetween(item.priceHistory.from, item.purchase.orderedOn);
  return index >= 0 && index < item.priceHistory.cheapest.length ? index : null;
}

export function TrackedRow({ t, locale, item, now }: { t: Translator; locale: Locale; item: TrackedItemListItem; now: number }) {
  const today = toCalendarDay(new Date(now));
  const href = localizedPath("/takip/[id]", locale, { id: item.id });
  const image = <ProductImage src={imageUrl(item.product.imageSha256)} size="sm" fallbackIcon={Package} />;
  const line = purchaseLine(t, locale, item, now);

  if (item.ended) {
    const saving = item.ended.savingRecorded;
    const columns: ProductRowColumn[] = [
      {
        key: "saving",
        width: "1/4",
        content: saving ? (
          <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-savings">
            <Icon icon={CircleCheck} size="sm" />
            {t("trackedItems.row.ended.saving", { amount: money(saving, locale) })}
          </span>
        ) : (
          <span className="text-body-sm text-text-muted">{t("trackedItems.row.ended.noSaving")}</span>
        ),
      },
    ];
    return <ProductRow href={href} image={image} flags={<Flags t={t} item={item} today={today} />} title={item.product.name} line={line} columns={columns} dimmed />;
  }

  const state = stateText(t, locale, item);
  const said = conclusion(t, locale, item, now);
  const columns: ProductRowColumn[] = [
    {
      key: "price",
      width: "1/4",
      content: (
        <>
          <PriceSparkline
            cheapest={item.priceHistory.cheapest}
            paid={item.purchase?.pricePaid.amount ?? null}
            paidIndex={paidIndex(item)}
            target={item.want?.targetPrice?.amount ?? null}
            label={chartLabel(t, locale, item)}
          />
          {(said ?? !item.cheapest) && <span className="text-caption text-text-muted">{said ?? t("trackedItems.row.chart.noData")}</span>}
        </>
      ),
    },
    {
      key: "stock",
      width: "1/6",
      content: (
        <>
          <StockStrip days={item.stockHistory.days} label={stockText(t, item, now)} />
          <span className="text-caption text-text">{stockText(t, item, now)}</span>
          <span className="text-caption text-text-muted">{t(`trackedItems.row.stock.${item.stockHistory.subject}`)}</span>
        </>
      ),
    },
    {
      key: "state",
      width: "1/5",
      phoneFull: true,
      content: (
        <>
          <span className={state.saving ? "text-body-sm font-semibold text-savings" : "text-body-sm font-semibold text-text"}>{state.text}</span>
          {item.lastCheckedAt && (
            <FreshnessLine stale={item.stale}>
              {item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}
            </FreshnessLine>
          )}
        </>
      ),
    },
  ];
  return <ProductRow href={href} image={image} flags={<Flags t={t} item={item} today={today} />} title={item.product.name} line={line} columns={columns} />;
}
