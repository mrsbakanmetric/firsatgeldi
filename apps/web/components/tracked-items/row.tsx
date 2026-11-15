"use client";

// One Tracked Items card (pagedesign.md §8.4 "Card grid v5", content rules of "Row v4";
// modules.md "Row prices v4"): header — image 84 with the status icon on its corner ·
// name (two lines) · return badge · check time; the price table at card width; the
// summary as one thin line; a footer strip (deal or what is left) with the card's actions
// as visible buttons on its right (v6: no ⋯ menu, design §5.36; no idle rows, design §3).
// The price list is one table — label ·
// stock · price, prices right-aligned in one column: the user's own row first (bought:
// "<platform> · <satıcı>" + "Aldın"; want: "Hedefin"), cheaper offers **by rank only**
// with a lock (never a seller or platform name before "Göster"), "+N satıcı daha",
// "Senin satıcın şimdi"; then the 7/14-day summary. Lower than the reference = savings
// + ↓, higher = danger + ↑ (never colour alone). The whole row links to Product Detail;
// "+N satıcı daha", the status icon and the footer buttons sit above that link.
import type { TrackedItemListItem } from "@firsatgeldi/contracts";
import { daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, Flag, focusRing, FreshnessLine, Icon, ProductImage, ProductRow } from "@firsatgeldi/ui";
import { Check, CircleCheck, Clock, Lock, Package, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { searchAddHref } from "../../lib/handoff";
import { ago, checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { shortDay } from "./format";
import { Price, StatusIcon, StockWord, tl } from "./parts";

const CURRENCY = "TRY" as const;
const MS_PER_HOUR = 3_600_000;
/** Days of the two summary windows (pagedesign.md §8.4 Row v4). */
const LOWEST_DAYS = 7;

function Row({ label, stock, price, className }: { label: ReactNode; stock?: ReactNode; price?: ReactNode; className?: string }) {
  return (
    <tr className={className}>
      <td className="py-1 pr-2 pl-2 align-middle">{label}</td>
      <td className="py-1 pr-2 align-middle text-caption">{stock}</td>
      <td className="py-1 pr-2 text-right align-middle whitespace-nowrap">{price}</td>
    </tr>
  );
}

function PriceList({ t, locale, item, href, now }: { t: Translator; locale: Locale; item: TrackedItemListItem; href: string; now: number }) {
  // Stale row (modules.md Tracked Items › States): market prices are the last known ones, stock shows its age.
  const staleHours = item.stale && item.lastCheckedAt ? Math.max(1, Math.floor((now - Date.parse(item.lastCheckedAt)) / MS_PER_HOUR)) : null;
  const stale = staleHours !== null;
  const reference = item.purchase?.pricePaid.amount ?? item.want?.targetPrice?.amount ?? null;
  const own = item.purchase;
  return (
    <table className="w-full border-collapse text-body-sm text-text">
      <tbody>
        {own ? (
          <Row
            className="bg-surface-alt"
            label={<span className="font-semibold">{[own.platformName, own.sellerName && own.sellerName !== own.platformName ? own.sellerName : null].filter(Boolean).join(t("common.listSeparator"))}</span>}
            stock={<span className="text-text-muted">{t("trackedItems.v4.bought")}</span>}
            price={<span className="font-semibold tabular-nums">{money(own.pricePaid, locale)}</span>}
          />
        ) : (
          <Row
            className="bg-surface-alt"
            label={<span className="font-semibold">{item.want?.targetPrice ? t("trackedItems.v4.target") : t("trackedItems.row.noTarget")}</span>}
            price={item.want?.targetPrice ? <span className="font-semibold tabular-nums">{money(item.want.targetPrice, locale)}</span> : null}
          />
        )}
        {item.ranked.map((offer) => (
          <Row
            key={offer.rank}
            label={
              <span className="inline-flex items-center gap-1">
                <Icon icon={Lock} size="sm" label={t("trackedItems.v4.hidden")} className="text-text-muted" />
                {offer.rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank: offer.rank })}
              </span>
            }
            stock={<StockWord t={t} state={offer.stockState} staleHours={staleHours} />}
            price={<Price t={t} locale={locale} value={offer.price} reference={reference} stale={stale} />}
          />
        ))}
        {item.rankedMore > 0 && (
          <Row
            label={
              <Link href={href} className={cn("relative z-(--z-index-raised) text-caption font-semibold text-primary underline underline-offset-4", focusRing)}>
                {t("trackedItems.v4.more", { count: item.rankedMore })}
              </Link>
            }
          />
        )}
        {item.ownNow && own && (
          <Row
            label={t("trackedItems.v4.ownNow")}
            stock={<StockWord t={t} state={item.ownNow.stockState} staleHours={staleHours} />}
            price={<Price t={t} locale={locale} value={item.ownNow.price} reference={own.pricePaid.amount} stale={stale} />}
          />
        )}
      </tbody>
    </table>
  );
}

/** The summary as one thin caption line (v5): "7g en düşük … · 14g en yüksek … · 14g değişim ↓ …". */
function Summary({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemListItem }) {
  const values = item.priceHistory.cheapest;
  const known = values.filter((value): value is number => value !== null);
  if (!known.length) return null;
  const lastWeek = values.slice(-LOWEST_DAYS).filter((value): value is number => value !== null);
  const firstIndex = values.findIndex((value) => value !== null);
  const first = values[firstIndex] ?? null;
  const last = known.at(-1) ?? null;
  const changeDays = values.length - Math.max(0, firstIndex);
  const change = first !== null && last !== null && firstIndex < values.length - 1 ? last - first : null;
  const sep = <span aria-hidden="true">{t("common.listSeparator")}</span>;
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-caption text-text-muted">
      {lastWeek.length > 0 && <span>{t("trackedItems.v5.lowest", { count: LOWEST_DAYS, price: tl(Math.min(...lastWeek), locale) })}</span>}
      {lastWeek.length > 0 && sep}
      <span>{t("trackedItems.v5.highest", { count: values.length, price: tl(Math.max(...known), locale) })}</span>
      {change !== null && (
        <>
          {sep}
          <span className="inline-flex items-center gap-1">
            {t("trackedItems.v5.change", { count: changeDays })}
            {change === 0 ? (
              <span>{t("trackedItems.v4.unchanged")}</span>
            ) : (
              <Price t={t} locale={locale} value={{ amount: Math.abs(change), currency: CURRENCY }} change={change < 0 ? "down" : "up"} />
            )}
          </span>
        </>
      )}
    </p>
  );
}

/** Footer strip of a card: information on the left, the card's buttons on the right. */
const STRIP = "flex flex-wrap items-center justify-between gap-2 px-3 py-2";
/** Above the card's stretched link, so each button is its own action. */
const RAISED = "relative z-(--z-index-raised)";

/**
 * The strip closing the card (v5, actions v6): a deal on savings-subtle — "En çok kazanç" +
 * amount (want: "Hedefe ulaştı ✓"); otherwise surface-alt with "Hedefe kalan N TL" + "Hedefe
 * inince haber veririz", or "Daha ucuzu henüz yok". On the right, always visible (no ⋯):
 * deal → "Fırsatı gör" + "Takibi bitir" (ghost); no deal → "Takibi bitir" (ghost); want
 * cards add "Aldım, kaydet" (secondary).
 */
function Footer({ t, locale, item, href, onEnd }: { t: Translator; locale: Locale; item: TrackedItemListItem; href: string; onEnd: (item: TrackedItemListItem) => void }) {
  const deal = item.deal && !item.stale;
  const actions = (
    <span className={cn(RAISED, "flex flex-wrap items-center justify-end gap-2")}>
      {deal && (
        <Link href={href} className={buttonClasses("primary", undefined, "compact")}>
          {t("trackedItems.v3.seeDeal")}
        </Link>
      )}
      {item.mode === "WANT" && (
        <Link href={searchAddHref(locale, { productId: item.product.id, mode: "BOUGHT", convertId: item.id })} className={buttonClasses("secondary", undefined, "compact")}>
          {t("trackedItems.v4.markBought")}
        </Link>
      )}
      <Button variant="ghost" size="compact" onClick={() => onEnd(item)}>
        {t("trackedItems.v3.end")}
      </Button>
    </span>
  );
  return (
    <div className={cn(STRIP, deal ? "bg-savings-subtle" : "bg-surface-alt")}>
      <FooterInfo t={t} locale={locale} item={item} />
      {actions}
    </div>
  );
}

function FooterInfo({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemListItem }) {
  if (item.deal && !item.stale) {
    return item.mode === "BOUGHT" ? (
      <span className="flex flex-col">
        <span className="text-caption text-text-muted">{t("trackedItems.v5.maxGain")}</span>
        <span className="text-price text-savings">{money(item.deal.maxSaving, locale)}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-body font-semibold text-savings">
        {t("trackedItems.v4.reached")}
        <Icon icon={Check} size="sm" />
      </span>
    );
  }
  const target = item.want?.targetPrice;
  if (item.deal && item.stale) return <span className="text-body-sm font-semibold text-text">{t("trackedItems.row.state.unverified")}</span>;
  if (item.mode === "BOUGHT") return <span className="text-body-sm text-text-muted">{t("trackedItems.v4.noCheaper")}</span>;
  if (target && item.cheapest)
    return (
      <span className="flex flex-col">
        <span className="text-body-sm font-semibold text-text">{t("trackedItems.v5.toTarget", { amount: tl(Math.max(0, item.cheapest.amount - target.amount), locale) })}</span>
        <span className="text-caption text-text-muted">{t("trackedItems.v5.notifyHint")}</span>
      </span>
    );
  if (item.cheapest) return <span className="text-body-sm text-text">{t("trackedItems.row.state.cheapestNow", { price: money(item.cheapest, locale) })}</span>;
  return <span className="text-body-sm text-text-muted">{t("trackedItems.row.state.noPrice")}</span>;
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

  if (item.ended) {
    const saving = item.ended.savingRecorded;
    const restorable = item.ended.restorableUntil !== null && Date.parse(item.ended.restorableUntil) > now;
    const result = saving ? (
      <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-savings">
        <Icon icon={CircleCheck} size="sm" />
        {t("trackedItems.row.ended.saving", { amount: money(saving, locale) })}
      </span>
    ) : (
      <span className="text-body-sm text-text-muted">{t("trackedItems.row.ended.noSaving")}</span>
    );
    return (
      <ProductRow
        layout="card"
        href={href}
        image={<ProductImage src={imageUrl(item.product.imageSha256)} size="card" fallbackIcon={Package} />}
        flags={<Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>}
        title={item.product.name}
        line={t("trackedItems.row.ended.line", { reason: t(`trackedItems.row.ended.reason.${item.ended.reason}`), date: shortDay(toCalendarDay(new Date(item.ended.at)), locale) })}
        dimmed
        // While "Geri al" works the strip carries the result and the button; afterwards the
        // result joins the card's information lines (no footer row with one side only, design §3).
        {...(restorable
          ? {
              footer: (
                <div className={cn(STRIP, "bg-surface-alt")}>
                  {result}
                  <Button variant="ghost" size="compact" icon={RotateCcw} loading={restoring} onClick={() => onRestore(item)} className={RAISED}>
                    {t("trackedItems.v3.restore")}
                  </Button>
                </div>
              ),
            }
          : { columns: [{ key: "result", width: "fill" as const, content: result }] })}
      />
    );
  }

  const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
  const flags =
    (left !== null && left >= 0) || item.stale ? (
      <>
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
    ) : undefined;
  const checked = item.lastCheckedAt ? (
    <FreshnessLine stale={item.stale}>{item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}</FreshnessLine>
  ) : undefined;
  const deal = item.deal && !item.stale ? item.deal : null;

  return (
    <ProductRow
      layout="card"
      href={href}
      image={
        <span className="relative shrink-0">
          <ProductImage src={imageUrl(item.product.imageSha256)} size="card" fallbackIcon={Package} />
          <StatusIcon t={t} mode={item.mode} />
        </span>
      }
      {...(flags ? { flags } : {})}
      title={item.product.name}
      {...(checked ? { line: checked } : {})}
      columns={[
        { key: "prices", width: "fill", content: <PriceList t={t} locale={locale} item={item} href={href} now={now} /> },
        { key: "summary", width: "fill", content: <Summary t={t} locale={locale} item={item} /> },
      ]}
      footer={<Footer t={t} locale={locale} item={item} href={href} onEnd={onEnd} />}
      tone={deal ? "deal" : "default"}
    />
  );
}
