// Tracked Items (modules.md Tracked Items, Check Now; architecture.md §16):
// list with filters/sort/search/category and their counts, the four summary
// figures, and the bulk "Görünenleri kontrol et". Cheaper sellers appear only as
// counts and amounts; the route's output schema strips anything else.
import { COMPACT_HISTORY_DAYS, type PriceConclusion, type TrackedItemFilter, type TrackedItemListItem, type TrackedItemSort, type TrackedItemsSummary } from "@firsatgeldi/contracts";
import { addCalendarDays, daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { PRODUCTS } from "../fixtures/catalog";
import { type OfferFixture, offersFor, PLATFORMS, SELLERS } from "../fixtures/market";
import { pick } from "../fixtures/text";
import { seedByKey, stockCodeToState } from "../fixtures/tracking";
import { MockApiError, route } from "../route";
import { MOCK_SETTINGS, SYSTEM_SETTINGS } from "../settings";
import type { Actor, MockController, TrackedItemRow } from "../state";
import { money, totalMinor } from "../views";
import { newId } from "../ids";
import { activeTrackingCount, checksUsedToday, emit, entitlements, fold, requireUser, tokens } from "./shared";
import { boughtDetails, cheaperOffers, rankedForWant } from "./tracking";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const KURUS = 100;

export interface ViewContext {
  readonly now: Date;
  readonly locale: "tr" | "en";
  /** "stale" scenario: rows marked `staleInScenario` were last checked long ago. */
  readonly sourcesMissing: boolean;
}

const MS_PER_DAY = 86_400_000;
/** At most three ranked offers per row (pagedesign.md §8.4 Row v4); more → "+N satıcı daha". */
const RANKED_ROWS = 3;

function ownOfferFor(item: TrackedItemRow): OfferFixture | undefined {
  return item.sellerOfferId ? offersFor(item.productKey).find((offer) => offer.id === item.sellerOfferId) : undefined;
}

/** "Geri al" works for `tracking.restore_days` after ending; null once that has passed. */
function restorableUntil(endedAt: string, now: Date): string | null {
  const until = Date.parse(endedAt) + SYSTEM_SETTINGS["tracking.restore_days"] * MS_PER_DAY;
  return now.getTime() < until ? new Date(until).toISOString() : null;
}

function lastCheckedAt(controller: MockController, item: TrackedItemRow, context: ViewContext): string | null {
  const done = controller.state.lastChecks.get(item.id);
  if (done) return done;
  const seed = seedByKey(item.seedKey);
  if (!seed) return item.createdAt;
  const staleShift = context.sourcesMissing && seed.staleInScenario ? SYSTEM_SETTINGS["tracking.stale_hours"] * MOCK_SETTINGS.staleFactor * MS_PER_HOUR : 0;
  return new Date(context.now.getTime() - seed.checkedMinutesAgo * MS_PER_MINUTE - staleShift).toISOString();
}

/** In-stock offers, cheapest total first. */
export function availableOffers(item: TrackedItemRow) {
  return rankedForWant(item.productKey);
}

function dealOf(item: TrackedItemRow): { cheaperCount: number; maxSaving: number } | null {
  if (item.state !== "ACTIVE") return null;
  if (item.mode === "BOUGHT" && item.pricePaidMinor !== null) {
    const cheaper = cheaperOffers(item.productKey, item.pricePaidMinor, item.sellerOfferId);
    const best = cheaper[0];
    return best ? { cheaperCount: cheaper.length, maxSaving: item.pricePaidMinor - totalMinor(best) } : null;
  }
  const target = item.targetPriceMinor ?? null;
  if (target === null) return null;
  const below = availableOffers(item).filter((offer) => totalMinor(offer) <= target);
  const best = below[0];
  return best ? { cheaperCount: below.length, maxSaving: target - totalMinor(best) } : null;
}

/** Days before tracking started have no data; a row added today has only today's value (nothing is guessed). */
function history(item: TrackedItemRow, now: Date, cheapest: number | null, ownStock: TrackedItemListItem["stockHistory"]["days"][number]) {
  const today = toCalendarDay(now);
  const from = addCalendarDays(today, -(COMPACT_HISTORY_DAYS - 1));
  const seed = seedByKey(item.seedKey);
  if (seed) {
    return {
      priceHistory: { from, cheapest: seed.cheapestTl.map((value) => (value === null ? null : value * KURUS)) },
      stockHistory: { subject: seed.stockSubject, days: [...seed.stock].map(stockCodeToState) },
    };
  }
  const started = toCalendarDay(new Date(item.createdAt));
  const days = Array.from({ length: COMPACT_HISTORY_DAYS }, (_, index) => addCalendarDays(from, index));
  return {
    priceHistory: { from, cheapest: days.map((day) => (day >= started ? cheapest : null)) },
    stockHistory: { subject: "CHEAPEST" as const, days: days.map((day) => (day >= started ? ownStock : null)) },
  };
}

function conclusionOf(item: TrackedItemRow, now: Date, cheapest: number | null): PriceConclusion | null {
  const seed = seedByKey(item.seedKey);
  if (!seed?.conclusion || cheapest === null) return null;
  if (seed.conclusion.kind === "DROPPED") return { kind: "DROPPED", at: new Date(now.getTime() - seed.conclusion.minutesAgo * MS_PER_MINUTE).toISOString(), price: money(cheapest) };
  if (seed.conclusion.kind === "NO_CHEAPER") return { kind: "NO_CHEAPER", days: COMPACT_HISTORY_DAYS };
  return { kind: "LOWEST_IN_DAYS", days: seed.conclusion.days, price: money(cheapest) };
}

export function view(controller: MockController, item: TrackedItemRow, context: ViewContext): TrackedItemListItem {
  const product = PRODUCTS[item.productKey];
  const active = item.state === "ACTIVE";
  const offers = availableOffers(item);
  const cheapestOffer = offers[0];
  const cheapest = active && cheapestOffer ? totalMinor(cheapestOffer) : null;
  const deal = dealOf(item);
  const checked = lastCheckedAt(controller, item, context);
  const stale = active && checked !== null && context.now.getTime() - Date.parse(checked) >= SYSTEM_SETTINGS["tracking.stale_hours"] * MS_PER_HOUR;
  const ownOffer = item.sellerOfferId ? offersFor(item.productKey).find((offer) => offer.id === item.sellerOfferId) : undefined;
  const platformName = item.platform ? PLATFORMS[item.platform].name : (item.otherPlatformName ?? null);
  const sellerName = ownOffer ? SELLERS[ownOffer.seller].name : (item.sellerName ?? null);
  // Row prices v4: offers by rank only; the user's own listing now.
  const rankedOffers = !active ? [] : item.mode === "BOUGHT" && item.pricePaidMinor !== null ? cheaperOffers(item.productKey, item.pricePaidMinor, item.sellerOfferId) : offers;
  const ranked = rankedOffers.slice(0, RANKED_ROWS).map((offer, index) => ({ rank: index + 1, price: money(totalMinor(offer)), stockState: offer.stockState }));
  const ownNow = active && item.mode === "BOUGHT" && ownOfferFor(item) ? { price: money(totalMinor(ownOfferFor(item) as OfferFixture)), stockState: (ownOfferFor(item) as OfferFixture).stockState } : null;
  const series = history(item, context.now, cheapest, (deal ? cheapestOffer : ownOffer ?? cheapestOffer)?.stockState ?? null);
  return {
    id: item.id,
    mode: item.mode,
    state: item.state,
    product: { id: product.id, name: pick(product.name, context.locale), imageSha256: product.imageSha256, category: { id: product.category.id, name: pick(product.category.name, context.locale) } },
    purchase:
      item.mode === "BOUGHT" && item.pricePaidMinor !== null && platformName && item.orderedOn && item.orderStatus
        ? { pricePaid: money(item.pricePaidMinor), platformName, sellerName, orderedOn: item.orderedOn, orderStatus: item.orderStatus }
        : null,
    want: item.mode === "WANT" ? { targetPrice: item.targetPriceMinor ? money(item.targetPriceMinor) : null, trackingDuration: item.trackingDuration ?? "UNLIMITED", trackingEndsAt: item.trackingEndsAt ?? null } : null,
    returnDeadline: active ? (item.returnDeadline ?? null) : null,
    returnDeadlineStatus: active ? (item.returnDeadlineStatus ?? null) : null,
    cheapest: cheapest === null ? null : money(cheapest),
    deal: deal ? { cheaperCount: deal.cheaperCount, maxSaving: money(deal.maxSaving) } : null,
    ranked,
    rankedMore: Math.max(0, rankedOffers.length - RANKED_ROWS),
    ownNow,
    ...series,
    conclusion: active ? conclusionOf(item, context.now, cheapest) : null,
    lastCheckedAt: checked,
    stale,
    ended: active || !item.endedAt ? null : { at: item.endedAt, reason: item.endReason ?? "USER", savingRecorded: item.savingMinor ? money(item.savingMinor) : null, restorableUntil: restorableUntil(item.endedAt, context.now) },
  };
}

function matchesFilter(item: TrackedItemListItem, filter: TrackedItemFilter): boolean {
  if (filter === "ended") return item.state !== "ACTIVE";
  if (filter === "all") return true;
  if (item.state !== "ACTIVE") return false;
  if (filter === "bought") return item.mode === "BOUGHT";
  if (filter === "want") return item.mode === "WANT";
  return item.deal !== null;
}

/** "Takip listende ara: ürün, marka, satıcın" — product, category, own seller and platform. */
function matchesQuery(item: TrackedItemListItem, query: string | undefined): boolean {
  const words = query ? tokens(query) : [];
  if (!words.length) return true;
  const haystack = fold([item.product.name, item.product.category.name, item.purchase?.sellerName ?? "", item.purchase?.platformName ?? ""].join(" "));
  return words.every((word) => haystack.includes(word));
}

export function daysLeft(item: TrackedItemListItem, today: string): number | null {
  return item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
}

/**
 * Priority = Home priority order (modules.md Home › Hemen Gözat): (1) open deal, nearest
 * return deadline first · (2) return ≤ 3 days · (3) target price reached · (4) most recent change.
 */
export function priorityKey(item: TrackedItemListItem, today: string): [number, number, number] {
  const left = daysLeft(item, today) ?? Number.POSITIVE_INFINITY;
  const changed = item.conclusion?.kind === "DROPPED" ? Date.parse(item.conclusion.at) : Date.parse(item.lastCheckedAt ?? "1970-01-01T00:00:00Z");
  if (item.deal && item.mode === "BOUGHT") return [0, left, -changed];
  if (left <= RETURN_URGENT_DAYS) return [1, left, -changed];
  if (item.deal) return [2, left, -changed];
  return [3, 0, -changed];
}

export function compare(sort: TrackedItemSort, today: string) {
  return (a: TrackedItemListItem, b: TrackedItemListItem): number => {
    if (sort === "deadline") return (daysLeft(a, today) ?? Number.POSITIVE_INFINITY) - (daysLeft(b, today) ?? Number.POSITIVE_INFINITY);
    if (sort === "saving") return (b.deal?.maxSaving.amount ?? -1) - (a.deal?.maxSaving.amount ?? -1);
    const [x, y] = [priorityKey(a, today), priorityKey(b, today)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  };
}

export function userItems(controller: MockController, userId: string, context: ViewContext): TrackedItemListItem[] {
  return controller.state.trackedItems.filter((item) => item.userId === userId).map((item) => view(controller, item, context));
}

/** The four figures of Tracked Items (also Home's summary line) from the active items. */
export function summaryOf(items: readonly TrackedItemListItem[], now: Date): TrackedItemsSummary {
  const today = toCalendarDay(now);
  const deals = items.filter((item) => item.deal);
  const soon = items
    .map((item) => item.returnDeadline)
    .filter((day): day is string => day !== null && daysBetween(today, day) >= 0 && daysBetween(today, day) <= RETURN_URGENT_DAYS)
    .sort();
  const checks = items.map((item) => item.lastCheckedAt).filter((at): at is string => at !== null).sort();
  const savingTotal = deals.reduce((sum, item) => sum + (item.deal?.maxSaving.amount ?? 0), 0);
  return {
    tracking: { count: items.length, bought: items.filter((item) => item.mode === "BOUGHT").length, want: items.filter((item) => item.mode === "WANT").length },
    deals: { count: deals.length, maxSavingTotal: deals.length ? money(savingTotal) : null },
    returnsSoon: { count: soon.length, nearest: soon[0] ?? null },
    lastCheckedAt: checks.at(-1) ?? null,
  };
}

/**
 * One Check Now on one item (modules.md Check Now): checked within `check_now.cache_minutes`
 * → CACHED, no allowance used; otherwise one allowance, and `check.finished` when done.
 * Both write a `check_now_usage` row; nothing left → LIMIT_REACHED.
 */
export function checkOne(controller: MockController, actor: Actor, userId: string, row: TrackedItemRow, item: TrackedItemListItem, now: Date): { status: "CHECKING" | "CACHED"; remaining: number | null } {
  const { state } = controller;
  const limit = entitlements(controller, actor).checkNow.limit;
  const remaining = limit === null ? null : Math.max(0, limit - checksUsedToday(controller, userId));
  const fresh = item.lastCheckedAt !== null && now.getTime() - Date.parse(item.lastCheckedAt) < SYSTEM_SETTINGS["check_now.cache_minutes"] * MS_PER_MINUTE;
  if (fresh) {
    state.checkNowUsage.push({ userId, trackedItemId: row.id, consumed: false, createdAt: now.toISOString() });
    return { status: "CACHED", remaining };
  }
  if (remaining === 0) throw new MockApiError("LIMIT_REACHED", { params: { limit: limit ?? 0 } });
  state.checkNowUsage.push({ userId, trackedItemId: row.id, consumed: true, createdAt: now.toISOString() });
  controller.schedule(() => {
    const checkedAt = controller.now().toISOString();
    state.lastChecks.set(row.id, checkedAt);
    emit(controller, actor, { type: "check.finished", data: { trackedItemId: row.id, checkedAt } });
  }, MOCK_SETTINGS.checkMs);
  return { status: "CHECKING", remaining: remaining === null ? null : remaining - 1 };
}

const FILTERS: readonly TrackedItemFilter[] = ["all", "bought", "want", "deal", "ended"];

export function trackedItemHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "listTrackedItems", ({ query, actor, now, locale, empty, sourcesMissing }) => {
      const { userId } = requireUser(actor);
      const all = empty ? [] : userItems(controller, userId, { now, locale, sourcesMissing });
      const filter = query.filter ?? "all";
      const today = toCalendarDay(now);
      const searched = all.filter((item) => matchesQuery(item, query.q));
      const inCategory = searched.filter((item) => !query.category || item.product.category.id === query.category);
      const filtered = inCategory.filter((item) => matchesFilter(item, filter));
      // Ended tracking sits below the active items whatever the sort (modules.md Tracked Items › Ended items).
      const active = filtered.filter((item) => item.state === "ACTIVE").sort(compare(query.sort ?? "priority", today));
      const ended = filtered.filter((item) => item.state !== "ACTIVE").sort((a, b) => Date.parse(b.ended?.at ?? "") - Date.parse(a.ended?.at ?? ""));
      const categories = new Map<string, { id: string; name: string; count: number }>();
      for (const item of searched.filter((entry) => matchesFilter(entry, filter))) {
        const entry = categories.get(item.product.category.id) ?? { ...item.product.category, count: 0 };
        categories.set(entry.id, { ...entry, count: entry.count + 1 });
      }
      const items = [...active, ...ended];
      return {
        data: {
          items,
          facets: {
            filters: Object.fromEntries(FILTERS.map((name) => [name, inCategory.filter((item) => matchesFilter(item, name)).length])) as Record<TrackedItemFilter, number>,
            categories: [...categories.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale)),
          },
        },
        meta: { total: items.length, entitlements: entitlements(controller, actor), ...(sourcesMissing && items.some((item) => item.stale) ? { sourcesMissing: true } : {}) },
      };
    }),

    route(controller, "getTrackedItemsSummary", ({ actor, now, locale, empty, sourcesMissing }) => {
      const { userId } = requireUser(actor);
      const items = (empty ? [] : userItems(controller, userId, { now, locale, sourcesMissing })).filter((item) => item.state === "ACTIVE");
      return { data: summaryOf(items, now), meta: { entitlements: entitlements(controller, actor) } };
    }),

    route(controller, "endTracking", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const index = state.trackedItems.findIndex((item) => item.id === params.id && item.userId === userId);
      const row = state.trackedItems[index];
      if (!row) throw new MockApiError("NOT_FOUND");
      if (row.state !== "ACTIVE") throw new MockApiError("VALIDATION", { fields: { id: "errors.validation" } });
      // Want-to-buy items end on one confirm: no method, no price.
      if (row.mode === "WANT" && (body.method !== null || body.reboughtPrice !== null)) throw new MockApiError("VALIDATION", { fields: { method: "errors.validation" } });
      const endedAt = now.toISOString();
      const paid = row.pricePaidMinor;
      const rebought = body.reboughtPrice?.amount ?? null;
      // A saving only when the user says how it ended and the new price is lower (database.md §8 savings_records).
      const saving = row.mode === "BOUGHT" && body.method && paid !== null && rebought !== null && rebought < paid ? paid - rebought : null;
      if (saving !== null && body.method && paid !== null && rebought !== null) {
        state.savingsRecords.push({
          id: newId(), userId, trackedItemId: row.id, method: body.method, pricePaidMinor: paid, priceReboughtMinor: rebought, savingMinor: saving, recordedAt: endedAt, voidedAt: null,
        });
      }
      state.trackedItems[index] = { ...row, state: "ENDED", endedAt, endReason: "USER", savingMinor: saving };
      state.trackedItemEvents.push({ id: newId(), trackedItemId: row.id, type: "ENDED", actor: "USER", createdAt: endedAt, data: { method: body.method, saving } });
      note({ targetType: "tracked_item", targetId: row.id, metadata: { mode: row.mode, method: body.method, saving } });
      return { data: { id: row.id, state: "ENDED", endedAt, saving: saving === null ? null : money(saving), restorableUntil: restorableUntil(endedAt, now) ?? endedAt } };
    }),

    route(controller, "markBought", ({ params, body, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const index = state.trackedItems.findIndex((item) => item.id === params.id && item.userId === userId);
      const row = state.trackedItems[index];
      if (!row) throw new MockApiError("NOT_FOUND");
      if (row.state !== "ACTIVE" || row.mode !== "WANT") throw new MockApiError("VALIDATION", { fields: { id: "errors.validation" } });
      if (state.trackedItems.some((item) => item.userId === userId && item.productKey === row.productKey && item.mode === "BOUGHT" && item.state === "ACTIVE")) {
        throw new MockApiError("ALREADY_TRACKING");
      }
      const bought = boughtDetails(controller, userId, row.productKey, body);
      const product = PRODUCTS[row.productKey];
      // The same row becomes a bought row: target removed, return protection starts; history continues (v4 mode switch).
      state.trackedItems[index] = {
        ...row, mode: "BOUGHT", platform: bought.platformKey, otherPlatformName: bought.otherPlatformName, sellerOfferId: bought.sellerOfferId,
        sellerName: body.sellerName ?? null, pricePaidMinor: body.pricePaid.amount, orderedOn: body.orderedOn, orderStatus: body.orderStatus,
        returnDeadline: bought.deadline?.day ?? null, returnDeadlineStatus: bought.deadline?.status ?? null,
        targetPriceMinor: null, trackingDuration: null, trackingEndsAt: null,
      };
      state.trackedItemEvents.push({ id: newId(), trackedItemId: row.id, type: "BOUGHT", actor: "USER", createdAt: now.toISOString(), data: { from: "WANT", pricePaid: body.pricePaid.amount } });
      note({ targetType: "tracked_item", targetId: row.id, metadata: { productId: product.id, ...(bought.otherPlatformName ? { otherPlatform: true } : {}) } });
      return {
        data: {
          id: row.id, productId: product.id, mode: "BOUGHT", state: "ACTIVE",
          returnDeadline: bought.deadline?.day ?? null, returnDeadlineStatus: bought.deadline?.status ?? null,
          noWithdrawalRight: product.category.noWithdrawalRight, trackingEndsAt: null, createdAt: row.createdAt,
        },
      };
    }),

    route(controller, "restoreTracking", ({ params, actor, now, note }) => {
      const { userId } = requireUser(actor);
      const index = state.trackedItems.findIndex((item) => item.id === params.id && item.userId === userId);
      const row = state.trackedItems[index];
      if (!row) throw new MockApiError("NOT_FOUND");
      if (row.state === "ACTIVE" || !row.endedAt || restorableUntil(row.endedAt, now) === null) throw new MockApiError("VALIDATION", { fields: { id: "errors.validation" } });
      if (state.trackedItems.some((item) => item.userId === userId && item.productKey === row.productKey && item.mode === row.mode && item.state === "ACTIVE")) {
        throw new MockApiError("ALREADY_TRACKING");
      }
      const limit = entitlements(controller, actor).tracking.limit;
      if (limit !== null && activeTrackingCount(controller, userId) >= limit) throw new MockApiError("LIMIT_REACHED", { params: { limit } });
      // The saving recorded at the end is voided (not deleted): My Savings totals skip it.
      for (const record of state.savingsRecords) if (record.trackedItemId === row.id && record.voidedAt === null) record.voidedAt = now.toISOString();
      state.trackedItems[index] = { ...row, state: "ACTIVE", endedAt: null, endReason: null, savingMinor: null };
      state.trackedItemEvents.push({ id: newId(), trackedItemId: row.id, type: "RESTORED", actor: "USER", createdAt: now.toISOString(), data: {} });
      note({ targetType: "tracked_item", targetId: row.id, metadata: { mode: row.mode } });
      return { data: { id: row.id, state: "ACTIVE" } };
    }),

    route(controller, "checkNow", ({ params, actor, now, locale, note }) => {
      const { userId } = requireUser(actor);
      const row = state.trackedItems.find((item) => item.id === params.id && item.userId === userId);
      // Another user's item does not exist for this user (RLS); ended items are not checked.
      if (!row || row.state !== "ACTIVE") throw new MockApiError("NOT_FOUND");
      const result = checkOne(controller, actor, userId, row, view(controller, row, { now, locale, sourcesMissing: false }), now);
      note({ targetType: "tracked_item", targetId: row.id, metadata: { cached: result.status === "CACHED" } });
      return { data: result };
    }),

    route(controller, "checkNowBulk", ({ body, actor, now, locale, note }) => {
      const { userId } = requireUser(actor);
      const context = { now, locale, sourcesMissing: false };
      const rows = body.trackedItemIds.map((id) => state.trackedItems.find((item) => item.id === id && item.userId === userId));
      // Another user's item does not exist for this user (RLS); ended items are not checked.
      if (rows.some((row) => !row || row.state !== "ACTIVE")) throw new MockApiError("NOT_FOUND");
      const today = toCalendarDay(now);
      const ordered = (rows as TrackedItemRow[]).map((row) => ({ row, item: view(controller, row, context) })).sort((a, b) => compare("priority", today)(a.item, b.item));
      const limit = entitlements(controller, actor).checkNow.limit;
      let remaining = limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - checksUsedToday(controller, userId));
      const willCheck: string[] = [];
      const skippedCached: string[] = [];
      const cacheMs = SYSTEM_SETTINGS["check_now.cache_minutes"] * MS_PER_MINUTE;
      for (const { row, item } of ordered) {
        const fresh = item.lastCheckedAt !== null && now.getTime() - Date.parse(item.lastCheckedAt) < cacheMs;
        if (fresh) {
          skippedCached.push(row.id);
          state.checkNowUsage.push({ userId, trackedItemId: row.id, consumed: false, createdAt: now.toISOString() });
        } else if (remaining > 0) {
          remaining -= 1;
          willCheck.push(row.id);
          state.checkNowUsage.push({ userId, trackedItemId: row.id, consumed: true, createdAt: now.toISOString() });
        }
      }
      note({ metadata: { requested: rows.length, willCheck: willCheck.length, skippedCached: skippedCached.length } });
      if (!willCheck.length && !skippedCached.length) throw new MockApiError("LIMIT_REACHED", { params: { limit: limit ?? 0 } });
      // Each check finishes on its own; the screen hears it through `check.finished`.
      willCheck.forEach((id, index) =>
        controller.schedule(() => {
          const checkedAt = controller.now().toISOString();
          state.lastChecks.set(id, checkedAt);
          emit(controller, actor, { type: "check.finished", data: { trackedItemId: id, checkedAt } });
        }, MOCK_SETTINGS.checkMs * (index + 1)),
      );
      return { data: { willCheck, skippedCached, remaining: Number.isFinite(remaining) ? remaining : null } };
    }),
  ];
}
