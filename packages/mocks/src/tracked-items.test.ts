// Tracked Items on the mock API (modules.md Tracked Items, Check Now): the seeded
// rows of design "4 Takip Ettiklerim", filters with counts, sort, search, category,
// the four summary figures and the bulk check with the daily allowance.
import { ApiError, COMPACT_HISTORY_DAYS } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { SELLERS } from "./fixtures/market";
import { MOCK_SETTINGS } from "./settings";
import { createTestApi } from "./test/harness";

const t = createTestApi({ seedTracking: true });
const { api, controller } = t;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.useLocale("tr");
  t.resetClock();
  controller.config = { ...controller.config, scenario: "success" };
});
afterAll(() => t.server.close());

const names = (items: readonly { product: { name: string } }[]) => items.map((item) => item.product.name);

describe("list", () => {
  it("lists the active rows in priority order and the ended row last; counts per filter", async () => {
    const { data, meta } = await api.call("listTrackedItems", {});
    expect(names(data.items)).toEqual([
      PRODUCTS.acePro2FlashPrint.name.tr,
      PRODUCTS.winterCoat.name.tr,
      PRODUCTS.dysonV15.name.tr,
      PRODUCTS.airPodsPro2.name.tr,
      PRODUCTS.wh1000xm5.name.tr,
    ]);
    expect(data.facets.filters).toEqual({ all: 5, bought: 3, want: 1, deal: 2, ended: 1 });
    expect(meta?.total).toBe(5);
    expect(meta?.entitlements?.checkNow).toEqual({ used: 7, limit: 10 });
  });

  it("a deal is counts and amounts only; the own seller and platform are visible", async () => {
    const { data } = await api.call("listTrackedItems", {});
    const [ace] = data.items;
    expect(ace?.deal).toEqual({ cheaperCount: 2, maxSaving: { amount: 300_200, currency: "TRY" } });
    expect(ace?.purchase).toMatchObject({ sellerName: SELLERS.kameraDunyasi.name, platformName: "Hepsiburada" });
    expect(ace?.priceHistory.cheapest).toHaveLength(COMPACT_HISTORY_DAYS);
    expect(ace?.priceHistory.cheapest.at(-1)).toBe(ace?.cheapest?.amount);
    expect(ace?.conclusion?.kind).toBe("DROPPED");
    expect(JSON.stringify(data)).not.toContain(SELLERS.aksiyonMarket.name);
  });

  it("the typed “Diğer” platform shows as typed; the want row keeps its target", async () => {
    const { data } = await api.call("listTrackedItems", {});
    const coat = data.items.find((item) => item.product.id === PRODUCTS.winterCoat.id);
    expect(coat?.purchase?.platformName).toBe("LC Waikiki");
    expect(coat?.returnDeadline).toBeNull();
    const buds = data.items.find((item) => item.product.id === PRODUCTS.airPodsPro2.id);
    expect(buds?.want?.targetPrice?.amount).toBe(750_000);
    expect(buds?.deal).toBeNull();
    expect(buds?.cheapest?.amount).toBe(815_000);
  });

  it("filters, sorts, searches and narrows by category", async () => {
    expect(names((await api.call("listTrackedItems", { query: { filter: "deal" } })).data.items)).toHaveLength(2);
    expect(names((await api.call("listTrackedItems", { query: { filter: "ended" } })).data.items)).toEqual([PRODUCTS.wh1000xm5.name.tr]);
    const byDeadline = (await api.call("listTrackedItems", { query: { sort: "deadline" } })).data.items;
    expect(byDeadline[0]?.product.id).toBe(PRODUCTS.dysonV15.id);
    const bySaving = (await api.call("listTrackedItems", { query: { sort: "saving" } })).data.items;
    expect(bySaving[0]?.product.id).toBe(PRODUCTS.acePro2FlashPrint.id);
    // Search covers the own seller too ("ürün, marka, satıcın"), Turkish casing folded.
    expect(names((await api.call("listTrackedItems", { query: { q: "KAMERA dünyası" } })).data.items)).toEqual([PRODUCTS.acePro2FlashPrint.name.tr]);
    const searched = await api.call("listTrackedItems", { query: { q: "dyson" } });
    expect(searched.data.facets.filters.all).toBe(1);
    const category = PRODUCTS.airPodsPro2.category.id;
    expect(names((await api.call("listTrackedItems", { query: { category } })).data.items)).toEqual([PRODUCTS.airPodsPro2.name.tr]);
  });

  it("answers in English with English names", async () => {
    t.useLocale("en");
    const { data } = await api.call("listTrackedItems", {});
    expect(data.items.map((item) => item.product.category.name)).toContain("Coat");
  });

  it("empty scenario: no rows; stale scenario: the coat row is stale and the list says sources are missing", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    const empty = await api.call("listTrackedItems", {});
    expect(empty.data.items).toEqual([]);
    expect(empty.data.facets.filters.all).toBe(0);
    controller.config = { ...controller.config, scenario: "stale" };
    const stale = await api.call("listTrackedItems", {});
    expect(stale.data.items.filter((item) => item.stale).map((item) => item.product.id)).toEqual([PRODUCTS.winterCoat.id]);
    expect(stale.meta?.sourcesMissing).toBe(true);
  });

  it("a guest gets UNAUTHENTICATED; another user sees only their own list", async () => {
    t.signInAs("guest");
    const error = await api.call("listTrackedItems", {}).then(() => null, (caught: unknown) => caught);
    expect((error as ApiError).body.code).toBe("UNAUTHENTICATED");
    t.signInAs("secondUser");
    expect((await api.call("listTrackedItems", {})).data.items).toEqual([]);
  });
});

describe("summary", () => {
  it("tracked count, open deals with the total maximum saving, returns within three days, last check", async () => {
    const { data, meta } = await api.call("getTrackedItemsSummary", {});
    expect(data.tracking).toEqual({ count: 4, bought: 3, want: 1 });
    expect(data.deals).toEqual({ count: 2, maxSavingTotal: { amount: 330_200, currency: "TRY" } });
    expect(data.returnsSoon.count).toBe(1);
    expect(data.returnsSoon.nearest).toBe("2026-11-16");
    expect(data.lastCheckedAt).toBe(new Date(Date.parse("2026-11-14T09:00:00.000Z") - 4 * 60_000).toISOString());
    expect(meta?.entitlements?.tracking).toEqual({ used: 4, limit: 10 });
  });
});

describe("bulk check", () => {
  it("checks the visible items in priority order up to the allowance; fresh ones use none; each finish is a live update", async () => {
    const before = controller.state.streamLog.length;
    const { data } = await api.call("listTrackedItems", { query: { filter: "bought" } });
    const ids = data.items.map((item) => item.id);
    const [ace, coat, dyson] = data.items;
    // Ace Pro 2 was checked 4 min ago (cache window 5 min): no allowance; 3 left for the other two.
    const result = await api.call("checkNowBulk", { body: { trackedItemIds: ids } });
    expect(result.data.skippedCached).toEqual([ace?.id]);
    expect(result.data.willCheck).toEqual([coat?.id, dyson?.id]);
    expect(result.data.remaining).toBe(1);
    const events = controller.state.streamLog.slice(before).map((entry) => entry.event);
    expect(events).toEqual([
      { type: "check.finished", data: { trackedItemId: coat?.id, checkedAt: expect.any(String) } },
      { type: "check.finished", data: { trackedItemId: dyson?.id, checkedAt: expect.any(String) } },
    ]);
    const row = controller.state.activity.at(-1);
    expect(row).toMatchObject({ action: "check_now_bulk", outcome: "OK", metadata: { requested: 3, willCheck: 2, skippedCached: 1 } });
  });

  it("stops at the allowance and refuses when nothing can be checked", async () => {
    t.advanceClock(MOCK_SETTINGS.checkMs * 10 + 10 * 60_000);
    const { data } = await api.call("listTrackedItems", {});
    const active = data.items.filter((item) => item.state === "ACTIVE").map((item) => item.id);
    const first = await api.call("checkNowBulk", { body: { trackedItemIds: active } });
    expect(first.data.willCheck).toHaveLength(1);
    expect(first.data.remaining).toBe(0);
    t.advanceClock(10 * 60_000);
    // Ace Pro 2 is always "4 dk önce" in the fixture: inside the cache window, so it still comes back without an allowance.
    const cachedOnly = await api.call("checkNowBulk", { body: { trackedItemIds: active } });
    expect(cachedOnly.data).toMatchObject({ willCheck: [], remaining: 0 });
    const others = active.filter((id) => !cachedOnly.data.skippedCached.includes(id));
    const error = await api.call("checkNowBulk", { body: { trackedItemIds: others } }).then(() => null, (caught: unknown) => caught);
    expect((error as ApiError).body.code).toBe("LIMIT_REACHED");
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "check_now_bulk", outcome: "LIMITED" });
  });

  it("another user's or an ended item is not found", async () => {
    const { data } = await api.call("listTrackedItems", { query: { filter: "ended" } });
    const error = await api.call("checkNowBulk", { body: { trackedItemIds: data.items.map((item) => item.id) } }).then(() => null, (caught: unknown) => caught);
    expect((error as ApiError).body.code).toBe("NOT_FOUND");
  });
});
