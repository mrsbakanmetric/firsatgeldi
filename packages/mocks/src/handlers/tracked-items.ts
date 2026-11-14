// Tracked Items (modules.md Tracked Items, Check Now; architecture.md §16):
// list with filters/sort/search/category and their counts, the four summary
// figures, and the bulk "Görünenleri kontrol et". Cheaper sellers appear only as
// counts and amounts; the route's output schema strips anything else.
import { COMPACT_HISTORY_DAYS, type PriceConclusion, type TrackedItemFilter, type TrackedItemListItem, type TrackedItemSort } from "@firsatgeldi/contracts";
import { addCalendarDays, daysBetween, RETURN_URGENT_DAYS, toCalendarDay } from "@firsatgeldi/core";
import { PRODUCTS } from "../fixtures/catalog";
import { offersFor, PLATFORMS, SELLERS } from "../fixtures/market";
import { pick } from "../fixtures/text";
import { seedByKey, stockCodeToState } from "../fixtures/tracking";
import { MockApiError, route } from "../route";
import { MOCK_SETTINGS, SYSTEM_SETTINGS } from "../settings";
import type { MockController, TrackedItemRow } from "../state";
import { money, totalMinor } from "../views";
import { checksUsedToday, emit, entitlements, fold, requireUser, tokens } from "./shared";
import { cheaperOffers } from "./tracking";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const KURUS = 100;

interface ViewContext {
  readonly now: Date;
  readonly locale: "tr" | "en";
  /** "stale" scenario: rows marked `staleInScenario` were last checked long ago. */
  readonly sourcesMissing: boolean;
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
function availableOffers(item: TrackedItemRow) {
  return offersFor(item.productKey)
    .filter((offer) => offer.stockState !== "OUT_OF_STOCK")
    .sort((a, b) => totalMinor(a) - totalMinor(b));
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

function view(controller: MockController, item: TrackedItemRow, context: ViewContext): TrackedItemListItem {
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
    ...series,
    conclusion: active ? conclusionOf(item, context.now, cheapest) : null,
    lastCheckedAt: checked,
    stale,
    ended: active || !item.endedAt ? null : { at: item.endedAt, reason: item.endReason ?? "USER", savingRecorded: item.savingMinor ? money(item.savingMinor) : null },
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

function daysLeft(item: TrackedItemListItem, today: string): number | null {
  return item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
}

/**
 * Priority = Home priority order (modules.md Home › Hemen Gözat): (1) open deal, nearest
 * return deadline first · (2) return ≤ 3 days · (3) target price reached · (4) most recent change.
 */
function priorityKey(item: TrackedItemListItem, today: string): [number, number, number] {
  const left = daysLeft(item, today) ?? Number.POSITIVE_INFINITY;
  const changed = item.conclusion?.kind === "DROPPED" ? Date.parse(item.conclusion.at) : Date.parse(item.lastCheckedAt ?? "1970-01-01T00:00:00Z");
  if (item.deal && item.mode === "BOUGHT") return [0, left, -changed];
  if (left <= RETURN_URGENT_DAYS) return [1, left, -changed];
  if (item.deal) return [2, left, -changed];
  return [3, 0, -changed];
}

function compare(sort: TrackedItemSort, today: string) {
  return (a: TrackedItemListItem, b: TrackedItemListItem): number => {
    if (sort === "deadline") return (daysLeft(a, today) ?? Number.POSITIVE_INFINITY) - (daysLeft(b, today) ?? Number.POSITIVE_INFINITY);
    if (sort === "saving") return (b.deal?.maxSaving.amount ?? -1) - (a.deal?.maxSaving.amount ?? -1);
    const [x, y] = [priorityKey(a, today), priorityKey(b, today)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  };
}

function userItems(controller: MockController, userId: string, context: ViewContext): TrackedItemListItem[] {
  return controller.state.trackedItems.filter((item) => item.userId === userId).map((item) => view(controller, item, context));
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
      const today = toCalendarDay(now);
      const deals = items.filter((item) => item.deal);
      const soon = items
        .map((item) => item.returnDeadline)
        .filter((day): day is string => day !== null && daysBetween(today, day) >= 0 && daysBetween(today, day) <= RETURN_URGENT_DAYS)
        .sort();
      const checks = items.map((item) => item.lastCheckedAt).filter((at): at is string => at !== null).sort();
      const savingTotal = deals.reduce((sum, item) => sum + (item.deal?.maxSaving.amount ?? 0), 0);
      return {
        data: {
          tracking: { count: items.length, bought: items.filter((item) => item.mode === "BOUGHT").length, want: items.filter((item) => item.mode === "WANT").length },
          deals: { count: deals.length, maxSavingTotal: deals.length ? money(savingTotal) : null },
          returnsSoon: { count: soon.length, nearest: soon[0] ?? null },
          lastCheckedAt: checks.at(-1) ?? null,
        },
        meta: { entitlements: entitlements(controller, actor) },
      };
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
