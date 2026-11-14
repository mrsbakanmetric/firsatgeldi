"use client";

// Cheaper-price teaser of the confirm panel (design ConfirmPanel "Fırsat geldi";
// product_design_pattern.md §5.2, §5.3): appears only after the price paid is
// known; count + maximum saving, then each cheaper offer by rank with the seller
// hidden until "Göster". The flag is the coral element (no "Fırsatı gör" here).
import { type HiddenOfferView, type RevealedOfferView, type TeaserResult } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { formatNumber } from "@firsatgeldi/core";
import { Flag, FreshnessLine, HiddenOfferCard, MoneyDisplay } from "@firsatgeldi/ui";
import { Zap } from "lucide-react";
import { useState } from "react";
import { useApiMutation } from "../../lib/api/hooks";
import { ago, checkedAgo, money } from "./format";

function details(t: Translator, locale: Locale, offer: HiddenOfferView): string {
  const shipping = offer.shippingCost === null ? t("searchAdd.confirm.shippingUnknown") : offer.shippingCost.amount === 0 ? t("searchAdd.confirm.shippingFree") : t("searchAdd.confirm.shipping", { amount: money(offer.shippingCost, locale) });
  const delivery = offer.deliveryDays
    ? offer.deliveryDays.min === offer.deliveryDays.max
      ? t("searchAdd.confirm.delivery", { count: offer.deliveryDays.min })
      : t("searchAdd.confirm.deliveryRange", { min: offer.deliveryDays.min, max: offer.deliveryDays.max })
    : null;
  return [t(`searchAdd.confirm.stockState.${offer.stockState}`), shipping, delivery, t(`searchAdd.confirm.warrantyType.${offer.warrantyType}`)].filter(Boolean).join(t("common.listSeparator"));
}

export function Teaser({ t, locale, teaser, now, stale, onError }: { t: Translator; locale: Locale; teaser: TeaserResult; now: number; stale: boolean; onError: (error: unknown) => void }) {
  const [revealed, setRevealed] = useState<Record<string, RevealedOfferView>>({});
  const reveal = useApiMutation("revealOffer", { onError });
  const hide = useApiMutation("hideOffer", { onError });
  const go = useApiMutation("goToOffer", { onError });
  if (!teaser.offers.length || !teaser.summary.maxSaving) return null;

  const onReveal = (offer: HiddenOfferView) =>
    reveal.mutate(
      { params: { ref: offer.ref }, idempotencyKey: globalThis.crypto.randomUUID() },
      { onSuccess: ({ data }) => data.allowed && setRevealed((current) => ({ ...current, [offer.ref]: data.offer })) },
    );
  const onHide = (offer: HiddenOfferView) =>
    hide.mutate(
      { params: { ref: offer.ref } },
      {
        onSuccess: () =>
          setRevealed((current) => {
            const next = { ...current };
            delete next[offer.ref];
            return next;
          }),
      },
    );
  const onGo = (offer: HiddenOfferView) =>
    go.mutate({ params: { ref: offer.ref } }, { onSuccess: ({ data }) => data.status === "OK" && globalThis.open(data.url, "_blank", "noopener,noreferrer") });

  return (
    <section aria-label={t("searchAdd.confirm.teaserFlag")} className="flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Flag tone="deal" icon={Zap}>
          {t("searchAdd.confirm.teaserFlag")}
        </Flag>
        {teaser.summary.lastCheckedAt && <span className="text-caption text-text-muted">{ago(t, teaser.summary.lastCheckedAt, now)}</span>}
      </div>
      <p className="text-body text-text">
        <strong>{t("searchAdd.confirm.teaserHeadline", { count: teaser.summary.cheaperCount })}</strong>
        {t("common.listSeparator")}
        <strong className="text-savings">{t("searchAdd.confirm.teaserMax", { amount: money(teaser.summary.maxSaving, locale) })}</strong>
      </p>
      {teaser.offers.map((offer) => {
        const shown = revealed[offer.ref];
        return (
          <HiddenOfferCard
            key={offer.ref}
            hiddenLabel={offer.rank === 1 ? t("searchAdd.confirm.cheapestHidden") : t("searchAdd.confirm.rankHidden", { rank: offer.rank })}
            price={<MoneyDisplay value={money(offer.price, locale)} tone={offer.rank === 1 ? "cheapest" : "own"} />}
            saving={offer.saving ? <MoneyDisplay value={money(offer.saving, locale)} tone="saving" size="body" suffix={t("searchAdd.confirm.saving")} /> : null}
            details={details(t, locale, offer)}
            freshness={<FreshnessLine stale={stale}>{checkedAgo(t, offer.lastCheckedAt, now)}</FreshnessLine>}
            revealLabel={t("searchAdd.confirm.reveal")}
            onReveal={() => onReveal(offer)}
            revealing={reveal.isPending && reveal.variables.params.ref === offer.ref}
            revealed={
              shown
                ? {
                    sellerName: shown.sellerName,
                    rating: shown.sellerRating === null ? null : t("searchAdd.confirm.revealedRating", { rating: formatNumber(shown.sellerRating, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }),
                    platformName: shown.platformName,
                    goLabel: t("searchAdd.confirm.goToStore"),
                    onGo: () => onGo(offer),
                    going: go.isPending && go.variables.params.ref === offer.ref,
                    hideLabel: t("searchAdd.confirm.hide"),
                    onHide: () => onHide(offer),
                  }
                : null
            }
          />
        );
      })}
      <p className="text-caption text-text-muted">{t("searchAdd.confirm.teaserNote")}</p>
    </section>
  );
}
