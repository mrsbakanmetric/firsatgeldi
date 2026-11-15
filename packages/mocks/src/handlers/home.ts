// Home (modules.md Home; pagedesign.md §8.1 design v2; architecture.md §16.1 HomeView):
// built from the same tracked items as Tracked Items, so both screens always agree.
// Hemen Gözat = the first item in Home priority order with up to 3 hidden offers by rank;
// "Takip ettiklerin" = the next `home.tracked_cards`; "Şu an en çok düşenler" = computed
// from our own daily cheapest prices with the documented rule — never a seller, platform,
// listing link or offer ref (the output schema has no such field).
import type { HomeCard, HomeFeatured, TopDrops, TrackedItemListItem } from "@firsatgeldi/contracts";
import { daysBetween, RETURN_REMINDER_DAYS, toCalendarDay, topDropOf } from "@firsatgeldi/core";
import { PRODUCTS } from "../fixtures/catalog";
import { pick } from "../fixtures/text";
import { TOP_DROP_SEEDS, topDropHistory } from "../fixtures/top-drops";
import { route, type RouteContext } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import type { MockController, MockScenario } from "../state";
import { fullOffer, money, refFor } from "../views";
import { entitlements, requireUser } from "./shared";
import { availableOffers, compare, daysLeft, priorityKey, summaryOf, userItems } from "./tracked-items";
import { cheaperOffers } from "./tracking";

const FEATURED_OFFERS = 3;
/** Priority levels that count as urgent: open deal · return ≤ 3 days · target reached (`priorityKey`). */
const URGENT_LEVEL = 2;

/**
 * Hemen Gözat (modules.md Home › B): the first in Home priority order; with no deal at all,
 * the item with the nearest return deadline ("Şu an senin fiyatın en ucuz").
 */
function homeOrder(items: readonly TrackedItemListItem[], today: string): TrackedItemListItem[] {
  const byPriority = [...items].sort(compare("priority", today));
  if (items.some((item) => item.deal)) return byPriority;
  const left = (item: TrackedItemListItem) => daysLeft(item, today) ?? Number.POSITIVE_INFINITY;
  return byPriority.sort((a, b) => left(a) - left(b));
}

function featuredOf(controller: MockController, userId: string, item: TrackedItemListItem, context: Pick<RouteContext<"getHome">, "now" | "checkedAt">): HomeFeatured {
  const { state } = controller;
  const row = state.trackedItems.find((entry) => entry.id === item.id);
  if (!row || item.stale) return { ...item, offers: [], cheaperCount: 0 };
  const paid = row.mode === "BOUGHT" ? row.pricePaidMinor : null;
  const offers = paid !== null ? cheaperOffers(row.productKey, paid, row.sellerOfferId) : availableOffers(row);
  return {
    ...item,
    offers: offers.slice(0, FEATURED_OFFERS).map((offer, index) => {
      const rank = index + 1;
      return fullOffer(context, offer, refFor(state, userId, row.productKey, offer, rank, paid), rank, paid);
    }),
    cheaperCount: paid !== null ? offers.length : (item.deal?.cheaperCount ?? 0),
  };
}

/**
 * "Şu an en çok düşenler" (modules.md Home › D): the user's tracked categories first (own tracked
 * products excluded); fewer than `home.top_drops.count` → the general list; nothing → null.
 */
function topDropsOf(active: readonly TrackedItemListItem[], scenario: MockScenario, context: Pick<RouteContext<"getHome">, "locale" | "checkedAt">): TopDrops | null {
  const count = SYSTEM_SETTINGS["home.top_drops.count"];
  const rule = {
    windowDays: SYSTEM_SETTINGS["home.top_drops.window_days"],
    minDropPct: SYSTEM_SETTINGS["home.top_drops.min_drop_pct"],
    minHistoryDays: SYSTEM_SETTINGS["home.top_drops.min_history_days"],
  };
  const tracked = new Set(active.map((item) => item.product.id));
  const categoryIds = new Set(active.map((item) => item.product.category.id));
  if (scenario === "drops-none") return null;
  const drops = TOP_DROP_SEEDS.map((seed) => {
    const product = PRODUCTS[seed.productKey];
    // Development scenario: nothing dropped in the user's categories.
    const flat = scenario === "drops-general" && categoryIds.has(product.category.id);
    const drop = flat ? null : topDropOf(topDropHistory(seed), seed.nowTl * 100, rule);
    return drop && !tracked.has(product.id) ? { seed, product, drop } : null;
  })
    .filter((entry) => entry !== null)
    .sort((a, b) => b.drop.dropPct - a.drop.dropPct);
  const inCategories = drops.filter((entry) => categoryIds.has(entry.product.category.id));
  const scope = inCategories.length >= count ? "CATEGORIES" : "GENERAL";
  const chosen = (scope === "CATEGORIES" ? inCategories : drops).slice(0, count);
  if (!chosen.length) return null;
  const categories = new Map(chosen.map(({ product }) => [product.category.id, { id: product.category.id, name: pick(product.category.name, context.locale) }]));
  return {
    scope,
    hasTrackedCategories: categoryIds.size > 0,
    categories: [...categories.values()],
    windowDays: rule.windowDays,
    items: chosen.map(({ seed, product, drop }) => ({
      product: { id: product.id, name: pick(product.name, context.locale), imageSha256: product.imageSha256, category: { id: product.category.id, name: pick(product.category.name, context.locale) } },
      averagePrice: money(drop.average),
      currentPrice: money(drop.current),
      dropAmount: money(drop.dropAmount),
      dropPct: drop.dropPct,
      sellerCount: seed.sellerCount,
      stockState: seed.stockState,
      checkedAt: context.checkedAt(seed.checkedMinutesAgo),
    })),
  };
}

export function homeHandlers(controller: MockController) {
  return [
    route(controller, "getHome", ({ actor, now, locale, empty, sourcesMissing, checkedAt }) => {
      const { userId } = requireUser(actor);
      const scenario = controller.config.scenario;
      const all = empty ? [] : userItems(controller, userId, { now, locale, sourcesMissing });
      // Development scenario "no-deal": the items without a deal only.
      const active = all.filter((item) => item.state === "ACTIVE" && (scenario !== "no-deal" || item.deal === null));
      const today = toCalendarDay(now);
      const [first, ...rest] = homeOrder(active, today);
      const featured = first ? featuredOf(controller, userId, first, { now, checkedAt }) : null;
      // Two urgent items (levels 1–3 of the priority order): the second one is the first card, with an emphasised border.
      const level = first ? priorityKey(first, today)[0] : null;
      const emphasisedId = level !== null && level <= URGENT_LEVEL ? rest.find((item) => priorityKey(item, today)[0] === level)?.id : undefined;
      const ordered = emphasisedId ? [...rest.filter((item) => item.id === emphasisedId), ...rest.filter((item) => item.id !== emphasisedId)] : rest;
      const cards: HomeCard[] = ordered.slice(0, SYSTEM_SETTINGS["home.tracked_cards"]).map((item) => ({ ...item, emphasised: item.id === emphasisedId }));
      const soon = active.filter((item) => {
        const left = item.returnDeadline ? daysBetween(today, item.returnDeadline) : null;
        return left !== null && left >= 0 && left <= RETURN_REMINDER_DAYS;
      });
      const paid = active.filter((item) => item.mode === "BOUGHT" && item.purchase).reduce((sum, item) => sum + (item.purchase?.pricePaid.amount ?? 0), 0);
      return {
        data: {
          summary: summaryOf(active, now),
          protectedTotal: paid > 0 ? money(paid) : null,
          featured,
          returnsSoon: { count: soon.length, items: soon.map((item) => ({ id: item.id, name: item.product.name })) },
          cards,
          topDrops: topDropsOf(active, scenario, { locale, checkedAt }),
        },
        meta: { total: active.length, entitlements: entitlements(controller, actor), ...(sourcesMissing && active.some((item) => item.stale) ? { sourcesMissing: true } : {}) },
      };
    }),
  ];
}
