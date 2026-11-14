"use client";

// One Tracked Items row (pagedesign.md §8.4 "Row v4"; modules.md "Row prices v4"):
// image 120 with the status icon on its corner · name (two lines, return badge above,
// check time below) · price list · outcome · ⋯. The price list is one table — label ·
// stock · price, prices right-aligned in one column: the user's own row first (bought:
// "<platform> · <satıcı>" + "Aldın"; want: "Hedefin"), cheaper offers **by rank only**
// with a lock (never a seller or platform name before "Göster"), "+N satıcı daha",
// "Senin satıcın şimdi"; then the 7/14-day summary. Lower than the reference = savings
// + ↓, higher = danger + ↑ (never colour alone). The whole row links to Product Detail;
// "Fırsatı gör", "+N satıcı daha", the status icon and ⋯ sit above that link.
import type { Money, TrackedItemListItem } from "@firsatgeldi/contracts";
import { daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, Flag, focusRing, FreshnessLine, Icon, Menu, type MenuItem, ProductImage, ProductRow, type ProductRowColumn, Tooltip } from "@firsatgeldi/ui";
import { ArrowDown, ArrowUp, Bookmark, Check, CircleCheck, Clock, Ellipsis, Eye, Lock, Package, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { searchAddHref } from "../../lib/handoff";
import { ago, checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../search-add/search-box";
import { shortDay } from "./format";

const CURRENCY = "TRY" as const;
const MS_PER_HOUR = 3_600_000;
/** Days of the two summary windows (pagedesign.md §8.4 Row v4). */
const LOWEST_DAYS = 7;

function tl(amount: number, locale: Locale): string {
  return money({ amount, currency: CURRENCY }, locale);
}

/** A price against the reference (price paid or target): lower = savings + ↓, higher = danger + ↑, equal = plain. */
function Price({
  t,
  locale,
  value,
  reference = null,
  change,
  stale = false,
}: {
  t: Translator;
  locale: Locale;
  value: Money;
  reference?: number | null;
  change?: "down" | "up";
  /** Not checked for `tracking.stale_hours`: the price is the last known one and says so. */
  stale?: boolean;
}) {
  // A change (14-day) carries its own direction; a price is compared with the reference.
  const direction = change ?? (reference === null || value.amount === reference ? null : value.amount < reference ? "down" : "up");
  return (
    <span className={cn("inline-flex items-center justify-end gap-1 font-semibold tabular-nums", direction === "down" ? "text-savings" : direction === "up" ? "text-danger" : "text-text")}>
      {direction && <Icon icon={direction === "down" ? ArrowDown : ArrowUp} size="sm" />}
      {direction && <span className="sr-only">{t(direction === "down" ? "trackedItems.v4.lower" : "trackedItems.v4.higher")}</span>}
      {stale ? t("trackedItems.row.lastKnown", { price: money(value, locale) }) : money(value, locale)}
    </span>
  );
}

type StockState = TrackedItemListItem["ranked"][number]["stockState"];

/** Stock in words; on a stale row its age instead ("Stok bilgisi en az 12 saat önceki"). */
function StockWord({ t, state, staleHours = null }: { t: Translator; state: StockState | null; staleHours?: number | null }) {
  if (staleHours !== null) return <span className="text-on-warning-subtle">{t("trackedItems.row.staleStock", { count: staleHours })}</span>;
  if (!state) return null;
  return <span className={state === "IN_STOCK" ? "text-text-muted" : state === "LOW_STOCK" ? "text-on-warning-subtle" : "text-danger"}>{t(`trackedItems.v4.stock.${state}`)}</span>;
}

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
  const values = item.priceHistory.cheapest;
  const known = values.filter((value): value is number => value !== null);
  const lastWeek = values.slice(-LOWEST_DAYS).filter((value): value is number => value !== null);
  const firstIndex = values.findIndex((value) => value !== null);
  const first = firstIndex >= 0 ? values[firstIndex] : null;
  const last = known.at(-1) ?? null;
  const changeDays = values.length - Math.max(0, firstIndex);
  const change = first !== null && first !== undefined && last !== null && firstIndex < values.length - 1 ? last - first : null;
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
      {known.length > 0 && (
        <tbody className="border-t border-divider text-caption text-text-muted">
          {lastWeek.length > 0 && <Row label={t("trackedItems.v4.lowest", { count: LOWEST_DAYS })} price={<span className="tabular-nums">{tl(Math.min(...lastWeek), locale)}</span>} />}
          <Row label={t("trackedItems.v4.highest", { count: values.length })} price={<span className="tabular-nums">{tl(Math.max(...known), locale)}</span>} />
          {change !== null && (
            <Row
              label={t("trackedItems.v4.change", { count: changeDays })}
              price={
                change === 0 ? (
                  <span>{t("trackedItems.v4.unchanged")}</span>
                ) : (
                  <Price t={t} locale={locale} value={{ amount: Math.abs(change), currency: CURRENCY }} change={change < 0 ? "down" : "up"} />
                )
              }
            />
          )}
        </tbody>
      )}
    </table>
  );
}

function Outcome({ t, locale, item, href }: { t: Translator; locale: Locale; item: TrackedItemListItem; href: string }) {
  const seeDeal = (
    // Above the row's stretched link, so it is its own action.
    <Link href={href} className={buttonClasses("primary", "relative z-(--z-index-raised) self-start", "compact")}>
      {t("trackedItems.v3.seeDeal")}
    </Link>
  );
  if (item.deal && item.stale) return <span className="text-body-sm font-semibold text-text">{t("trackedItems.row.state.unverified")}</span>;
  if (item.mode === "BOUGHT") {
    if (!item.deal) return <span className="text-body-sm text-text-muted">{t("trackedItems.v4.noCheaper")}</span>;
    return (
      <>
        <span className="text-caption text-text-muted">{t("trackedItems.v4.upTo")}</span>
        <span className="text-price text-savings">{t("trackedItems.v4.gain", { amount: money(item.deal.maxSaving, locale) })}</span>
        {seeDeal}
      </>
    );
  }
  const target = item.want?.targetPrice;
  if (item.deal) {
    return (
      <>
        <span className="inline-flex items-center gap-1 text-body font-semibold text-savings">
          {t("trackedItems.v4.reached")}
          <Icon icon={Check} size="sm" />
        </span>
        {seeDeal}
      </>
    );
  }
  if (target && item.cheapest) return <span className="text-body-sm font-semibold text-text">{t("trackedItems.v4.toTarget", { amount: tl(Math.max(0, item.cheapest.amount - target.amount), locale) })}</span>;
  if (item.cheapest) return <span className="text-body-sm text-text">{t("trackedItems.row.state.cheapestNow", { price: money(item.cheapest, locale) })}</span>;
  return <span className="text-body-sm text-text-muted">{t("trackedItems.row.state.noPrice")}</span>;
}

/** Status on the image's corner: eye on primary = "Takip ediyorsun", bookmark = "Almak istiyorsun" (Tooltip + accessible name). */
function StatusIcon({ t, mode }: { t: Translator; mode: TrackedItemListItem["mode"] }) {
  const label = t(`trackedItems.v3.status.${mode}`);
  return (
    // 28 px round marker (the same size token as the step indicator dot), above the row link.
    <span className="absolute -top-1 -left-1 z-(--z-index-raised) flex">
      <Tooltip text={label} duplicatesLabel>
        <span
          role="img"
          aria-label={label}
          tabIndex={0}
          className={cn(
            "flex size-(--size-step-indicator-dot) items-center justify-center rounded-pill",
            mode === "BOUGHT" ? "bg-primary text-on-primary" : "border border-border bg-surface text-text",
            focusRing,
          )}
        >
          <Icon icon={mode === "BOUGHT" ? Eye : Bookmark} size="sm" />
        </span>
      </Tooltip>
    </span>
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
        image={<ProductImage src={imageUrl(item.product.imageSha256)} size="sm" fallbackIcon={Package} />}
        flags={<Flag tone="neutral">{t("trackedItems.row.flags.ended")}</Flag>}
        title={item.product.name}
        line={t("trackedItems.row.ended.line", { reason: t(`trackedItems.row.ended.reason.${item.ended.reason}`), date: shortDay(toCalendarDay(new Date(item.ended.at)), locale) })}
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
      layout="priceList"
      href={href}
      image={
        <span className="relative shrink-0">
          <ProductImage src={imageUrl(item.product.imageSha256)} size="lg" fallbackIcon={Package} />
          <StatusIcon t={t} mode={item.mode} />
        </span>
      }
      {...(flags ? { flags } : {})}
      title={item.product.name}
      {...(checked ? { line: checked } : {})}
      columns={[
        { key: "prices", width: "fill", phoneFull: true, content: <PriceList t={t} locale={locale} item={item} href={href} now={now} /> },
        { key: "outcome", width: "1/5", phoneFull: true, content: <Outcome t={t} locale={locale} item={item} href={href} /> },
      ]}
      tone={deal ? "deal" : "default"}
      actions={<Menu label={t("trackedItems.v3.more")} items={menuItems} trigger={<Button variant="ghost" size="compact" iconOnly icon={Ellipsis} label={t("trackedItems.v3.more")} />} />}
    />
  );
}
