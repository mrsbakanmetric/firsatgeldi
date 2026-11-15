"use client";

// One Tracked Items card (pagedesign.md §8.4 "Card grid v5", content rules of "Row v4";
// modules.md "Row prices v4"): header — image 84 with the status icon on its corner ·
// name (two lines) · return badge · check time · ⋯ top-right; the price table at card
// width; the summary as one thin line; a footer strip (deal or what is left). The price list is one table — label ·
// stock · price, prices right-aligned in one column: the user's own row first (bought:
// "<platform> · <satıcı>" + "Aldın"; want: "Hedefin"), cheaper offers **by rank only**
// with a lock (never a seller or platform name before "Göster"), "+N satıcı daha",
// "Senin satıcın şimdi"; then the 7/14-day summary. Lower than the reference = savings
// + ↓, higher = danger + ↑ (never colour alone). The whole row links to Product Detail;
// "Fırsatı gör", "+N satıcı daha", the status icon and ⋯ sit above that link.
import type { TrackedItemListItem } from "@firsatgeldi/contracts";
import { daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, Flag, focusRing, FreshnessLine, Icon, Menu, type MenuItem, ProductImage, ProductRow } from "@firsatgeldi/ui";
import { Check, CircleCheck, Clock, Ellipsis, Lock, Package, RotateCcw } from "lucide-react";
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

/**
 * The strip closing the card (v5): a deal on savings-subtle — "En çok kazanç" + amount on the
 * left, "Fırsatı gör" on the right (want: "Hedefe ulaştı ✓"); otherwise surface-alt with
 * "Hedefe kalan N TL" + "Hedefe inince haber veririz", or "Daha ucuzu henüz yok".
 */
function Footer({ t, locale, item, href }: { t: Translator; locale: Locale; item: TrackedItemListItem; href: string }) {
  const strip = "flex flex-wrap items-center justify-between gap-2 px-3 py-2";
  const seeDeal = (
    // Above the card's stretched link, so it is its own action.
    <Link href={href} className={buttonClasses("primary", "relative z-(--z-index-raised)", "compact")}>
      {t("trackedItems.v3.seeDeal")}
    </Link>
  );
  if (item.deal && !item.stale) {
    return (
      <div className={cn(strip, "bg-savings-subtle")}>
        {item.mode === "BOUGHT" ? (
          <span className="flex flex-col">
            <span className="text-caption text-text-muted">{t("trackedItems.v5.maxGain")}</span>
            <span className="text-price text-savings">{money(item.deal.maxSaving, locale)}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-body font-semibold text-savings">
            {t("trackedItems.v4.reached")}
            <Icon icon={Check} size="sm" />
          </span>
        )}
        {seeDeal}
      </div>
    );
  }
  const target = item.want?.targetPrice;
  let text: ReactNode;
  if (item.deal && item.stale) text = <span className="text-body-sm font-semibold text-text">{t("trackedItems.row.state.unverified")}</span>;
  else if (item.mode === "BOUGHT") text = <span className="text-body-sm text-text-muted">{t("trackedItems.v4.noCheaper")}</span>;
  else if (target && item.cheapest)
    text = (
      <span className="flex flex-col">
        <span className="text-body-sm font-semibold text-text">{t("trackedItems.v5.toTarget", { amount: tl(Math.max(0, item.cheapest.amount - target.amount), locale) })}</span>
        <span className="text-caption text-text-muted">{t("trackedItems.v5.notifyHint")}</span>
      </span>
    );
  else if (item.cheapest) text = <span className="text-body-sm text-text">{t("trackedItems.row.state.cheapestNow", { price: money(item.cheapest, locale) })}</span>;
  else text = <span className="text-body-sm text-text-muted">{t("trackedItems.row.state.noPrice")}</span>;
  return <div className={cn(strip, "bg-surface-alt")}>{text}</div>;
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
    return (
      <ProductRow
        layout="card"
        href={href}
        image={<ProductImage src={imageUrl(item.product.imageSha256)} size="card" fallbackIcon={Package} />}
        flags={<Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>}
        title={item.product.name}
        line={t("trackedItems.row.ended.line", { reason: t(`trackedItems.row.ended.reason.${item.ended.reason}`), date: shortDay(toCalendarDay(new Date(item.ended.at)), locale) })}
        dimmed
        footer={
          <div className="flex items-center px-3 py-2 bg-surface-alt">
            {saving ? (
              <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-savings">
                <Icon icon={CircleCheck} size="sm" />
                {t("trackedItems.row.ended.saving", { amount: money(saving, locale) })}
              </span>
            ) : (
              <span className="text-body-sm text-text-muted">{t("trackedItems.row.ended.noSaving")}</span>
            )}
          </div>
        }
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
  const menuItems: MenuItem[] = [
    ...(item.mode === "WANT" ? [{ id: "bought", label: t("trackedItems.v4.markBought"), href: searchAddHref(locale, { productId: item.product.id, mode: "BOUGHT" as const, convertId: item.id }) }] : []),
    { id: "end", label: t("trackedItems.v3.end"), onSelect: () => onEnd(item) },
  ];
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
      footer={<Footer t={t} locale={locale} item={item} href={href} />}
      tone={deal ? "deal" : "default"}
      actions={<Menu label={t("trackedItems.v3.more")} items={menuItems} trigger={<Button variant="ghost" size="compact" iconOnly icon={Ellipsis} label={t("trackedItems.v3.more")} />} />}
    />
  );
}
