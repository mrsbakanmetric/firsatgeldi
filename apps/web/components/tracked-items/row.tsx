"use client";

// One Tracked Items row (pagedesign.md §8.4 design v3; modules.md Tracked Items "List
// v3"): image 48 · status ("Takip ediyorsun" / "Almak istiyorsun") · name/line · price
// block (current price + change over the period; chart with min/max, lowest point,
// "Sen …" on the paid line, hover read-out) · stock in plain words · state + check
// time. A row with a deal sits on savings-subtle with the saving large and
// "Fırsatı gör". The whole row links to Product Detail; "Fırsatı gör" and the ⋯ menu
// sit above that link. Cheaper sellers only as counts and amounts; no "Göster" here.
import type { TrackedItemListItem } from "@firsatgeldi/contracts";
import { addCalendarDays, daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, Flag, FreshnessLine, Icon, Menu, PriceSparkline, ProductImage, ProductRow, type ProductRowColumn } from "@firsatgeldi/ui";
import { CircleCheck, Clock, Ellipsis, Package, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ago, checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../search-add/search-box";
import { shortDay } from "./format";

const MS_PER_HOUR = 3_600_000;
const PERCENT = 100;
const CURRENCY = "TRY" as const;

function sep(t: Translator): string {
  return t("common.listSeparator");
}

function tl(amount: number, locale: Locale): string {
  return money({ amount, currency: CURRENCY }, locale);
}

/** "Aldın 28.999 TL · Kamera Dünyası · Hepsiburada · 1 Kasım · Teslim alındı" / "Hedef 7.500 TL · 1 ay takip · 18 gün kaldı". */
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

/** Status badge (v3) instead of mode filters, plus the return and stale flags. Never coral here (the coral badge is the group heading). */
function Flags({ t, item, today }: { t: Translator; item: TrackedItemListItem; today: string }) {
  if (item.state !== "ACTIVE") return <Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>;
  const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
  return (
    <>
      <Flag tone="neutral">{t(`trackedItems.v3.status.${item.mode}`)}</Flag>
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

/** "↓ 1.250 TL (%4) · 14 gün": first known day of the period against the latest. */
function change(t: Translator, locale: Locale, item: TrackedItemListItem): string | null {
  const values = item.priceHistory.cheapest;
  const firstIndex = values.findIndex((value) => value !== null);
  const first = firstIndex >= 0 ? values[firstIndex] : null;
  const last = [...values].reverse().find((value): value is number => value !== null) ?? null;
  if (first === null || first === undefined || last === null || firstIndex === values.length - 1) return null;
  const count = values.length - firstIndex;
  const diff = last - first;
  if (diff === 0) return t("trackedItems.v3.change.same", { count });
  const percent = Math.max(1, Math.round((Math.abs(diff) / first) * PERCENT));
  return t(diff < 0 ? "trackedItems.v3.change.down" : "trackedItems.v3.change.up", { count, amount: tl(Math.abs(diff), locale), percent });
}

/** "Stokta · en az 3 gündür" · "Az kaldı" · "Tükendi · 2 gündür" (v3: plain words, no bars). */
function stockText(t: Translator, item: TrackedItemListItem, now: number): string {
  if (item.stale && item.lastCheckedAt) {
    return t("trackedItems.row.staleStock", { count: Math.max(1, Math.floor((now - Date.parse(item.lastCheckedAt)) / MS_PER_HOUR)) });
  }
  const days = item.stockHistory.days;
  const current = days.at(-1);
  if (!current) return t("trackedItems.row.stock.noData");
  if (current === "LOW_STOCK") return t("trackedItems.v3.stock.LOW_STOCK");
  let run = 0;
  for (let index = days.length - 1; index >= 0 && days[index] === current; index -= 1) run += 1;
  return t(`trackedItems.v3.stock.${current}`, { count: run });
}

function stateText(t: Translator, locale: Locale, item: TrackedItemListItem): string {
  if (item.deal && item.stale) return t("trackedItems.row.state.unverified");
  if (!item.cheapest) return t("trackedItems.row.state.noPrice");
  const cheapest = money(item.cheapest, locale);
  if (item.mode === "BOUGHT") return t("trackedItems.row.state.cheapestYours");
  const target = item.want?.targetPrice;
  if (target) return t("trackedItems.row.state.toTarget", { amount: tl(Math.max(0, item.cheapest.amount - target.amount), locale) });
  return t("trackedItems.row.state.cheapestNow", { price: cheapest });
}

function PriceBlock({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemListItem }) {
  const values = item.priceHistory.cheapest.filter((value): value is number => value !== null);
  const moved = change(t, locale, item);
  if (!item.cheapest && !values.length) return <span className="text-caption text-text-muted">{t("trackedItems.row.chart.noData")}</span>;
  return (
    <>
      <span className="flex flex-wrap items-baseline gap-x-2">
        {/* Stale: the price is the last known one, and says so (modules.md Tracked Items › States). */}
        {item.cheapest && item.stale ? (
          <span className="text-body-sm font-semibold text-on-warning-subtle">{t("trackedItems.row.lastKnown", { price: money(item.cheapest, locale) })}</span>
        ) : (
          item.cheapest && <span className="text-price text-text tabular-nums">{money(item.cheapest, locale)}</span>
        )}
        {moved && !item.stale && <span className="text-caption text-text-muted">{moved}</span>}
      </span>
      {values.length > 0 && (
        <PriceSparkline
          className="my-4"
          cheapest={item.priceHistory.cheapest}
          paid={item.purchase?.pricePaid.amount ?? null}
          target={item.want?.targetPrice?.amount ?? null}
          labels={{
            min: t("trackedItems.v3.chart.min", { price: tl(Math.min(...values), locale) }),
            max: t("trackedItems.v3.chart.max", { price: tl(Math.max(...values), locale) }),
            cheapest: t("trackedItems.v3.chart.cheapest"),
            ...(item.purchase ? { paid: t("trackedItems.v3.chart.paid", { price: money(item.purchase.pricePaid, locale) }) } : {}),
            ...(item.want?.targetPrice ? { target: t("trackedItems.v3.chart.target", { price: money(item.want.targetPrice, locale) }) } : {}),
          }}
          readout={(index, value) => t("trackedItems.v3.chart.readout", { day: shortDay(addCalendarDays(item.priceHistory.from, index), locale), price: tl(value, locale) })}
          label={chartLabel(t, locale, item)}
        />
      )}
    </>
  );
}

export interface TrackedRowProps {
  t: Translator;
  locale: Locale;
  item: TrackedItemListItem;
  now: number;
  onEnd: (item: TrackedItemListItem) => void;
  onRestore: (item: TrackedItemListItem) => void;
  restoring?: boolean;
}

export function TrackedRow({ t, locale, item, now, onEnd, onRestore, restoring = false }: TrackedRowProps) {
  const today = toCalendarDay(new Date(now));
  const href = localizedPath("/takip/[id]", locale, { id: item.id });
  const image = <ProductImage src={imageUrl(item.product.imageSha256)} size="sm" fallbackIcon={Package} />;
  const line = purchaseLine(t, locale, item, now);
  const flags = <Flags t={t} item={item} today={today} />;

  if (item.ended) {
    const saving = item.ended.savingRecorded;
    const restorable = item.ended.restorableUntil !== null && Date.parse(item.ended.restorableUntil) > now;
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
    return (
      <ProductRow
        href={href}
        image={image}
        flags={flags}
        title={item.product.name}
        line={line}
        columns={columns}
        dimmed
        {...(restorable
          ? {
              actions: (
                <Button variant="ghost" size="compact" icon={RotateCcw} loading={restoring} onClick={() => onRestore(item)}>
                  {t("trackedItems.v3.restore")}
                </Button>
              ),
            }
          : {})}
      />
    );
  }

  const deal = item.deal && !item.stale ? item.deal : null;
  const menu = (
    <Menu
      label={t("trackedItems.v3.more")}
      items={[{ id: "end", label: t("trackedItems.v3.end"), onSelect: () => onEnd(item) }]}
      trigger={<Button variant="ghost" size="compact" iconOnly icon={Ellipsis} label={t("trackedItems.v3.more")} />}
    />
  );
  const columns: ProductRowColumn[] = [
    { key: "price", width: "1/4", phoneFull: true, content: <PriceBlock t={t} locale={locale} item={item} /> },
    { key: "stock", width: "1/6", content: <span className="text-body-sm text-text">{stockText(t, item, now)}</span> },
    {
      key: "state",
      width: "1/5",
      phoneFull: true,
      content: (
        <>
          {deal ? (
            <>
              <span className="text-price text-savings">{t("trackedItems.v3.canSave", { amount: money(deal.maxSaving, locale) })}</span>
              {/* Above the row's stretched link, so it is its own action. */}
              <Link href={href} className={buttonClasses("primary", "relative z-(--z-index-raised) self-start", "compact")}>
                {t("trackedItems.v3.seeDeal")}
              </Link>
            </>
          ) : (
            <span className="text-body-sm font-semibold text-text">{stateText(t, locale, item)}</span>
          )}
          {item.lastCheckedAt && (
            <FreshnessLine stale={item.stale}>
              {item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}
            </FreshnessLine>
          )}
        </>
      ),
    },
  ];
  return (
    <ProductRow
      href={href}
      image={image}
      flags={flags}
      title={item.product.name}
      line={line}
      columns={columns}
      tone={deal ? "deal" : "default"}
      actions={menu}
    />
  );
}
