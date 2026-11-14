// Confirm panel, tracking and the reveal gate (architecture.md §6, §16;
// database.md §8, §9). Cheaper sellers are referred to by rank only.
import { returnDeadline } from "@firsatgeldi/core";
import { PRODUCTS, type ProductKey, TARGET_HINTS_MINOR } from "../fixtures/catalog";
import { type OfferFixture, offersFor, PLATFORM_LIST, PLATFORMS, productKeyOf, SELLERS } from "../fixtures/market";
import { newId } from "../ids";
import { MockApiError, route } from "../route";
import { REVEAL_GATE_STAGE, SYSTEM_SETTINGS } from "../settings";
import type { MockController, RefTarget } from "../state";
import { fullOffer, money, refFor, totalMinor } from "../views";
import { activeTrackingCount, entitlements, fold, requireUser } from "./shared";

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
const DAYS_PER_WEEK = 7;
/** Tracking durations (database.md §8 `tracking_duration`): weeks or calendar months. */
const DURATION: Record<"1W" | "1M" | "3M", { days?: number; months?: number }> = { "1W": { days: DAYS_PER_WEEK }, "1M": { months: 1 }, "3M": { months: 3 } };

function productOrThrow(id: string): ProductKey {
  const key = productKeyOf(id);
  if (!key) throw new MockApiError("NOT_FOUND");
  return key;
}

function normalise(name: string): string {
  return fold(name.trim()).replace(/\s+/g, " ");
}

/**
 * Rating tile verdict (modules.md seller trust indicator): `seller_trust` when it has
 * enough evidence; otherwise the store rating against `listing.seller_rating_good_min`;
 * no rating either → INSUFFICIENT without a reason ("henüz yeterli veri yok").
 */
function sellerTrust(seller: (typeof SELLERS)[keyof typeof SELLERS]) {
  if (seller.trust.verdict !== "INSUFFICIENT") return seller.trust;
  if (seller.rating === null) return { verdict: "INSUFFICIENT" as const, reasonKey: null };
  const good = seller.rating >= SYSTEM_SETTINGS["listing.seller_rating_good_min"];
  return { verdict: "INSUFFICIENT" as const, reasonKey: good ? "trust.reason.storeRatingGood" : "trust.reason.storeRatingLow" };
}

/**
 * Seller lookup limit per signed-in user [DECIDED 2026-11-14]: at most
 * `seller_lookup.rate_limit_per_minute` lookups in any 60 seconds; above it RATE_LIMITED.
 * Refused calls do not count, so the user can try again once the window moves on.
 */
function takeSellerLookup(controller: MockController, userId: string): void {
  const now = controller.now().getTime();
  const recent = (controller.state.sellerLookups.get(userId) ?? []).filter((at) => now - at < MS_PER_MINUTE);
  if (recent.length >= SYSTEM_SETTINGS["seller_lookup.rate_limit_per_minute"]) {
    controller.state.sellerLookups.set(userId, recent);
    throw new MockApiError("RATE_LIMITED");
  }
  controller.state.sellerLookups.set(userId, [...recent, now]);
}

/** Offers cheaper than the price paid, the user's own offer excluded, cheapest first. */
export function cheaperOffers(productKey: ProductKey, pricePaidMinor: number, ownOfferId: string | null): OfferFixture[] {
  return offersFor(productKey)
    .filter((offer) => offer.id !== ownOfferId && offer.stockState !== "OUT_OF_STOCK" && totalMinor(offer) < pricePaidMinor)
    .sort((a, b) => totalMinor(a) - totalMinor(b));
}

function ownRef(controller: MockController, userId: string, ref: string | null | undefined): RefTarget | null {
  if (!ref) return null;
  const target = controller.state.refs.get(ref);
  // A ref of another user does not exist for this user (architecture.md §6.2).
  if (!target || target.userId !== userId) throw new MockApiError("NOT_FOUND");
  return target;
}

function latestReveal(controller: MockController, userId: string, offerId: string) {
  return controller.state.reveals.filter((row) => row.userId === userId && row.offerId === offerId).at(-1);
}

/** A ref of a ranked (cheaper) offer; the user's own seller ref (rank 0) is never revealed. */
function hiddenRef(controller: MockController, userId: string, ref: string): RefTarget {
  const target = ownRef(controller, userId, ref);
  if (!target || target.rank < 1) throw new MockApiError("NOT_FOUND");
  return target;
}

function offerOf(target: RefTarget): OfferFixture {
  const offer = offersFor(target.productKey).find((item) => item.id === target.offerId);
  if (!offer) throw new MockApiError("NOT_FOUND");
  return offer;
}

function trackingEndsAt(now: Date, duration: "1W" | "1M" | "3M" | "UNLIMITED"): string | null {
  if (duration === "UNLIMITED") return null;
  const end = new Date(now);
  const step = DURATION[duration];
  if (step.days) end.setUTCDate(end.getUTCDate() + step.days);
  if (step.months) end.setUTCMonth(end.getUTCMonth() + step.months);
  return end.toISOString();
}

export function trackingHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "getConfirmContext", ({ params, actor }) => {
      const { userId } = requireUser(actor);
      const key = productOrThrow(params.id);
      const product = PRODUCTS[key];
      const hints = TARGET_HINTS_MINOR[key];
      return {
        data: {
          productId: product.id,
          platforms: PLATFORM_LIST.map((platform) => ({ id: platform.id, name: platform.name, returnRule: platform.returnRule })),
          noWithdrawalRight: product.category.noWithdrawalRight,
          warnings: [...(product.hasBrandCode ? [] : (["NO_BRAND_CODE"] as const)), ...(product.category.supported ? [] : (["CATEGORY_UNSUPPORTED"] as const))],
          alreadyTracking: state.trackedItems
            .filter((item) => item.userId === userId && item.productKey === key && item.state === "ACTIVE")
            .map((item) => ({ trackedItemId: item.id, mode: item.mode, since: item.createdAt })),
          targetHints: {
            lowest30Days: hints ? money(hints.lowest30Days) : null,
            lowest6Months: hints ? money(hints.lowest6Months) : null,
          },
        },
        meta: { entitlements: entitlements(controller, actor) },
      };
    }),

    route(controller, "sellerLookup", ({ params, body, actor, checkedAt, note, sourcesMissing }) => {
      const { userId } = requireUser(actor);
      const key = productOrThrow(params.id);
      note({ targetType: "product", targetId: PRODUCTS[key].id, metadata: { platformId: body.platformId } });
      takeSellerLookup(controller, userId);
      const platform = PLATFORM_LIST.find((item) => item.id === body.platformId);
      if (!platform) throw new MockApiError("NOT_FOUND");
      // Exact match only, on this product and platform (architecture.md §6.4 R1: no seller list).
      const offer = offersFor(key).find((item) => SELLERS[item.seller].platform === platform.key && normalise(SELLERS[item.seller].name) === normalise(body.name));
      note({ targetType: "product", targetId: PRODUCTS[key].id, metadata: { platformId: platform.id, found: Boolean(offer) } });
      if (!offer) return { data: { match: null } };
      const seller = SELLERS[offer.seller];
      const ref = refFor(state, userId, key, offer, 0, null);
      const own = fullOffer({ now: controller.now(), checkedAt }, offer, ref, 0, null);
      return {
        data: {
          match: {
            sellerRef: ref, sellerName: seller.name, sellerRating: seller.rating, sellerRatingCount: seller.ratingCount, trust: sellerTrust(seller),
            stockState: offer.stockState, warrantyType: offer.warrantyType, listingUrl: own.listingUrl, lastCheckedAt: own.lastCheckedAt,
          },
        },
        ...(sourcesMissing ? { meta: { sourcesMissing: true } } : {}),
      };
    }),

    route(controller, "teaser", ({ params, body, actor, now, checkedAt, empty, note, sourcesMissing }) => {
      const { userId } = requireUser(actor);
      const key = productOrThrow(params.id);
      const own = ownRef(controller, userId, body.sellerRef);
      const cheaper = empty ? [] : cheaperOffers(key, body.pricePaid.amount, own?.offerId ?? null);
      const offers = cheaper.map((offer, index) => {
        const rank = index + 1;
        return fullOffer({ now, checkedAt }, offer, refFor(state, userId, key, offer, rank, body.pricePaid.amount), rank, body.pricePaid.amount);
      });
      const best = offers[0];
      note({ targetType: "product", targetId: PRODUCTS[key].id, metadata: { cheaperCount: offers.length } });
      return {
        data: {
          offers,
          summary: {
            cheaperCount: offers.length,
            maxSaving: best?.saving ?? null,
            lastCheckedAt: offers.length ? offers.map((offer) => offer.lastCheckedAt).sort().at(-1) ?? null : null,
          },
        },
        ...(best || sourcesMissing ? { meta: { ...(best ? { checkedAt: best.lastCheckedAt } : {}), ...(sourcesMissing ? { sourcesMissing: true } : {}) } } : {}),
      };
    }),

    route(controller, "createTrackedItem", ({ body, actor, now, note }) => {
      const { user, userId } = requireUser(actor);
      const key = productOrThrow(body.productId);
      const product = PRODUCTS[key];
      if (state.trackedItems.some((item) => item.userId === userId && item.productKey === key && item.mode === body.mode && item.state === "ACTIVE")) {
        throw new MockApiError("ALREADY_TRACKING");
      }
      const limit = entitlements(controller, actor).tracking.limit;
      if (limit !== null && activeTrackingCount(controller, userId) >= limit) throw new MockApiError("LIMIT_REACHED", { params: { limit } });

      const id = newId();
      const createdAt = now.toISOString();
      let deadline: { day: string; status: "ESTIMATED" | "CONFIRMED" | "USER_EDITED" } | null = null;
      let platformKey: keyof typeof PLATFORMS | null = null;
      let sellerOfferId: string | null = null;
      const otherPlatformName = body.mode === "BOUGHT" ? (body.otherPlatformName ?? null) : null;
      if (body.mode === "BOUGHT" && otherPlatformName) {
        // "Diğer" platform: no return rule is known, so only the user's last day counts; the seller stays as typed.
        if (!product.category.noWithdrawalRight && body.returnDeadline) deadline = { day: body.returnDeadline, status: "USER_EDITED" };
      } else if (body.mode === "BOUGHT") {
        const platform = PLATFORM_LIST.find((item) => item.id === body.platformId);
        if (!platform) throw new MockApiError("NOT_FOUND");
        platformKey = platform.key as keyof typeof PLATFORMS;
        sellerOfferId = ownRef(controller, userId, body.sellerRef)?.offerId ?? null;
        if (!product.category.noWithdrawalRight) {
          if (body.returnDeadline) deadline = { day: body.returnDeadline, status: "USER_EDITED" };
          else {
            const estimate = returnDeadline(body.orderedOn, platform.returnRule);
            deadline = { day: estimate.day, status: estimate.estimated ? "ESTIMATED" : "CONFIRMED" };
          }
        }
      }
      const endsAt = body.mode === "WANT" ? trackingEndsAt(now, body.trackingDuration) : null;
      state.trackedItems.push({
        id, userId, productKey: key, mode: body.mode, platform: platformKey, otherPlatformName, sellerOfferId,
        sellerName: body.mode === "BOUGHT" ? (body.sellerName ?? null) : null,
        pricePaidMinor: body.mode === "BOUGHT" ? body.pricePaid.amount : null, state: "ACTIVE", createdAt,
        orderedOn: body.mode === "BOUGHT" ? body.orderedOn : null,
        orderStatus: body.mode === "BOUGHT" ? body.orderStatus : null,
        returnDeadline: deadline?.day ?? null,
        returnDeadlineStatus: deadline?.status ?? null,
        targetPriceMinor: body.mode === "WANT" ? (body.targetPrice?.amount ?? null) : null,
        trackingDuration: body.mode === "WANT" ? body.trackingDuration : null,
        trackingEndsAt: endsAt,
      });
      // The first check runs right after confirming ("ilk kontrol az önce yapıldı").
      state.lastChecks.set(id, createdAt);
      state.trackedItemEvents.push({
        id: newId(), trackedItemId: id, type: "CREATED", actor: "USER", createdAt,
        data: { mode: body.mode, plan: user.plan, ...(otherPlatformName ? { otherPlatformName } : {}) },
      });
      note({ targetType: "tracked_item", targetId: id, metadata: { mode: body.mode, productId: product.id, ...(otherPlatformName ? { otherPlatform: true } : {}) } });
      return {
        status: 201,
        data: {
          id, productId: product.id, mode: body.mode, state: "ACTIVE",
          returnDeadline: deadline?.day ?? null, returnDeadlineStatus: deadline?.status ?? null,
          noWithdrawalRight: product.category.noWithdrawalRight,
          trackingEndsAt: endsAt,
          createdAt,
        },
      };
    }),

    route(controller, "revealOffer", ({ params, actor, now, checkedAt, note }) => {
      const { user, userId } = requireUser(actor);
      const target = hiddenRef(controller, userId, params.ref);
      const offer = offerOf(target);
      // Application Manager: no allowance spent, every view audited (architecture.md §6.1).
      const isManager = user.roles.includes("APP_MANAGER");
      const gate = isManager ? "ADMIN" : REVEAL_GATE_STAGE;
      const expiresAt = new Date(now.getTime() + SYSTEM_SETTINGS["reveal.open_hours"] * MS_PER_HOUR).toISOString();
      state.reveals.push({
        id: newId(), userId, offerId: offer.id, action: "REVEAL", gate, priceAtReveal: offer.priceMinor, offerRankAtReveal: target.rank,
        expiresAt, priceWatchUntil: new Date(now.getTime() + SYSTEM_SETTINGS["reveal.price_watch_minutes"] * MS_PER_MINUTE).toISOString(),
        createdAt: now.toISOString(),
      });
      if (isManager) {
        state.auditLogs.push({ id: newId(), actorId: userId, action: "offer.reveal", targetType: "offer", targetId: offer.id, containsHiddenSeller: true, createdAt: now.toISOString() });
      }
      note({ targetType: "offer", targetId: offer.id, metadata: { gate, rank: target.rank }, containsHiddenSeller: true });
      const full = fullOffer({ now, checkedAt }, offer, params.ref, target.rank, target.pricePaidMinor);
      return { data: { allowed: true, offer: { ...full, commissionNote: true, revealExpiresAt: expiresAt, gateUsed: gate } } };
    }),

    route(controller, "hideOffer", ({ params, actor, now, checkedAt, note }) => {
      const { userId } = requireUser(actor);
      const target = hiddenRef(controller, userId, params.ref);
      const offer = offerOf(target);
      state.reveals.push({
        id: newId(), userId, offerId: offer.id, action: "HIDE", gate: null, priceAtReveal: null, offerRankAtReveal: target.rank,
        expiresAt: null, priceWatchUntil: null, createdAt: now.toISOString(),
      });
      note({ targetType: "offer", targetId: offer.id, metadata: { rank: target.rank } });
      return { data: { offer: fullOffer({ now, checkedAt }, offer, params.ref, target.rank, target.pricePaidMinor) } };
    }),

    route(controller, "goToOffer", ({ params, actor, now, checkedAt, note }) => {
      const { userId } = requireUser(actor);
      const target = hiddenRef(controller, userId, params.ref);
      const offer = offerOf(target);
      const reveal = latestReveal(controller, userId, offer.id);
      const revealed = reveal?.action === "REVEAL" && reveal.expiresAt !== null && reveal.expiresAt > now.toISOString();
      if (!revealed) throw new MockApiError("FORBIDDEN");
      note({ targetType: "offer", targetId: offer.id, metadata: { rank: target.rank }, containsHiddenSeller: true });
      // Re-check before leaving (architecture.md §6.3 price protection).
      if (offer.stockState === "OUT_OF_STOCK") {
        const next = target.pricePaidMinor === null ? undefined : cheaperOffers(target.productKey, target.pricePaidMinor, offer.id)[0];
        const nextRef = next ? refFor(state, userId, target.productKey, next, 1, target.pricePaidMinor) : null;
        return { data: { status: "GONE", next: next && nextRef ? fullOffer({ now, checkedAt }, next, nextRef, 1, target.pricePaidMinor) : null } };
      }
      return { data: { status: "OK", url: fullOffer({ now, checkedAt }, offer, params.ref, target.rank, target.pricePaidMinor).listingUrl } };
    }),
  ];
}
