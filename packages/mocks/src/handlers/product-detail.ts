// Product Detail incl. Want to Buy mode (modules.md Product Detail, Price and Stock History,
// Ratings, Return Window, Want to Buy; implementation_plan.md Appendix B.2). Built from the same
// tracked items as Tracked Items and Home, so every screen shows the same figures. Cheaper
// sellers are named only in offers the user revealed; everything else refers to them by rank,
// and the route's output schema strips any identity field a hidden view does not define.
import {
  type ActionStep,
  API_PREFIX,
  buildPath,
  type BuyOrWaitHint,
  type DetailOffer,
  ENDPOINTS,
  errorBody,
  ERRORS,
  type HistoryRange,
  type StockSubject,
  type TrackedItemDetail,
} from "@firsatgeldi/contracts";
import { addCalendarDays, buyOrWaitHint, crossStoreRating, daysBetween, formatDate, formatMoney, historyTiles, localeFromAcceptLanguage, returnDeadline, toCalendarDay } from "@firsatgeldi/core";
import { http, HttpResponse } from "msw";
import { PRODUCTS } from "../fixtures/catalog";
import { CALENDAR_TEXT, EARLIER_HISTORY, fill, FREQUENT_RETURNS, PRICE_DIFFERENCE_TEXT, RATINGS_READ_MINUTES_AGO } from "../fixtures/detail";
import { type OfferFixture, offersFor, PLATFORMS, productKeyOf, SELLERS } from "../fixtures/market";
import { pick } from "../fixtures/text";
import { seedByKey, stockCodeToState } from "../fixtures/tracking";
import { newId } from "../ids";
import { actorFor, MockApiError, route, type RouteContext } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import type { MockController, TrackedItemEventRow, TrackedItemRow } from "../state";
import { fullOffer, money, refFor, totalMinor, variantLine } from "../views";
import { requireUser } from "./shared";
import { availableOffers, view, type ViewContext } from "./tracked-items";
import { cheaperOffers, hiddenRef, latestReveal, sellerTrust, trackingEndsAt } from "./tracking";

const KURUS = 100;
type StockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/** Days per range (modules.md Price history › Ranges); "all" = from the first day with data. */
const RANGE_DAYS: Record<Exclude<HistoryRange, "all">, number> = { "14d": 14, "1m": 30, "3m": 90, "6m": 180, "1y": 365, "2y": 730 };
/** Stock history boxes (design v2: "Son 14 gün" + "Son 1 ay"). */
const STOCK_DAYS = { "14d": 14, "1m": 30 } as const;
/** Ranked rows in the stock history (the cheapest three, as drawn). */
const STOCK_RANKS = 3;

/** The caller's own tracked item; another user's item does not exist for this user (RLS). */
function ownRow(controller: MockController, userId: string, id: string): { row: TrackedItemRow; index: number } {
  const index = controller.state.trackedItems.findIndex((item) => item.id === id && item.userId === userId);
  const row = controller.state.trackedItems[index];
  if (!row) throw new MockApiError("NOT_FOUND");
  return { row, index };
}

function invalid(field: string): never {
  throw new MockApiError("VALIDATION", { fields: { [field]: ERRORS.VALIDATION.messageKey } });
}

function activeRow(controller: MockController, userId: string, id: string) {
  const found = ownRow(controller, userId, id);
  if (found.row.state !== "ACTIVE") invalid("id");
  return found;
}

function event(controller: MockController, trackedItemId: string, type: TrackedItemEventRow["type"], data: Record<string, unknown>, at: Date) {
  controller.state.trackedItemEvents.push({ id: newId(), trackedItemId, type, actor: "USER", createdAt: at.toISOString(), data });
}

function ownOffer(row: TrackedItemRow): OfferFixture | undefined {
  return row.sellerOfferId ? offersFor(row.productKey).find((offer) => offer.id === row.sellerOfferId) : undefined;
}

/** Action steps (modules.md Product Detail): with a right of withdrawal return → re-order → end; without it price difference → end. */
function stepsOf(row: TrackedItemRow): ActionStep[] {
  if (row.mode !== "BOUGHT") return [];
  return PRODUCTS[row.productKey].category.noWithdrawalRight ? ["PRICE_DIFFERENCE", "END"] : ["RETURN_REQUEST", "REORDER", "END"];
}

/** The return window closed: offers and "Göster" are removed, the history stays readable (modules.md Product Detail rules). */
function returnWindowClosed(row: TrackedItemRow, today: string): boolean {
  return row.mode === "BOUGHT" && Boolean(row.returnDeadline) && (row.returnDeadline as string) < today;
}

// ── Price history ───────────────────────────────────────────────────────────

interface DailySeries {
  /** Cheapest per day in kuruş, oldest first, ending today. */
  readonly values: readonly (number | null)[];
  /** Rank on that day of the seller that was cheapest (index → rank); unset = rank 1. */
  readonly rankThen: Readonly<Record<number, number>>;
}

/** All known days: the drawn 14 days of a seeded row plus the history before tracking; otherwise the list's 14 days. */
function dailySeries(row: TrackedItemRow, listed: TrackedItemDetail["priceHistory"]): DailySeries {
  const seed = seedByKey(row.seedKey);
  const earlier = seed ? EARLIER_HISTORY[seed.key] : undefined;
  if (!seed || !earlier) return { values: listed.cheapest, rankThen: {} };
  return { values: [...earlier.tl, ...seed.cheapestTl].map((value) => (value === null ? null : value * KURUS)), rankThen: earlier.rankThen };
}

/** The last `days` values (null in front where nothing is known). */
function lastDays(values: readonly (number | null)[], days: number): (number | null)[] {
  const tail = values.slice(-days);
  return [...Array.from({ length: days - tail.length }, () => null), ...tail];
}

function rangeDays(values: readonly (number | null)[], range: HistoryRange): number {
  if (range !== "all") return RANGE_DAYS[range];
  const first = values.findIndex((value) => value !== null);
  return first === -1 ? 1 : values.length - first;
}

function hintRule() {
  return { shortDays: SYSTEM_SETTINGS["history.hint_short_days"], longDays: SYSTEM_SETTINGS["history.hint_long_days"], minDataDays: SYSTEM_SETTINGS["history.hint_min_days"] };
}

/** Lowest of the last `days` days, when that window has enough data for a suggestion. */
function lowestOf(values: readonly (number | null)[], days: number): number | null {
  const window = values.slice(-days).filter((value): value is number => value !== null);
  return window.length >= SYSTEM_SETTINGS["history.hint_min_days"] ? Math.min(...window) : null;
}

// ── Detail ──────────────────────────────────────────────────────────────────

function detailOf(controller: MockController, row: TrackedItemRow, context: ViewContext): TrackedItemDetail {
  const item = view(controller, row, context);
  const product = PRODUCTS[row.productKey];
  const platform = row.platform ? PLATFORMS[row.platform] : null;
  const today = toCalendarDay(context.now);
  const active = row.state === "ACTIVE";
  const ticked = controller.state.steps.get(row.id);
  const rule = platform?.returnRule;
  const expectedDelivery = row.orderedOn && rule ? addCalendarDays(row.orderedOn, rule.avgDeliveryDays ?? 0) : null;
  const deliveryPrompt =
    active && row.mode === "BOUGHT" && rule?.startType === "DELIVERY" && row.returnDeadlineStatus === "ESTIMATED" && row.orderStatus !== "DELIVERED" && expectedDelivery !== null && expectedDelivery < today;
  const series = dailySeries(row, item.priceHistory);
  const lowest30 = lowestOf(series.values, SYSTEM_SETTINGS["history.hint_short_days"]);
  const lowest180 = lowestOf(series.values, SYSTEM_SETTINGS["history.hint_long_days"]);
  const request = controller.state.requests.get(row.id);
  const feedback = controller.state.feedback.get(row.id);
  return {
    ...item,
    product: { ...item.product, variantLine: variantLine(product, context.locale) },
    trackingStartedOn: toCalendarDay(new Date(row.createdAt)),
    returnRule: row.mode === "BOUGHT" && rule ? rule : null,
    noWithdrawalRight: product.category.noWithdrawalRight,
    deliveryPrompt,
    steps: stepsOf(row).map((step) => ({ step, done: ticked?.has(step) ?? false })),
    request: request ? { kind: request.kind, since: request.since, outcome: request.outcome } : null,
    targetHints: row.mode === "WANT" ? { lowest30Days: lowest30 === null ? null : money(lowest30), lowest6Months: lowest180 === null ? null : money(lowest180) } : null,
    feedback: feedback ? { priceDifferenceGiven: feedback.priceDifferenceGiven, returnSmooth: feedback.returnSmooth } : null,
    frequentReturns: active && row.mode === "BOUGHT" && row.seedKey ? (FREQUENT_RETURNS[row.seedKey] ?? null) : null,
  };
}

// ── Stock history ───────────────────────────────────────────────────────────

/**
 * Stock per day of one offer since tracking started: the drawn days of the seed for the cheapest
 * offer; otherwise the offer's current state since `stockSinceDaysAgo` and in stock before it.
 */
function stockDays(row: TrackedItemRow, offer: OfferFixture | undefined, rank: number | null, days: number, today: string): (StockState | null)[] {
  const started = toCalendarDay(new Date(row.createdAt));
  const seed = seedByKey(row.seedKey);
  const seeded = rank === 1 && seed ? [...seed.stock].map(stockCodeToState) : null;
  return Array.from({ length: days }, (_, index) => {
    const day = addCalendarDays(today, index - (days - 1));
    if (day < started || !offer) return null;
    const daysAgo = daysBetween(day, today);
    if (seeded && daysAgo < seeded.length) return seeded[seeded.length - 1 - daysAgo] ?? null;
    return daysAgo < offer.stockSinceDaysAgo ? offer.stockState : "IN_STOCK";
  });
}

// ── Handlers ────────────────────────────────────────────────────────────────

type Ctx<N extends Parameters<typeof route>[1]> = RouteContext<N>;

function viewContext(context: Pick<Ctx<"getTrackedItem">, "now" | "locale" | "sourcesMissing">): ViewContext {
  return { now: context.now, locale: context.locale, sourcesMissing: context.sourcesMissing };
}

export function productDetailHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "getTrackedItem", (context) => {
      const { userId } = requireUser(context.actor);
      const { row } = ownRow(controller, userId, context.params.id);
      return { data: detailOf(controller, row, viewContext(context)) };
    }),

    route(controller, "getTrackedItemOffers", ({ params, actor, now, checkedAt, empty, sourcesMissing }) => {
      const { userId } = requireUser(actor);
      const { row } = ownRow(controller, userId, params.id);
      const today = toCalendarDay(now);
      const paid = row.mode === "BOUGHT" ? row.pricePaidMinor : null;
      const all = offersFor(row.productKey);
      // Offers reported by `report.suspend_threshold` different users are left out while reviewed (design States 4).
      const reported = new Set(
        all
          .filter((offer) => new Set(state.reports.filter((report) => report.offerId === offer.id).map((report) => report.userId)).size >= SYSTEM_SETTINGS["report.suspend_threshold"])
          .map((offer) => offer.id),
      );
      const listed = empty || row.state !== "ACTIVE" || returnWindowClosed(row, today) ? [] : paid !== null ? cheaperOffers(row.productKey, paid, row.sellerOfferId) : availableOffers(row);
      const offers: DetailOffer[] = listed
        .filter((offer) => !reported.has(offer.id))
        .map((offer, index) => {
          const rank = index + 1;
          const full = fullOffer({ now, checkedAt }, offer, refFor(state, userId, row.productKey, offer, rank, paid), rank, paid);
          const summary = {
            trust: sellerTrust(SELLERS[offer.seller]),
            installments: offer.installmentsMax ? { maxInterestFree: offer.installmentsMax } : null,
            campaign: offer.campaign ? { kind: offer.campaign.kind, amount: offer.campaign.amountMinor === null ? null : money(offer.campaign.amountMinor) } : null,
          };
          const reveal = latestReveal(controller, userId, offer.id);
          const open = reveal?.action === "REVEAL" && reveal.expiresAt !== null && reveal.expiresAt > now.toISOString();
          return open && reveal.expiresAt
            ? { ...full, revealed: true as const, summary, commissionNote: true, revealExpiresAt: reveal.expiresAt, gateUsed: reveal.gate ?? "FREE_TOGGLE" }
            : { ...full, revealed: false as const, summary };
        });
      const own = ownOffer(row);
      return {
        data: {
          offers,
          own:
            row.mode === "BOUGHT" && own && row.platform
              ? {
                  sellerName: SELLERS[own.seller].name,
                  platformName: PLATFORMS[row.platform].name,
                  price: money(own.priceMinor),
                  shippingCost: own.shippingMinor === null ? null : money(own.shippingMinor),
                  stockState: own.stockState,
                  lastCheckedAt: checkedAt(own.checkedMinutesAgo),
                }
              : null,
          checkedCount: all.length,
          underReview: reported.size,
        },
        ...(sourcesMissing ? { meta: { sourcesMissing: true } } : {}),
      };
    }),

    route(controller, "getPriceHistory", (context) => {
      const { userId } = requireUser(context.actor);
      const { row } = ownRow(controller, userId, context.params.id);
      const item = view(controller, row, viewContext(context));
      const series = dailySeries(row, item.priceHistory);
      const days = rangeDays(series.values, context.query.range);
      const values = lastDays(series.values, days);
      const today = toCalendarDay(context.now);
      const from = addCalendarDays(today, -(days - 1));
      const tiles = historyTiles(values);
      const offset = series.values.length - days;
      const current = item.cheapest?.amount ?? null;
      const hint: BuyOrWaitHint | null = current === null ? null : (() => {
        const found = buyOrWaitHint(series.values, current, row.mode, hintRule());
        return found === null ? null : found.kind === "ABOVE_LOWEST" ? { kind: found.kind, days: found.days, amount: money(found.amount) } : found;
      })();
      const reference = row.mode === "BOUGHT" && row.pricePaidMinor !== null ? { kind: "PAID" as const, price: money(row.pricePaidMinor) } : row.targetPriceMinor ? { kind: "TARGET" as const, price: money(row.targetPriceMinor) } : null;
      return {
        data: {
          range: context.query.range,
          from,
          cheapest: values,
          trackingStartedOn: toCalendarDay(new Date(row.createdAt)),
          reference,
          lowest: tiles ? { day: addCalendarDays(from, tiles.lowestIndex), price: money(tiles.lowest), rankThen: series.rankThen[offset + tiles.lowestIndex] ?? 1 } : null,
          tiles: tiles ? { lowest: money(tiles.lowest), highest: money(tiles.highest), average: money(tiles.average), change: money(tiles.change) } : null,
          dataDays: tiles?.dataDays ?? 0,
          hint,
        },
      };
    }),

    route(controller, "getStockHistory", ({ params, query, actor, now }) => {
      const { userId } = requireUser(actor);
      const { row } = ownRow(controller, userId, params.id);
      const days = STOCK_DAYS[query.range];
      const today = toCalendarDay(now);
      const from = addCalendarDays(today, -(days - 1));
      const active = row.state === "ACTIVE";
      const ranked = !active ? [] : row.mode === "BOUGHT" && row.pricePaidMinor !== null ? cheaperOffers(row.productKey, row.pricePaidMinor, row.sellerOfferId) : availableOffers(row);
      const rows: { subject: StockSubject; days: (StockState | null)[] }[] = ranked
        .slice(0, STOCK_RANKS)
        .map((offer, index) => ({ subject: { kind: "RANK" as const, rank: index + 1 }, days: stockDays(row, offer, index + 1, days, today) }));
      const own = ownOffer(row);
      if (active && row.mode === "BOUGHT" && own) rows.push({ subject: { kind: "OWN" }, days: stockDays(row, own, null, days, today) });
      const changes = rows
        .flatMap(({ subject, days: states }) =>
          states.flatMap((to, index) => {
            const previous = index > 0 ? states[index - 1] : null;
            return to !== null && previous !== null && previous !== undefined && previous !== to ? [{ day: addCalendarDays(from, index), subject, from: previous, to }] : [];
          }),
        )
        .sort((a, b) => b.day.localeCompare(a.day));
      const first = rows[0];
      const last = first?.days.at(-1) ?? null;
      let run = 0;
      for (let index = (first?.days.length ?? 0) - 1; index >= 0 && first?.days[index] === last && last !== null; index -= 1) run += 1;
      return { data: { range: query.range, from, rows, changes, conclusion: first && last ? { subject: first.subject, state: last, atLeastDays: run } : null } };
    }),

    route(controller, "getPriceDifferenceMessage", ({ params, query, actor }) => {
      const { userId } = requireUser(actor);
      const { row } = ownRow(controller, userId, params.id);
      if (row.mode !== "BOUGHT" || row.pricePaidMinor === null || !row.orderedOn) invalid("id");
      const product = PRODUCTS[row.productKey];
      const own = ownOffer(row);
      // To the seller the user bought from (or the store); a hidden seller is never named.
      const recipient = (own ? SELLERS[own.seller].name : row.sellerName) ?? (row.platform ? PLATFORMS[row.platform].name : (row.otherPlatformName ?? null));
      const best = row.state === "ACTIVE" ? cheaperOffers(row.productKey, row.pricePaidMinor, row.sellerOfferId)[0] : undefined;
      const locale = query.locale;
      const major = (minor: number) => formatMoney(minor / KURUS, locale);
      const difference = best ? row.pricePaidMinor - totalMinor(best) : null;
      return {
        data: {
          locale,
          recipient: recipient ?? pick(product.name, locale),
          text:
            best && difference !== null
              ? fill(pick(PRICE_DIFFERENCE_TEXT, locale), {
                  date: formatDate(new Date(`${row.orderedOn}T12:00:00Z`), locale, { dateStyle: "long" }),
                  paid: major(row.pricePaidMinor),
                  product: pick(product.name, locale),
                  now: major(totalMinor(best)),
                  difference: major(difference),
                })
              : null,
          difference: difference === null ? null : money(difference),
        },
      };
    }),

    route(controller, "getProductRatings", ({ params, checkedAt }) => {
      const key = productKeyOf(params.id);
      if (!key) throw new MockApiError("NOT_FOUND");
      // One figure on the shared 5-point scale (core `crossStoreRating`) [ASSUMPTION — to be checked in the data test].
      const rating = crossStoreRating(offersFor(key).flatMap((offer) => (offer.productRating ? [offer.productRating] : [])));
      const read = RATINGS_READ_MINUTES_AGO[key];
      if (!rating || read === undefined) return { data: { average: null, storeCount: 0, few: false, readAt: null } };
      return {
        data: {
          average: { value: rating.value, scale: rating.scale, count: rating.count },
          storeCount: rating.stores,
          few: rating.count < SYSTEM_SETTINGS["ratings.min_count"],
          readAt: checkedAt(read),
        },
      };
    }),

    route(controller, "updateTrackedItem", (context) => {
      const { userId } = requireUser(context.actor);
      const { row, index } = activeRow(controller, userId, context.params.id);
      const { body, now } = context;
      const bought = body.pricePaid !== undefined || body.orderStatus !== undefined || body.returnDeadline !== undefined;
      if (bought && row.mode !== "BOUGHT") invalid("pricePaid");
      if (body.targetPrice !== undefined && row.mode !== "WANT") invalid("targetPrice");
      if (body.pricePaid !== undefined && body.pricePaid.amount <= 0) invalid("pricePaid");
      if (body.targetPrice && body.targetPrice.amount <= 0) invalid("targetPrice");
      if (body.returnDeadline !== undefined && PRODUCTS[row.productKey].category.noWithdrawalRight) invalid("returnDeadline");
      let next: TrackedItemRow = row;
      const changed: string[] = [];
      if (body.pricePaid !== undefined) {
        event(controller, row.id, "PRICE_EDITED", { from: row.pricePaidMinor, to: body.pricePaid.amount }, now);
        next = { ...next, pricePaidMinor: body.pricePaid.amount };
        changed.push("pricePaid");
      }
      if (body.orderStatus !== undefined) {
        event(controller, row.id, "ORDER_STATUS_EDITED", { from: row.orderStatus ?? null, to: body.orderStatus }, now);
        next = { ...next, orderStatus: body.orderStatus };
        changed.push("orderStatus");
      }
      if (body.returnDeadline !== undefined) {
        event(controller, row.id, "DEADLINE_EDITED", { from: row.returnDeadline ?? null, to: body.returnDeadline }, now);
        next = { ...next, returnDeadline: body.returnDeadline, returnDeadlineStatus: "USER_EDITED" };
        changed.push("returnDeadline");
      }
      if (body.targetPrice !== undefined) {
        event(controller, row.id, "TARGET_EDITED", { from: row.targetPriceMinor ?? null, to: body.targetPrice?.amount ?? null }, now);
        next = { ...next, targetPriceMinor: body.targetPrice?.amount ?? null };
        changed.push("targetPrice");
      }
      state.trackedItems[index] = next;
      context.note({ targetType: "tracked_item", targetId: row.id, metadata: { fields: changed } });
      return { data: detailOf(controller, next, viewContext(context)) };
    }),

    route(controller, "answerDelivered", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row, index } = activeRow(controller, userId, params.id);
      const rule = row.platform ? PLATFORMS[row.platform].returnRule : null;
      if (row.mode !== "BOUGHT" || !rule || !row.orderedOn || PRODUCTS[row.productKey].category.noWithdrawalRight) invalid("id");
      const today = toCalendarDay(now);
      if (body.day !== null && (body.day > today || body.day < row.orderedOn)) invalid("day");
      const deliveredOn = body.answer === "TODAY" ? today : body.answer === "OTHER_DAY" ? body.day : null;
      let next = row;
      if (deliveredOn !== null) {
        // The answer fixes the last day (modules.md Return Window › Unknown delivery date).
        const deadline = returnDeadline(row.orderedOn, rule, deliveredOn);
        next = { ...row, orderStatus: "DELIVERED", returnDeadline: deadline.day, returnDeadlineStatus: "CONFIRMED" };
        state.trackedItems[index] = next;
      }
      event(controller, row.id, "DELIVERED", { answer: body.answer, deliveredOn }, now);
      note({ targetType: "tracked_item", targetId: row.id, metadata: { answer: body.answer } });
      return { data: { returnDeadline: next.returnDeadline ?? null, returnDeadlineStatus: next.returnDeadlineStatus ?? null } };
    }),

    route(controller, "tickStep", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row } = activeRow(controller, userId, params.id);
      // "Takibi bitir" is done by ending the tracking, not by a tick.
      if (!stepsOf(row).includes(params.step) || params.step === "END") invalid("step");
      const ticked = state.steps.get(row.id) ?? new Set();
      if (body.done) ticked.add(params.step);
      else ticked.delete(params.step);
      state.steps.set(row.id, ticked);
      event(controller, row.id, body.done ? "STEP_TICKED" : "STEP_UNTICKED", { step: params.step }, now);
      note({ targetType: "tracked_item", targetId: row.id, metadata: { step: params.step, done: body.done } });
      return { data: { steps: stepsOf(row).map((step) => ({ step, done: ticked.has(step) })) } };
    }),

    route(controller, "updateRequest", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row } = activeRow(controller, userId, params.id);
      if (row.mode !== "BOUGHT") invalid("id");
      if (body.kind === null && body.outcome !== null) invalid("outcome");
      const before = state.requests.get(row.id);
      if (body.kind === null) state.requests.delete(row.id);
      else state.requests.set(row.id, { kind: body.kind, since: before && before.kind === body.kind ? before.since : now.toISOString(), outcome: body.outcome });
      event(controller, row.id, "REQUEST_UPDATED", { kind: body.kind, outcome: body.outcome }, now);
      note({ targetType: "tracked_item", targetId: row.id, metadata: { kind: body.kind, outcome: body.outcome } });
      const request = state.requests.get(row.id);
      return { data: { request: request ? { kind: request.kind, since: request.since, outcome: request.outcome } : null } };
    }),

    route(controller, "extendTracking", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row, index } = activeRow(controller, userId, params.id);
      if (row.mode !== "WANT") invalid("id");
      const endsAt = trackingEndsAt(now, body.duration);
      state.trackedItems[index] = { ...row, trackingDuration: body.duration, trackingEndsAt: endsAt };
      event(controller, row.id, "EXTENDED", { duration: body.duration, trackingEndsAt: endsAt }, now);
      note({ targetType: "tracked_item", targetId: row.id, metadata: { duration: body.duration } });
      return { data: { trackingDuration: body.duration, trackingEndsAt: endsAt } };
    }),

    route(controller, "sendFeedback", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row } = ownRow(controller, userId, params.id);
      // Verified buyers only, once tracking has ended; one answer per item (modules.md Ratings › Our buyers' answers).
      if (row.mode !== "BOUGHT" || row.state === "ACTIVE" || state.feedback.has(row.id)) invalid("id");
      const answer = { priceDifferenceGiven: body.priceDifferenceGiven, returnSmooth: body.returnSmooth };
      state.feedback.set(row.id, { ...answer, createdAt: now.toISOString() });
      note({ targetType: "tracked_item", targetId: row.id, metadata: answer });
      return { status: 201, data: { feedback: answer } };
    }),

    route(controller, "createReport", ({ body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const { row } = ownRow(controller, userId, body.trackedItemId);
      const target = body.offerRef ? hiddenRef(controller, userId, body.offerRef) : null;
      if (target && target.productKey !== row.productKey) throw new MockApiError("NOT_FOUND");
      const id = newId();
      state.reports.push({ id, userId, trackedItemId: row.id, offerId: target?.offerId ?? null, kind: body.kind, note: body.note, createdAt: now.toISOString() });
      // Rank only in the log: the offer id is the target, the seller is never written (containsHiddenSeller stays false).
      note({ targetType: target ? "offer" : "tracked_item", targetId: target?.offerId ?? row.id, metadata: { kind: body.kind, rank: target?.rank ?? null, trackedItemId: row.id } });
      return { status: 201, data: { id, status: "RECEIVED" as const } };
    }),

    route(controller, "notifyBackInStock", ({ params, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const target = hiddenRef(controller, userId, params.ref);
      if (!state.stockAlerts.some((alert) => alert.userId === userId && alert.offerId === target.offerId)) {
        state.stockAlerts.push({ userId, offerId: target.offerId, createdAt: now.toISOString() });
      }
      note({ targetType: "offer", targetId: target.offerId, metadata: { rank: target.rank } });
      return { data: { subscribed: true as const } };
    }),

    // "Takvime ekle": an .ics file, outside the JSON envelope; the same session and ownership rules.
    http.get(`*${API_PREFIX}${ENDPOINTS.getCalendar.path}`, ({ request, params }) => {
      const actor = actorFor(controller);
      const error = (code: "UNAUTHENTICATED" | "NOT_FOUND") => HttpResponse.json({ error: errorBody(code) }, { status: ERRORS[code].status });
      if (actor.kind !== "user") return error("UNAUTHENTICATED");
      const row = state.trackedItems.find((item) => item.id === String(params["id"]) && item.userId === actor.userId);
      if (!row || row.mode !== "BOUGHT" || !row.returnDeadline) return error("NOT_FOUND");
      const locale = (localeFromAcceptLanguage(request.headers.get("accept-language"), ["tr", "en"]) as "tr" | "en" | null) ?? "tr";
      const product = pick(PRODUCTS[row.productKey].name, locale);
      const platform = row.platform ? PLATFORMS[row.platform].name : (row.otherPlatformName ?? "");
      const day = row.returnDeadline.replace(/-/g, "");
      const body = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FirsatGeldi//TR", "BEGIN:VEVENT",
        `UID:${row.id}@firsatgeldi`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${day}`,
        `SUMMARY:${fill(pick(CALENDAR_TEXT.summary, locale), { product })}`,
        `DESCRIPTION:${fill(pick(CALENDAR_TEXT.description, locale), { platform })}`,
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "END:VALARM", "END:VEVENT", "END:VCALENDAR",
      ].join("\r\n");
      return new HttpResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="iade-${row.returnDeadline}.ics"` } });
    }),
  ];
}

/** Path of an item's calendar file (for the client and tests). */
export function calendarPath(id: string): string {
  return API_PREFIX + buildPath(ENDPOINTS.getCalendar.path, { id });
}
