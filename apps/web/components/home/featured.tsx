"use client";

// Hemen Gözat (design "3 Ana Sayfa" v2; modules.md Home › B; pagedesign.md §8.1): image 120
// with the status icon, flags, name, check time and "En çok kazanç" on the right; two columns
// — the 14-day price chart (PriceHistory) | the ranked price table of Tracked Items with each
// hidden offer's "Göster" (seller and store open in place), both columns ending on one line; a
// footer with the page's one coral action "Fırsatı gör", the return details link, the allowance
// and "Şimdi kontrol et" — without a deal or return link there is no footer row and the
// allowance and "Şimdi kontrol et" sit under the check time (design §3, 2026-11-15).
// The "Fırsat geldi" flag is neutral here (the coral element is "Fırsatı gör"). A savings
// border while a deal is open.
import { type HiddenOfferView, type HomeFeatured, toMajorUnits } from "@firsatgeldi/contracts";
import { addCalendarDays, daysBetween, formatNumber, priceChartModel, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, Flag, FreshnessLine, Icon, PriceHistory, StatusBanner } from "@firsatgeldi/ui";
import { ArrowRight, Check, Clock, ExternalLink, Lock, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ago, checkedAgo, money } from "../search-add/format";
import { CheckNowControls } from "../tracked-items/check-now";
import { shortDay } from "../tracked-items/format";
import { TrackedHeader } from "../tracked-items/header";
import { useOfferActions } from "../tracked-items/offer-actions";
import { Price, StockWord, tl } from "../tracked-items/parts";

/** Grid lines of the Hemen Gözat chart (design v2: four labelled lines). */
const CHART_GRID_LINES = 4;
const MS_PER_HOUR = 3_600_000;

function offerMeta(t: Translator, locale: Locale, offer: HiddenOfferView): string {
  const shipping =
    offer.shippingCost === null
      ? t("searchAdd.confirm.shippingUnknown")
      : offer.shippingCost.amount === 0
        ? t("searchAdd.confirm.shippingFree")
        : t("searchAdd.confirm.shipping", { amount: money(offer.shippingCost, locale) });
  const delivery = offer.deliveryDays
    ? offer.deliveryDays.min === offer.deliveryDays.max
      ? t("searchAdd.confirm.delivery", { count: offer.deliveryDays.min })
      : t("searchAdd.confirm.deliveryRange", { min: offer.deliveryDays.min, max: offer.deliveryDays.max })
    : null;
  return [shipping, delivery].filter(Boolean).join(t("common.listSeparator"));
}

function Chart({ t, locale, item }: { t: Translator; locale: Locale; item: HomeFeatured }) {
  const values = item.priceHistory.cheapest;
  const days = values.length;
  const paid = item.purchase?.pricePaid.amount ?? null;
  const target = item.want?.targetPrice?.amount ?? null;
  const reference = paid ?? target;
  const model = priceChartModel({ cheapest: values, references: [reference], gridLines: CHART_GRID_LINES });
  const known = values.filter((value): value is number => value !== null);
  const first = known[0];
  const last = known.at(-1);
  if (first === undefined || last === undefined) return null;
  const dayOf = (index: number) => addCalendarDays(item.priceHistory.from, index);
  // Grid and step labels as whole lira without the currency ("29.000"), as drawn.
  const number = (value: number) => formatNumber(Math.round(toMajorUnits({ amount: value, currency: "TRY" })), locale);
  const gap = reference !== null && last < reference ? reference - last : null;
  const middle = Math.floor((days - 1) / 2);
  const label = [
    t("home.chart.label", { count: days, first: tl(first, locale), last: tl(last, locale) }),
    paid !== null ? t("home.chart.labelPaid", { price: tl(paid, locale) }) : target !== null ? t("home.chart.labelTarget", { price: tl(target, locale) }) : null,
    gap !== null ? t("home.chart.labelGap", { amount: tl(gap, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" ");
  const change = model.change;
  return (
    <PriceHistory
      title={t("home.chart.title", { count: days })}
      range={t("home.chart.range", { from: shortDay(item.priceHistory.from, locale) })}
      cheapest={values}
      min={model.min}
      max={model.max}
      grid={model.grid.map((value) => ({ value, label: number(value) }))}
      dates={[
        { index: 0, label: shortDay(item.priceHistory.from, locale) },
        { index: middle, label: shortDay(dayOf(middle), locale) },
        { index: days - 1, label: t("home.chart.today") },
      ]}
      steps={model.steps.map((index) => ({ index, label: number(values[index] ?? 0) }))}
      reference={
        paid !== null
          ? { value: paid, kind: "paid", end: { name: t("home.chart.paid"), value: tl(paid, locale) } }
          : target !== null
            ? { value: target, kind: "target", end: { name: t("home.chart.target"), value: tl(target, locale) } }
            : null
      }
      cheapestEnd={{ name: t("home.chart.cheapest"), value: tl(last, locale) }}
      gap={gap !== null ? t("home.chart.gap", { amount: tl(gap, locale) }) : null}
      legend={{
        ...(paid !== null ? { reference: t("home.chart.paid") } : target !== null ? { reference: t("home.chart.target") } : {}),
        cheapest: t("home.chart.legendCheapest"),
        ...(gap !== null ? { gap: t("home.chart.legendGap") } : {}),
      }}
      tiles={[
        { label: t("trackedItems.v4.highest", { count: days }), value: model.highest === null ? "" : tl(model.highest, locale) },
        {
          label: t("trackedItems.v4.lowest", { count: days }),
          value: model.lowest === null ? "" : model.lowestIndex === days - 1 ? t("home.chart.lowestToday", { price: tl(model.lowest, locale) }) : tl(model.lowest, locale),
          tone: "saving",
        },
        {
          label: t("trackedItems.v4.change", { count: days }),
          value:
            change === null || change === 0 ? (
              t("trackedItems.v4.unchanged")
            ) : (
              <span className="inline-flex flex-wrap items-center gap-1">
                <Price t={t} locale={locale} value={{ amount: Math.abs(change), currency: "TRY" }} change={change < 0 ? "down" : "up"} />
                {model.changePct !== null && (
                  <span className={change < 0 ? "text-savings" : "text-danger"}>
                    {t("home.chart.changePct", { pct: formatNumber(Math.abs(model.changePct) / 100, locale, { style: "percent", maximumFractionDigits: 1 }) })}
                  </span>
                )}
              </span>
            ),
        },
      ]}
      readout={(index, value) => t("home.chart.readout", { date: shortDay(dayOf(index), locale), price: tl(value, locale) })}
      label={label}
    />
  );
}

/** The ranked price table (Tracked Items v4) with "Göster" per hidden offer; the seller opens in place. */
function Offers({ t, locale, item, href, staleHours }: { t: Translator; locale: Locale; item: HomeFeatured; href: string; staleHours: number | null }) {
  const actions = useOfferActions(t);
  const reference = item.purchase?.pricePaid.amount ?? item.want?.targetPrice?.amount ?? null;
  const own = item.purchase;

  const cell = "py-2 pr-3 align-middle";
  // The column ends with the chart column (design §3): the grid stretches it and the
  // "+N" link and caption are pinned to its bottom.
  return (
    <div className="flex h-full min-w-0 flex-col gap-2">
      {actions.problem && <StatusBanner tone="danger">{actions.problem}</StatusBanner>}
      <div className="overflow-hidden rounded-md border border-border">
        <table aria-label={t("home.offers.label")} className="w-full border-collapse text-body-sm text-text">
          <tbody>
            <tr className="bg-surface-alt">
              <td className={cn(cell, "pl-3")}>
                {own ? (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{[own.platformName, own.sellerName && own.sellerName !== own.platformName ? own.sellerName : null].filter(Boolean).join(t("common.listSeparator"))}</span>
                    <span className="text-caption text-text-muted">
                      {t("home.offers.own", { date: shortDay(own.orderedOn, locale), status: t(`searchAdd.confirm.status.${own.orderStatus}`) })}
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold">{item.want?.targetPrice ? t("home.offers.wantRow") : t("trackedItems.row.noTarget")}</span>
                )}
              </td>
              <td className={cn(cell, "text-caption")}>{item.ownNow ? <StockWord t={t} state={item.ownNow.stockState} staleHours={staleHours} /> : null}</td>
              <td className={cn(cell, "text-right text-price whitespace-nowrap")}>
                {own ? money(own.pricePaid, locale) : item.want?.targetPrice ? money(item.want.targetPrice, locale) : null}
              </td>
              <td className={cell} />
            </tr>
            {item.offers.map((offer) => {
              const shown = actions.shown(offer.ref);
              const saving = reference !== null && offer.price.amount + (offer.shippingCost?.amount ?? 0) < reference ? reference - offer.price.amount - (offer.shippingCost?.amount ?? 0) : null;
              return (
                <tr key={offer.ref} className="border-t border-divider">
                  <td className={cn(cell, "pl-3")}>
                    <span className="flex min-w-0 flex-col">
                      {shown ? (
                        <span className="truncate font-semibold">{[shown.sellerName, shown.platformName].join(t("common.listSeparator"))}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Icon icon={Lock} size="sm" label={t("trackedItems.v4.hidden")} className="text-text-muted" />
                          {offer.rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank: offer.rank })}
                        </span>
                      )}
                      <span className="text-caption text-text-muted">
                        {shown && shown.sellerRating !== null
                          ? [t("searchAdd.confirm.revealedRating", { rating: formatNumber(shown.sellerRating.value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), scale: shown.sellerRating.scale }), offerMeta(t, locale, offer)].join(t("common.listSeparator"))
                          : offerMeta(t, locale, offer)}
                      </span>
                    </span>
                  </td>
                  <td className={cn(cell, "text-caption")}>
                    <StockWord t={t} state={offer.stockState} staleHours={staleHours} />
                  </td>
                  <td className={cn(cell, "text-right whitespace-nowrap")}>
                    <span className="flex flex-col items-end">
                      <span className="text-price text-text">{money(offer.price, locale)}</span>
                      {saving !== null && <Price t={t} locale={locale} value={{ amount: saving, currency: "TRY" }} change="down" />}
                    </span>
                  </td>
                  <td className={cn(cell, "text-right")}>
                    {shown ? (
                      <span className="flex flex-col items-end gap-1">
                        <Button size="compact" icon={ExternalLink} loading={actions.going(offer.ref)} onClick={() => actions.go(offer)}>
                          {t("searchAdd.confirm.goToStore")}
                        </Button>
                        <Button variant="ghost" size="compact" onClick={() => actions.hide(offer)}>
                          {t("searchAdd.confirm.hide")}
                        </Button>
                      </span>
                    ) : (
                      <Button variant="secondary" size="compact" loading={actions.revealing(offer.ref)} onClick={() => actions.reveal(offer)}>
                        {t("searchAdd.confirm.reveal")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        {item.cheaperCount > item.offers.length && (
          <Link href={href} className="self-start text-caption font-semibold text-primary underline underline-offset-4">
            {t("home.offers.more", { count: item.cheaperCount - item.offers.length })}
          </Link>
        )}
        <p className="text-caption text-text-muted">{t("home.offers.caption")}</p>
      </div>
    </div>
  );
}

export interface FeaturedProps {
  t: Translator;
  locale: Locale;
  item: HomeFeatured;
  now: number;
  /** Checks left today; null = unlimited. */
  remaining: number | null;
}

export function Featured({ t, locale, item, now, remaining }: FeaturedProps) {
  const href = localizedPath("/takip/[id]", locale, { id: item.id });
  const today = toCalendarDay(new Date(now));
  const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
  const deal = item.deal && !item.stale ? item.deal : null;
  const staleHours = item.stale && item.lastCheckedAt ? Math.max(1, Math.floor((now - Date.parse(item.lastCheckedAt)) / MS_PER_HOUR)) : null;
  let headline: ReactNode;
  if (deal && item.mode === "BOUGHT") {
    headline = (
      <>
        <span className="text-caption text-text-muted">{t("home.featured.maxGain")}</span>
        <span className="text-display text-savings">{money(deal.maxSaving, locale)}</span>
        <span className="text-caption text-text-muted">{t("home.featured.cheaperIn", { count: deal.cheaperCount })}</span>
      </>
    );
  } else if (deal) {
    headline = (
      <>
        <span className="inline-flex items-center gap-1 text-body font-semibold text-savings">
          {t("home.featured.targetReached")}
          <Icon icon={Check} size="sm" />
        </span>
        {item.cheapest && <span className="text-display text-savings">{money(item.cheapest, locale)}</span>}
      </>
    );
  } else if (item.mode === "BOUGHT" && !item.stale) {
    headline = <span className="text-body-sm font-semibold text-text">{t("home.featured.cheapestNow")}</span>;
  }

  const checkControls = <CheckNowControls t={t} item={item} remaining={remaining} />;
  const returnLink = item.mode === "BOUGHT" && item.returnDeadline !== null;
  // A footer row only with content on its left too (design §3 "no idle rows"); otherwise the
  // allowance and "Şimdi kontrol et" join the check time in the header.
  const footerRow = deal !== null || returnLink;

  return (
    <section
      aria-labelledby="featured-title"
      className={cn("flex flex-col gap-5 rounded-lg bg-surface p-4 shadow-md md:p-6", deal ? "border-(length:--border-width-strong) border-savings" : "border border-border")}
    >
      <TrackedHeader t={t} item={item} aside={headline}>
        <span className="text-caption font-semibold text-text-muted uppercase">
          {t("home.featured.label")}
        </span>
        {(deal || (left !== null && left >= 0) || item.stale) && (
          <div className="flex flex-wrap gap-2">
            {deal && (
              // Neutral on Home: "Fırsatı gör" is the surface's one coral element.
              <Flag tone="neutral" icon={Zap}>
                {t("trackedItems.row.flags.deal")}
              </Flag>
            )}
            {left !== null && left >= 0 && item.returnDeadline && (
              <Flag tone={left <= RETURN_URGENT_DAYS ? "warning" : "info"} icon={Clock}>
                {left === 0
                  ? t("home.featured.returnToday", { date: shortDay(item.returnDeadline, locale) })
                  : t("home.featured.returnFlag", { count: left, date: shortDay(item.returnDeadline, locale) })}
              </Flag>
            )}
            {item.stale && (
              <Flag tone="warning" icon={Clock}>
                {t("trackedItems.row.flags.stale")}
              </Flag>
            )}
          </div>
        )}
        <h2 id="featured-title" className="text-h2 text-text">
          <Link href={href} className="hover:underline">
            {item.product.name}
          </Link>
        </h2>
        {item.lastCheckedAt && (
          <FreshnessLine stale={item.stale}>
            {item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}
          </FreshnessLine>
        )}
        {!footerRow && checkControls}
      </TrackedHeader>

      {item.stale && item.deal && <StatusBanner tone="warning">{t("home.featured.unverified")}</StatusBanner>}

      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
        <Chart t={t} locale={locale} item={item} />
        <Offers t={t} locale={locale} item={item} href={href} staleHours={staleHours} />
      </div>

      {footerRow && (
        <div className="flex flex-wrap items-center gap-4 border-t border-divider pt-4">
          {deal && (
            <Link href={href} className={buttonClasses("deal", "gap-2")}>
              {t("home.featured.seeDeal")}
              <Icon icon={ArrowRight} />
            </Link>
          )}
          {returnLink && (
            <Link href={`${href}#iade`} className="inline-flex min-h-(--size-touch-target-min) items-center gap-1 text-body-sm font-semibold text-primary">
              {t("home.featured.returnPage")}
              <Icon icon={ArrowRight} size="sm" />
            </Link>
          )}
          <span className="md:ml-auto">{checkControls}</span>
        </div>
      )}
    </section>
  );
}
