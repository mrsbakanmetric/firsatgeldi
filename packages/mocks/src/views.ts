// Fixture → contract shapes. Offers are built as FULL server-side records
// (with seller, platform and link); the route's output schema strips every
// field the view does not define, exactly as the real API does (architecture.md §6.1).
import type { ApiLocale } from "@firsatgeldi/contracts";
import { ATTRIBUTE_LABELS, PRODUCTS, type ProductFixture, type ProductKey } from "./fixtures/catalog";
import { listingUrl, type OfferFixture, PLATFORMS, SELLERS } from "./fixtures/market";
import { pick } from "./fixtures/text";
import { opaqueRef } from "./ids";
import type { RouteContext } from "./route";
import type { MockState } from "./state";

const MS_PER_DAY = 86_400_000;
const CURRENCY = "TRY" as const;

export function money(amount: number) {
  return { amount, currency: CURRENCY };
}

export function productSummary(product: ProductFixture, locale: ApiLocale) {
  return {
    id: product.id,
    name: pick(product.name, locale),
    imageSha256: product.imageSha256,
    category: { id: product.category.id, name: pick(product.category.name, locale) },
    brand: product.brand,
    generation: product.generation ? pick(product.generation, locale) : null,
    colors: product.colors.map((color) => pick(color, locale)),
    bundles: product.familyBundles.map((bundle) => pick(bundle, locale)),
    storeCount: product.storeCount,
  };
}

export function variantLine(product: ProductFixture, locale: ApiLocale): string | null {
  const parts = [product.generation, product.bundle, product.colors[0]].filter((part) => part !== null && part !== undefined);
  return parts.length ? parts.map((part) => pick(part, locale)).join(" · ") : null;
}

/** Attributes understood for a product ("Nasıl anladık"), in the request language. */
export function productAttributes(product: ProductFixture, locale: ApiLocale) {
  const values: [string, string | null][] = [
    ["type", pick(product.category.name, locale)],
    ["brand", product.brand],
    ["model", product.model],
    ["generation", product.generation ? pick(product.generation, locale) : null],
    ["bundle", product.bundle ? pick(product.bundle, locale) : null],
    ["color", product.colors[0] ? pick(product.colors[0], locale) : null],
  ];
  return values
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([key, value]) => ({ key, label: pick(ATTRIBUTE_LABELS[key] ?? { tr: key, en: key }, locale), value }));
}

export function productView(product: ProductFixture, locale: ApiLocale) {
  return {
    id: product.id,
    slug: product.slug,
    title: pick(product.name, locale),
    variantLine: variantLine(product, locale),
    category: { id: product.category.id, name: pick(product.category.name, locale) },
    brand: product.brand,
    attributes: productAttributes(product, locale),
    images: [product.imageSha256],
    storeCount: product.storeCount,
  };
}

export function totalMinor(offer: OfferFixture): number {
  return offer.priceMinor + (offer.shippingMinor ?? 0);
}

/** Opaque ref for this user + product + offer, stored for later reveal/go (architecture.md §6.2). */
export function refFor(state: MockState, userId: string, productKey: ProductKey, offer: OfferFixture, rank: number, pricePaidMinor: number | null): string {
  const ref = opaqueRef([userId, productKey, offer.id]);
  state.refs.set(ref, { userId, offerId: offer.id, productKey, rank, pricePaidMinor });
  return ref;
}

/**
 * The full offer record as the server holds it: every hidden-view field plus
 * the identity fields. Never returned as-is: the route shapes it through the
 * contract view (HiddenOfferView strips identity; RevealedOfferView keeps it).
 */
export function fullOffer(context: Pick<RouteContext<never>, "now" | "checkedAt">, offer: OfferFixture, ref: string, rank: number, pricePaidMinor: number | null) {
  const seller = SELLERS[offer.seller];
  const platform = PLATFORMS[seller.platform];
  const saving = pricePaidMinor === null ? null : pricePaidMinor - totalMinor(offer);
  const daysAgo = (days: number) => new Date(context.now.getTime() - days * MS_PER_DAY).toISOString();
  return {
    ref,
    rank,
    price: money(offer.priceMinor),
    previousPrice: offer.previousPriceMinor === null ? null : money(offer.previousPriceMinor),
    saving: saving === null || saving <= 0 ? null : money(saving),
    // Net saving needs the return cost, which the mock does not model.
    netSaving: null,
    shippingCost: offer.shippingMinor === null ? null : money(offer.shippingMinor),
    deliveryDays: offer.deliveryDays,
    stockState: offer.stockState,
    stockSince: daysAgo(offer.stockSinceDaysAgo),
    priceSince: daysAgo(offer.priceSinceDaysAgo),
    warrantyType: offer.warrantyType,
    lastCheckedAt: context.checkedAt(offer.checkedMinutesAgo),
    fakeDiscountNote: offer.claimedOldPriceMinor === null ? null : { claimedOldPrice: money(offer.claimedOldPriceMinor) },
    // Identity — present only in the server-side record.
    sellerId: seller.id,
    sellerExternalId: seller.externalId,
    sellerName: seller.name,
    sellerRating: seller.rating,
    platformCode: platform.code,
    platformName: platform.name,
    platformDomain: platform.domain,
    listingUrl: listingUrl(offer),
    offerId: offer.id,
  };
}

export { PRODUCTS };
