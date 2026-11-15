"use client";

// Product Detail offers (design v2, pagedesign.md §8.3; modules.md Product Detail, Hidden Seller,
// Ratings, Installments): two columns of equal height, an odd last card spans both. Each card:
// rank (lock) or the revealed seller + platform · price + difference · Göster (revealed: Mağazaya
// git + Gizle) on the top row; stock in words · shipping · delivery · warranty, then check time;
// after Göster the store ratings on the store's own scale and "Yorumları mağazada oku"; the one-line
// summary (trust · instalments · campaign) that opens; the fake-discount note; the reveal time left
// and the commission note. The user's own seller is the reference row under the grid. A seller and a
// platform appear only after Göster — from the reveal answer or an offer the server lists as revealed.
import type { DetailOffer, DetailOffers, OfferSummary, Rating, RevealedOfferView, TrackedItemDetail } from "@firsatgeldi/contracts";
import { formatNumber } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { cn, FreshnessLine, HiddenOfferCard, Icon, StatusBanner } from "@firsatgeldi/ui";
import { ChevronDown, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { ago, checkedAgo, money } from "../search-add/format";
import { useOfferActions } from "../tracked-items/offer-actions";
import { Price } from "../tracked-items/parts";
import { OFFERS_ANCHOR } from "./header";

const RATING_DIGITS = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const MS_PER_DAY = 86_400_000;

function rating(t: Translator, locale: Locale, value: Rating): string {
  return t("productDetail.offers.ratingValue", { rating: formatNumber(value.value, locale, RATING_DIGITS), scale: value.scale });
}

function details(t: Translator, locale: Locale, offer: DetailOffer, now: number): string {
  const days = Math.max(1, Math.floor((now - Date.parse(offer.stockSince)) / MS_PER_DAY));
  const stock = offer.stockState === "OUT_OF_STOCK" ? t("trackedItems.v4.stock.OUT_OF_STOCK") : offer.stockState === "LOW_STOCK" ? t("trackedItems.v4.stock.LOW_STOCK") : t("productDetail.offers.inStockFor", { count: days });
  const shipping =
    offer.shippingCost === null ? t("searchAdd.confirm.shippingUnknown") : offer.shippingCost.amount === 0 ? t("searchAdd.confirm.shippingFree") : t("searchAdd.confirm.shipping", { amount: money(offer.shippingCost, locale) });
  const delivery = offer.deliveryDays
    ? offer.deliveryDays.min === offer.deliveryDays.max
      ? t("searchAdd.confirm.delivery", { count: offer.deliveryDays.min })
      : t("searchAdd.confirm.deliveryRange", { min: offer.deliveryDays.min, max: offer.deliveryDays.max })
    : null;
  return [stock, shipping, delivery, t(`productDetail.offers.warranty.${offer.warrantyType}`)].filter(Boolean).join(t("common.listSeparator"));
}

function summaryLine(t: Translator, locale: Locale, summary: OfferSummary): string[] {
  const trust =
    summary.trust.verdict === "GOOD" ? t("searchAdd.confirm.trustGood") : summary.trust.verdict === "CAUTION" ? t("searchAdd.confirm.trustCaution") : t("productDetail.offers.trustUnknown");
  return [
    trust,
    summary.installments ? t("productDetail.offers.installments", { count: summary.installments.maxInterestFree }) : t("productDetail.offers.noInstallments"),
    summary.campaign
      ? summary.campaign.amount
        ? t(`productDetail.offers.campaignAmount.${summary.campaign.kind}`, { amount: money(summary.campaign.amount, locale) })
        : t(`productDetail.offers.campaign.${summary.campaign.kind}`)
      : t("productDetail.offers.noCampaign"),
  ];
}

/** A trust reason from the catalogue (`trust.reason.*`); an unknown key shows nothing rather than a code. */
function reasonText(t: Translator, key: string | null): string | null {
  if (!key) return null;
  try {
    return t(key as never);
  } catch {
    return null;
  }
}

/** The one-line summary that opens: trust in words with its reason, instalments, campaign. */
function Summary({ t, locale, summary }: { t: Translator; locale: Locale; summary: OfferSummary }) {
  const [open, setOpen] = useState(false);
  const parts = summaryLine(t, locale, summary);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-(--size-touch-target-min) items-center justify-between gap-2 rounded-md bg-surface-alt px-3 text-left text-caption font-medium text-text"
      >
        <span>{parts.join(t("common.listSeparator"))}</span>
        <Icon icon={ChevronDown} size="sm" className={cn("shrink-0 text-text-muted", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="flex flex-col gap-1 px-3 text-caption text-text-muted">
          <li>{reasonText(t, summary.trust.reasonKey) ?? t("searchAdd.confirm.noData")}</li>
          <li>{parts[1]}</li>
          <li>{parts[2]}</li>
        </ul>
      )}
    </div>
  );
}

function Card({ t, locale, item, offer, shown, actions, now, wide }: { t: Translator; locale: Locale; item: TrackedItemDetail; offer: DetailOffer; shown: RevealedOfferView | null; actions: ReturnType<typeof useOfferActions>; now: number; wide: boolean }) {
  const reference = item.purchase?.pricePaid.amount ?? null;
  const total = offer.price.amount + (offer.shippingCost?.amount ?? 0);
  const difference = reference !== null ? reference - total : null;
  // Not checked for `tracking.stale_hours` (the server says so per item): the age is stated.
  const stale = item.stale;
  const revealDays = shown ? Math.max(1, Math.ceil((Date.parse(shown.revealExpiresAt) - now) / MS_PER_DAY)) : 0;
  return (
    <li className={cn("flex", wide && "md:col-span-2")}>
      <HiddenOfferCard
        layout="detail"
        className="w-full"
        hiddenLabel={offer.rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank: offer.rank })}
        price={<span className="text-price-lg text-text">{money(offer.price, locale)}</span>}
        saving={difference !== null && difference > 0 ? <Price t={t} locale={locale} value={{ amount: difference, currency: "TRY" }} change="down" /> : null}
        details={details(t, locale, offer, now)}
        freshness={<FreshnessLine stale={stale}>{stale ? t("trackedItems.row.staleAge", { ago: ago(t, offer.lastCheckedAt, now) }) : checkedAgo(t, offer.lastCheckedAt, now)}</FreshnessLine>}
        revealLabel={t("searchAdd.confirm.reveal")}
        onReveal={() => actions.reveal(offer)}
        revealing={actions.revealing(offer.ref)}
        revealed={
          shown
            ? {
                sellerName: shown.sellerName,
                rating: null,
                platformName: shown.platformName,
                goLabel: t("searchAdd.confirm.goToStore"),
                onGo: () => actions.go(offer),
                going: actions.going(offer.ref),
                hideLabel: t("searchAdd.confirm.hide"),
                onHide: () => actions.hide(offer),
              }
            : null
        }
      >
        {shown && (shown.productRating || shown.sellerRating || shown.reviewsUrl) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border px-3 py-2 text-body-sm">
            {shown.productRating && (
              <span className="inline-flex items-center gap-1 font-semibold text-text">
                <Icon icon={Star} size="sm" />
                {rating(t, locale, shown.productRating)}
                <span className="font-medium text-text-muted">{t("productDetail.offers.productRating", { count: formatNumber(shown.productRating.count ?? 0, locale) })}</span>
              </span>
            )}
            {shown.sellerRating && (
              <span className="font-semibold text-text">
                {t("productDetail.offers.sellerRating", { rating: rating(t, locale, shown.sellerRating) })}
                {shown.sellerRating.count !== null && <span className="font-medium text-text-muted"> {t("productDetail.offers.ratingCount", { count: formatNumber(shown.sellerRating.count, locale) })}</span>}
              </span>
            )}
            {shown.reviewsUrl && (
              <a href={shown.reviewsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary">
                {t("productDetail.offers.reviews")}
                <Icon icon={ExternalLink} size="sm" />
              </a>
            )}
          </div>
        )}
        <Summary t={t} locale={locale} summary={offer.summary} />
        {offer.fakeDiscountNote && (
          <p className="rounded-md bg-info-subtle px-3 py-2 text-caption text-info">{t("productDetail.offers.fakeDiscount", { price: money(offer.fakeDiscountNote.claimedOldPrice, locale) })}</p>
        )}
        {shown && <p className="text-caption text-text-muted">{t("productDetail.offers.revealNote", { count: revealDays })}</p>}
      </HiddenOfferCard>
    </li>
  );
}

export function OffersSection({ t, locale, item, offers, now }: { t: Translator; locale: Locale; item: TrackedItemDetail; offers: DetailOffers; now: number }) {
  const actions = useOfferActions(t);
  const list = offers.offers;
  const own = offers.own;
  return (
    <section id={OFFERS_ANCHOR} aria-labelledby="of-title" className="flex scroll-mt-(--size-header-height) flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="of-title" className="text-h2 text-text">
          {t("productDetail.offers.title", { count: list.length })}
        </h2>
        <span className="text-caption text-text-muted">{t("productDetail.offers.caption")}</span>
      </div>
      {actions.problem && <StatusBanner tone="danger">{actions.problem}</StatusBanner>}
      {offers.underReview > 0 && <StatusBanner tone="warning">{t("productDetail.offers.underReview", { count: offers.underReview })}</StatusBanner>}
      <ul className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2">
        {list.map((offer, index) => (
          <Card
            key={offer.ref}
            t={t}
            locale={locale}
            item={item}
            offer={offer}
            shown={actions.shown(offer.ref, offer.revealed ? offer : null)}
            actions={actions}
            now={now}
            wide={list.length % 2 === 1 && index === list.length - 1}
          />
        ))}
      </ul>
      {own && item.purchase && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt px-4 py-3">
          <span className="flex min-w-0 flex-col">
            <span className="text-body-sm font-semibold text-text">
              {[t("productDetail.offers.own"), own.sellerName, own.platformName].filter(Boolean).join(t("common.listSeparator"))}
            </span>
            <span className="text-caption text-text-muted">
              {[
                t(`trackedItems.v4.stock.${own.stockState}`),
                own.shippingCost === null ? t("searchAdd.confirm.shippingUnknown") : own.shippingCost.amount === 0 ? t("searchAdd.confirm.shippingFree") : t("searchAdd.confirm.shipping", { amount: money(own.shippingCost, locale) }),
                checkedAgo(t, own.lastCheckedAt, now),
              ].join(t("common.listSeparator"))}
            </span>
          </span>
          <span className="flex flex-col items-end">
            <span className="text-price text-text">{money(item.purchase.pricePaid, locale)}</span>
            <span className="text-caption text-text-muted">{t("productDetail.offers.yourPrice")}</span>
          </span>
        </div>
      )}
    </section>
  );
}
