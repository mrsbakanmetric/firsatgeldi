"use client";

// "Takip ettiklerin" (design "3 Ana Sayfa" v2; modules.md Home › C; pagedesign.md §8.1):
// up to four small cards in a two-column grid (one column on phones), Home priority order,
// "Tümü (N)" → Tracked Items. Card: image size.thumb-md with the status icon · name (one
// line) · purchase or target line · check time · the outcome column on the right at
// size.card-outcome-width, so it lines up across cards; every card has the same height
// (grid rows share one height). The whole card opens Product Detail; no seller names, no
// "Göster" here. A second urgent item comes first with an emphasised (savings) border.
import type { HomeCard } from "@firsatgeldi/contracts";
import { daysBetween, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { cn, focusRing, Icon, ProductImage } from "@firsatgeldi/ui";
import { Check, Package } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ago, checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../search-add/search-box";
import { StatusIcon, tl } from "../tracked-items/parts";

function line(t: Translator, locale: Locale, item: HomeCard, today: string): string {
  if (item.purchase) {
    const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
    const price = money(item.purchase.pricePaid, locale);
    return left !== null && left >= 0 ? t("home.cards.boughtReturn", { price, count: left }) : t("home.cards.bought", { price });
  }
  const duration = t(`searchAdd.confirm.durations.${item.want?.trackingDuration ?? "UNLIMITED"}`);
  return item.want?.targetPrice ? t("home.cards.want", { price: money(item.want.targetPrice, locale), duration }) : t("home.cards.wantNoTarget", { duration });
}

/** The outcome column: a main value and one caption under it. */
function outcome(t: Translator, locale: Locale, item: HomeCard): { main: ReactNode; sub: string | null; good: boolean } {
  if (item.deal && item.stale) return { main: t("home.cards.unverified"), sub: null, good: false };
  const now = item.cheapest ? t("home.cards.now", { price: money(item.cheapest, locale) }) : null;
  if (item.deal && item.mode === "BOUGHT") return { main: money(item.deal.maxSaving, locale), sub: t("home.cards.gain", { count: item.deal.cheaperCount }), good: true };
  if (item.deal)
    return {
      main: (
        <span className="inline-flex items-center gap-1">
          {t("home.cards.reached")}
          <Icon icon={Check} size="sm" />
        </span>
      ),
      sub: now,
      good: true,
    };
  if (item.mode === "BOUGHT") return { main: t("home.cards.noCheaper"), sub: t("home.cards.yoursCheapest"), good: false };
  const target = item.want?.targetPrice;
  if (target && item.cheapest) return { main: t("home.cards.toTarget", { amount: tl(Math.max(0, item.cheapest.amount - target.amount), locale) }), sub: now, good: false };
  return { main: item.cheapest ? t("trackedItems.row.state.cheapestNow", { price: money(item.cheapest, locale) }) : t("trackedItems.row.state.noPrice"), sub: null, good: false };
}

export function TrackedCards({ t, locale, cards, total, now }: { t: Translator; locale: Locale; cards: readonly HomeCard[]; total: number; now: number }) {
  if (!cards.length) return null;
  const today = toCalendarDay(new Date(now));
  return (
    <section aria-labelledby="cards-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="cards-title" className="text-h3 text-text">
          {t("home.cards.title")}
        </h2>
        <Link href={localizedPath("/takip", locale)} className={cn("text-body-sm font-semibold text-primary", focusRing)}>
          {t("home.cards.all", { count: total })}
        </Link>
      </div>
      {/* Rows share one height (auto-rows-fr); the outcome column has one width in every card. */}
      <ul className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((item) => {
          const result = outcome(t, locale, item);
          return (
            <li key={item.id} className="relative flex">
              <span className="absolute top-0 left-0 z-(--z-index-raised)">
                <StatusIcon t={t} mode={item.mode} />
              </span>
              <Link
                href={localizedPath("/takip/[id]", locale, { id: item.id })}
                aria-label={item.emphasised ? `${item.product.name}${t("common.listSeparator")}${t("home.cards.emphasised")}` : item.product.name}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-4 rounded-lg bg-surface px-4 py-3 text-text hover:bg-surface-alt",
                  item.emphasised ? "border-(length:--border-width-strong) border-savings" : "border border-border",
                  focusRing,
                )}
              >
                <ProductImage src={imageUrl(item.product.imageSha256)} size="md" fallbackIcon={Package} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold">{item.product.name}</span>
                  <span className="truncate text-caption text-text-muted">{line(t, locale, item, today)}</span>
                  {item.lastCheckedAt && (
                    <span className={cn("text-caption", item.stale ? "text-on-warning-subtle" : "text-text-muted")}>
                      {item.stale ? t("trackedItems.row.staleAge", { ago: ago(t, item.lastCheckedAt, now) }) : checkedAgo(t, item.lastCheckedAt, now)}
                    </span>
                  )}
                </span>
                <span data-testid="card-outcome" className="flex w-(--size-card-outcome-width) shrink-0 flex-col items-end text-right">
                  <span className={cn("whitespace-nowrap", result.good ? "text-price text-savings" : "text-body-sm font-semibold text-text")}>{result.main}</span>
                  {result.sub && <span className="text-caption text-text-muted">{result.sub}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
