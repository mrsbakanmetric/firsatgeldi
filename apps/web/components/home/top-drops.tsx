"use client";

// "Şu an en çok düşenler" (design "3 Ana Sayfa" v2; modules.md Home › D; pagedesign.md §8.1):
// three cards in one row (one column on phones). Card: image size.thumb-card · category ·
// name in a fixed two-line area · "↓ %N düştü" · price box (average → current | "Fark") ·
// one meta line (lock, seller count, "en ucuzu gizli", stock, shipping; ellipsis) · "Takip et"
// (secondary) → Search and Add with the product marked. Every part sits at the same height
// in every card: the cards share the grid's rows (subgrid), so the tallest
// name sets the header row for all three. Seller-less by construction:
// no seller, platform, listing link or "Göster" in this section. "Genel" + one-line note
// when the user's categories have no big drop; nothing qualifies → the caller hides it.
import type { TopDrops } from "@firsatgeldi/contracts";
import { type Locale, type Translator } from "@firsatgeldi/i18n";
import { buttonClasses, chipClasses, Flag, Icon, ProductImage } from "@firsatgeldi/ui";
import { ArrowDown, Info, Lock, Package } from "lucide-react";
import Link from "next/link";
import { searchAddHref } from "../../lib/handoff";
import { checkedAgo, money } from "../search-add/format";
import { imageUrl } from "../catalogue-search/catalogue-search-box";

export function TopDropsSection({ t, locale, drops, now }: { t: Translator; locale: Locale; drops: TopDrops; now: number }) {
  const latest = drops.items.map((item) => item.checkedAt).sort().at(-1);
  const checked = latest ? checkedAgo(t, latest, now) : "";
  const general = drops.scope === "GENERAL";
  return (
    <section aria-labelledby="drops-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="drops-title" className="text-h3 text-text">
              {t("home.drops.title")}
            </h2>
            {general && <Flag tone="neutral">{t("home.drops.generalBadge")}</Flag>}
          </div>
          <p className="text-caption text-text-muted">{t(general ? "home.drops.general" : "home.drops.categories", { days: drops.windowDays, checked })}</p>
        </div>
        {!general && (
          <ul aria-label={t("trackedItems.category.label")} className="flex flex-wrap gap-2">
            {drops.categories.map((category) => (
              <li key={category.id} className={chipClasses()}>
                {category.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {general && drops.hasTrackedCategories && (
        <p role="note" className="flex items-center gap-2 rounded-md bg-surface-alt px-4 py-3 text-body-sm text-text">
          <Icon icon={Info} size="sm" className="text-text-muted" />
          {t("home.drops.note")}
        </p>
      )}
      {/* Each card spans four shared rows (subgrid), so header, price box, meta line and action line up across cards. */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {drops.items.map((item) => (
          <li key={item.product.id} className="row-span-4 grid grid-rows-subgrid gap-3 rounded-lg border border-border bg-surface p-4" data-testid="drop-card">
            <div className="flex items-start gap-3">
              <ProductImage src={imageUrl(item.product.imageSha256)} size="card" fallbackIcon={Package} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-caption text-text-muted">{item.product.category.name}</span>
                {/* At most two lines; the shared rows keep every card's parts at the same height. */}
                <h3 className="line-clamp-2 text-body font-semibold text-text">{item.product.name}</h3>
                <Flag tone="success" icon={ArrowDown} className="self-start">
                  {t("home.drops.dropped", { pct: item.dropPct })}
                </Flag>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 rounded-md bg-surface-alt p-3">
              <span className="flex flex-col">
                <span className="text-caption text-text-muted">{t("home.drops.average", { price: money(item.averagePrice, locale) })}</span>
                <span className="text-price text-text">{money(item.currentPrice, locale)}</span>
              </span>
              <span className="flex flex-col items-end">
                <span className="text-caption text-text-muted">{t("home.drops.difference")}</span>
                <span className="text-price text-savings">{money(item.dropAmount, locale)}</span>
              </span>
            </div>
            <span className="flex min-w-0 items-center gap-1 text-caption text-text-muted">
              <Icon icon={Lock} size="sm" className="shrink-0" />
              <span className="truncate">
                {[t("home.drops.sellers", { count: item.sellerCount }), t("home.drops.hidden"), t(`trackedItems.v4.stock.${item.stockState}`), t("home.drops.shippingIncluded")].join(t("common.listSeparator"))}
              </span>
            </span>
            <Link href={searchAddHref(locale, { productId: item.product.id })} className={buttonClasses("secondary", "w-full", "compact")}>
              {t("home.drops.follow")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
