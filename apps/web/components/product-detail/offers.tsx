"use client";

// Product Detail offers (design v2, pagedesign.md §8.3; modules.md Product Detail, Hidden Seller,
// Ratings, Installments): two columns of equal height, an odd last card spans both. Each card:
// rank (lock) or the revealed seller + platform · price + difference · Göster (revealed: Mağazaya
// git + Gizle) on the top row; stock in words · shipping · delivery · warranty, then check time;
// after Göster the store ratings on the store's own scale and "Yorumları mağazada oku"; the one-line
// summary (trust · instalments · campaign) that opens; the fake-discount note; the reveal time left
// and the commission note. The user's own seller is the reference row under the grid. A seller and a
// platform appear only after Göster — from the reveal answer or an offer the server lists as revealed.
// Want to buy: "En ucuz N satıcı", each card's difference to the cheapest ("en ucuz" · "+752 TL"), no
// reference row. "Mağazaya git" re-checks first (flows A–B): a moved price is stated with "Yeni
// fiyatla mağazaya git" and "Sıradaki satıcıya bak"; a sold-out offer offers "Stoğa gelince haber
// ver" and the next offer, still hidden, with its own Göster.
import type { DetailOffer, DetailOffers, GoResult, HiddenOfferView, OfferSummary, Rating, RevealedOfferView, TrackedItemDetail } from "@firsatgeldi/contracts";
import { formatNumber } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, FreshnessLine, HiddenOfferCard, Icon, StatusBanner } from "@firsatgeldi/ui";
import { ChevronDown, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { ago, checkedAgo, money } from "../search-add/format";
import type { useOfferActions } from "../tracked-items/offer-actions";
import { Price } from "../tracked-items/parts";
import { OFFERS_ANCHOR } from "./header";

type OfferActions = ReturnType<typeof useOfferActions>;
/** What "Mağazaya git" found instead of opening the store. */
type GoOutcome = Exclude<GoResult, { status: "OK" }>;

const cardId = (rank: number) => `offer-rank-${rank}`;

function rankLabel(t: Translator, rank: number): string {
  return rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank });
}

function totalOf(offer: Pick<HiddenOfferView, "price" | "shippingCost">): number {
  return offer.price.amount + (offer.shippingCost?.amount ?? 0);
}

/** "Sıradaki satıcıya bak": brings the next card into view and moves focus to it. */
function showCard(rank: number) {
  const card = globalThis.document?.getElementById(cardId(rank));
  card?.scrollIntoView({ behavior: "smooth", block: "center" });
  card?.focus();
}

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

/** The re-check answer under the card's top row (design flows A–B). */
function Outcome({ t, locale, item, offer, outcome, actions }: { t: Translator; locale: Locale; item: TrackedItemDetail; offer: DetailOffer; outcome: GoOutcome; actions: OfferActions }) {
  const [notified, setNotified] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const notify = useApiMutation("notifyBackInStock", { onSuccess: () => setNotified(true), onError: (error) => setProblem(errorMessage(t, error)) });
  const next = outcome.next;
  const paid = item.purchase?.pricePaid.amount ?? null;
  if (outcome.status === "PRICE_CHANGED") {
    const saving = paid === null ? null : paid - (outcome.price.amount + (offer.shippingCost?.amount ?? 0));
    return (
      <StatusBanner
        tone="warning"
        action={
          <span className="flex flex-wrap gap-2">
            <a href={outcome.url} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", undefined, "compact")}>
              {t("productDetail.go.goNew")}
            </a>
            {next && (
              <Button variant="secondary" size="compact" onClick={() => showCard(next.rank)}>
                {t("productDetail.go.next")}
              </Button>
            )}
          </span>
        }
      >
        {[
          t("productDetail.go.changed", { from: money(offer.price, locale), to: money(outcome.price, locale) }),
          saving === null ? null : saving > 0 ? t("productDetail.go.changedSaving", { amount: money({ amount: saving, currency: outcome.price.currency }, locale) }) : t("productDetail.go.changedNoSaving"),
        ]
          .filter(Boolean)
          .join(" ")}
      </StatusBanner>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <StatusBanner
        tone="warning"
        title={t("productDetail.go.gone")}
        action={
          notified ? undefined : (
            <Button variant="secondary" size="compact" loading={notify.isPending} onClick={() => notify.mutate({ params: { ref: offer.ref } })}>
              {t("productDetail.go.notify")}
            </Button>
          )
        }
      >
        {notified ? t("productDetail.go.notified") : t("productDetail.go.goneText")}
      </StatusBanner>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {next && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-alt px-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="text-body-sm font-semibold text-text">{t("productDetail.go.nextRow", { rank: rankLabel(t, next.rank) })}</span>
            <span className="text-caption text-text-muted">
              {[money(next.price, locale), paid !== null && paid > totalOf(next) ? t("trackedItems.v4.gain", { amount: money({ amount: paid - totalOf(next), currency: next.price.currency }, locale) }) : null]
                .filter(Boolean)
                .join(t("common.listSeparator"))}
            </span>
          </span>
          {actions.shown(next.ref) ? (
            <Button variant="secondary" size="compact" onClick={() => showCard(next.rank)}>
              {t("productDetail.go.next")}
            </Button>
          ) : (
            <Button variant="secondary" size="compact" loading={actions.revealing(next.ref)} onClick={() => actions.reveal(next)}>
              {t("searchAdd.confirm.reveal")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Card({
  t,
  locale,
  item,
  offer,
  shown,
  actions,
  now,
  wide,
  cheapestTotal,
  outcome,
  onOutcome,
}: {
  t: Translator;
  locale: Locale;
  item: TrackedItemDetail;
  offer: DetailOffer;
  shown: RevealedOfferView | null;
  actions: OfferActions;
  now: number;
  wide: boolean;
  /** Want to buy: the cheapest offer's total, the base of "+752 TL". */
  cheapestTotal: number | null;
  outcome: GoOutcome | null;
  onOutcome: (result: GoResult) => void;
}) {
  const reference = item.purchase?.pricePaid.amount ?? null;
  const total = totalOf(offer);
  const difference = reference !== null ? reference - total : null;
  const above = cheapestTotal !== null ? total - cheapestTotal : null;
  // Not checked for `tracking.stale_hours` (the server says so per item): the age is stated.
  const stale = item.stale;
  const revealDays = shown ? Math.max(1, Math.ceil((Date.parse(shown.revealExpiresAt) - now) / MS_PER_DAY)) : 0;
  return (
    <li id={cardId(offer.rank)} tabIndex={-1} className={cn("flex scroll-mt-(--size-header-height)", wide && "md:col-span-2")}>
      <HiddenOfferCard
        layout="detail"
        className="w-full"
        hiddenLabel={rankLabel(t, offer.rank)}
        price={<span className="text-price-lg text-text">{money(offer.price, locale)}</span>}
        saving={
          difference !== null && difference > 0 ? (
            <Price t={t} locale={locale} value={{ amount: difference, currency: "TRY" }} change="down" />
          ) : above === null ? null : above <= 0 ? (
            <span className="text-body-sm font-semibold text-savings">{t("productDetail.offers.cheapestTag")}</span>
          ) : (
            <span className="text-body-sm font-semibold text-text-muted">{t("productDetail.offers.above", { amount: money({ amount: above, currency: offer.price.currency }, locale) })}</span>
          )
        }
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
                onGo: () => actions.go(offer, onOutcome),
                going: actions.going(offer.ref),
                hideLabel: t("searchAdd.confirm.hide"),
                onHide: () => actions.hide(offer),
              }
            : null
        }
      >
        {outcome && <Outcome t={t} locale={locale} item={item} offer={offer} outcome={outcome} actions={actions} />}
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

export function OffersSection({ t, locale, item, offers, actions, now }: { t: Translator; locale: Locale; item: TrackedItemDetail; offers: DetailOffers; actions: OfferActions; now: number }) {
  const [outcomes, setOutcomes] = useState<Record<string, GoOutcome>>({});
  const list = offers.offers;
  const own = offers.own;
  const want = item.mode === "WANT";
  const first = list[0];
  const cheapestTotal = want && first ? totalOf(first) : null;
  return (
    <section id={OFFERS_ANCHOR} aria-labelledby="of-title" className="flex scroll-mt-(--size-header-height) flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="of-title" className="text-h2 text-text">
          {t(want ? "productDetail.offers.titleWant" : "productDetail.offers.title", { count: list.length })}
        </h2>
        <span className="text-caption text-text-muted">{t(want ? "productDetail.offers.captionWant" : "productDetail.offers.caption")}</span>
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
            cheapestTotal={cheapestTotal}
            outcome={outcomes[offer.ref] ?? null}
            onOutcome={(result) =>
              setOutcomes((current) => {
                const rest = Object.fromEntries(Object.entries(current).filter(([ref]) => ref !== offer.ref));
                return result.status === "OK" ? rest : { ...rest, [offer.ref]: result };
              })
            }
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
