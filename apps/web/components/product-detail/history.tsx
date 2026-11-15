"use client";

// Product Detail price history (design v2, pagedesign.md §8.3; modules.md Price history): the shared
// `PriceHistory` of Home with the range chips 2 hafta … Tümü; the part before tracking started is
// dimmed with "Takip başladı"; four tiles under the legend (lowest · highest · average · change);
// the buy-or-wait hint as an info Flag (#105); the period's lowest named by its rank on that day.
// The chart column sets the height of the row; nothing inside it is pushed apart.
import { HistoryRange, type PriceHistoryDetail, type TrackedItemDetail, toMajorUnits } from "@firsatgeldi/contracts";
import { addCalendarDays, daysBetween, formatNumber, priceChartModel } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Flag, PriceHistory, SegmentedChoice, SkeletonBlock, StatusBanner } from "@firsatgeldi/ui";
import { Lightbulb } from "lucide-react";
import { useApiQuery } from "../../lib/api/hooks";
import { shortDay } from "../tracked-items/format";
import { Price, tl } from "../tracked-items/parts";

/** The range shown first (design v2: "1 ay" pressed). */
export const DEFAULT_RANGE: HistoryRange = "1m";
const CHART_GRID_LINES = 4;

function hintText(t: Translator, locale: Locale, hint: NonNullable<PriceHistoryDetail["hint"]>): string {
  return hint.kind === "LOWEST_IN_DAYS" ? t("productDetail.history.hintLowest", { count: hint.days }) : t("productDetail.history.hintAbove", { count: hint.days, amount: tl(hint.amount.amount, locale) });
}

function Chart({ t, locale, item, history }: { t: Translator; locale: Locale; item: TrackedItemDetail; history: PriceHistoryDetail }) {
  const values = history.cheapest;
  const days = values.length;
  const reference = history.reference;
  const model = priceChartModel({ cheapest: values, references: [reference?.price.amount ?? null], gridLines: CHART_GRID_LINES });
  const known = values.filter((value): value is number => value !== null);
  const last = known.at(-1);
  if (last === undefined) return <StatusBanner tone="info">{t("productDetail.history.noData")}</StatusBanner>;
  const dayOf = (index: number) => addCalendarDays(history.from, index);
  const number = (value: number) => formatNumber(Math.round(toMajorUnits({ amount: value, currency: "TRY" })), locale);
  const start = daysBetween(history.from, history.trackingStartedOn);
  const gap = reference && reference.kind === "PAID" && last < reference.price.amount ? reference.price.amount - last : null;
  const middle = Math.floor((days - 1) / 2);
  const tiles = history.tiles;
  const lowestToday = history.lowest?.day === dayOf(days - 1);
  const firstKnown = known[0] ?? null;
  const changePct = tiles && firstKnown ? (tiles.change.amount / firstKnown) * 100 : null;
  const refName = reference?.kind === "PAID" ? t("home.chart.paid") : t("home.chart.target");
  const label = [
    t("home.chart.label", { count: days, first: tl(firstKnown ?? last, locale), last: tl(last, locale) }),
    reference ? (reference.kind === "PAID" ? t("home.chart.labelPaid", { price: tl(reference.price.amount, locale) }) : t("home.chart.labelTarget", { price: tl(reference.price.amount, locale) })) : null,
    gap !== null ? t("home.chart.labelGap", { amount: tl(gap, locale) }) : null,
    start > 0 ? t("productDetail.history.labelStart", { date: shortDay(history.trackingStartedOn, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PriceHistory
      className="border-0 p-0"
      title={t("productDetail.history.period", { from: shortDay(history.from, locale) })}
      range={history.hint ? <Flag tone="info" icon={Lightbulb}>{hintText(t, locale, history.hint)}</Flag> : null}
      cheapest={values}
      min={model.min}
      max={model.max}
      grid={model.grid.map((value) => ({ value, label: number(value) }))}
      dates={[
        { index: 0, label: shortDay(history.from, locale) },
        { index: middle, label: shortDay(dayOf(middle), locale) },
        { index: days - 1, label: t("home.chart.today") },
      ]}
      steps={model.steps.map((index) => ({ index, label: number(values[index] ?? 0) }))}
      reference={reference ? { value: reference.price.amount, kind: reference.kind === "PAID" ? "paid" : "target", end: { name: refName, value: tl(reference.price.amount, locale) } } : null}
      cheapestEnd={{ name: t("home.chart.cheapest"), value: tl(last, locale) }}
      gap={gap !== null ? t("home.chart.gap", { amount: tl(gap, locale) }) : null}
      legend={{ ...(reference ? { reference: refName } : {}), cheapest: t("home.chart.legendCheapest"), ...(gap !== null ? { gap: t("home.chart.legendGap") } : {}) }}
      trackingStart={
        start > 0 && start < days
          ? { index: start, label: item.mode === "BOUGHT" ? t("productDetail.history.startBought", { date: shortDay(history.trackingStartedOn, locale) }) : t("productDetail.history.start", { date: shortDay(history.trackingStartedOn, locale) }), legend: t("productDetail.history.before") }
          : null
      }
      tiles={
        tiles
          ? [
              { label: t("trackedItems.v4.lowest", { count: days }), value: lowestToday ? t("home.chart.lowestToday", { price: money(tiles.lowest, locale) }) : money(tiles.lowest, locale), tone: "saving" },
              { label: t("trackedItems.v4.highest", { count: days }), value: money(tiles.highest, locale) },
              { label: t("productDetail.history.average", { count: days }), value: money(tiles.average, locale) },
              {
                label: t("trackedItems.v4.change", { count: days }),
                value:
                  tiles.change.amount === 0 ? (
                    t("trackedItems.v4.unchanged")
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <Price t={t} locale={locale} value={{ amount: Math.abs(tiles.change.amount), currency: "TRY" }} change={tiles.change.amount < 0 ? "down" : "up"} />
                      {changePct !== null && (
                        <span className={tiles.change.amount < 0 ? "text-savings" : "text-danger"}>
                          {t("home.chart.changePct", { pct: formatNumber(Math.abs(changePct) / 100, locale, { style: "percent", maximumFractionDigits: 1 }) })}
                        </span>
                      )}
                    </span>
                  ),
              },
            ]
          : []
      }
      readout={(index, value) => t("home.chart.readout", { date: shortDay(dayOf(index), locale), price: tl(value, locale) })}
      label={label}
    />
  );
}

function money(value: { amount: number }, locale: Locale): string {
  return tl(value.amount, locale);
}

export function PriceSection({ t, locale, item, range, onRange }: { t: Translator; locale: Locale; item: TrackedItemDetail; range: HistoryRange; onRange: (range: HistoryRange) => void }) {
  const history = useApiQuery("getPriceHistory", { params: { id: item.id }, query: { range } }, { placeholderData: (previous) => previous });
  const data = history.data?.data;
  return (
    <section aria-labelledby="ph-title" className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ph-title" className="text-h3 text-text">
          {t("productDetail.history.title")}
        </h2>
        <SegmentedChoice label={t("productDetail.history.rangeLabel")} options={HistoryRange.options.map((value) => ({ value, label: t(`productDetail.history.ranges.${value}`) }))} value={range} onValueChange={(value) => onRange(value as HistoryRange)} />
      </div>
      {history.isError && <StatusBanner tone="danger">{t("productDetail.states.sectionError")}</StatusBanner>}
      {!data && !history.isError && <SkeletonBlock shape="card" className="h-(--size-chart-summary-height)" />}
      {data && (
        <>
          <Chart t={t} locale={locale} item={item} history={data} />
          {data.lowest && data.lowest.day !== addCalendarDays(data.from, data.cheapest.length - 1) && (
            <p className="text-caption text-text-muted">
              {t("productDetail.history.lowestThen", { price: tl(data.lowest.price.amount, locale), date: shortDay(data.lowest.day, locale), rank: data.lowest.rankThen })}
            </p>
          )}
          {data.dataDays < data.cheapest.length && <p className="text-caption text-text-muted">{t("productDetail.history.dataDays", { count: data.dataDays })}</p>}
        </>
      )}
    </section>
  );
}
