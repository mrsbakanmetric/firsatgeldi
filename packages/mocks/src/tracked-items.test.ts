// Tracked Items on the mock API (modules.md Tracked Items, Check Now): the seeded
// rows of design "4 Takip Ettiklerim", filters with counts, sort, search, category,
// the four summary figures and the bulk check with the daily allowance.
import { ApiError, COMPACT_HISTORY_DAYS } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { PLATFORMS, SELLERS } from "./fixtures/market";
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
      PRODUCTS.osmoPocket3.name.tr,
      PRODUCTS.x4.name.tr,
      PRODUCTS.airPodsPro2.name.tr,
      PRODUCTS.wh1000xm5.name.tr,
    ]);
    expect(data.facets.filters).toEqual({ all: 7, bought: 4, want: 2, deal: 3, ended: 1 });
    expect(meta?.total).toBe(7);
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
    expect(names((await api.call("listTrackedItems", { query: { filter: "deal" } })).data.items)).toHaveLength(3);
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
    expect(data.tracking).toEqual({ count: 6, bought: 4, want: 2 });
    // Osmo Pocket 3 reached its 17.000 TL target at 16.499 TL: 501 TL below it.
    expect(data.deals).toEqual({ count: 3, maxSavingTotal: { amount: 380_300, currency: "TRY" } });
    expect(data.returnsSoon.count).toBe(1);
    expect(data.returnsSoon.nearest).toBe("2026-11-16");
    expect(data.lastCheckedAt).toBe(new Date(Date.parse("2026-11-14T09:00:00.000Z") - 4 * 60_000).toISOString());
    expect(meta?.entitlements?.tracking).toEqual({ used: 6, limit: 10 });
  });
});

describe("bulk check", () => {
  it("checks the visible items in priority order up to the allowance; fresh ones use none; each finish is a live update", async () => {
    const before = controller.state.streamLog.length;
    const { data } = await api.call("listTrackedItems", { query: { filter: "bought" } });
    const ids = data.items.map((item) => item.id);
    const [ace, coat, dyson] = data.items;
    // Ace Pro 2 was checked 4 min ago (cache window 5 min): no allowance; 3 left for coat and Dyson (2 of the 3).
    const result = await api.call("checkNowBulk", { body: { trackedItemIds: ids.slice(0, 3) } });
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
    void ids;
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

describe("end tracking from the list and “Geri al” (design v3)", () => {
  const find = async (key: keyof typeof PRODUCTS) => (await api.call("listTrackedItems", {})).data.items.find((item) => item.product.id === PRODUCTS[key].id);

  it("bought: “İade ettim” with a lower new price records the saving; the row moves to ended with “Geri al”; logged", async () => {
    const ace = await find("acePro2FlashPrint");
    const result = await api.call("endTracking", { params: { id: ace?.id ?? "" }, body: { method: "RETURN_REBUY", reboughtPrice: { amount: 2_599_700, currency: "TRY" } } });
    expect(result.data).toMatchObject({ state: "ENDED", saving: { amount: 300_200, currency: "TRY" } });
    expect(controller.state.savingsRecords.at(-1)).toMatchObject({ method: "RETURN_REBUY", savingMinor: 300_200, voidedAt: null });
    expect(controller.state.trackedItemEvents.at(-1)).toMatchObject({ type: "ENDED", actor: "USER" });
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.end", outcome: "OK", targetId: ace?.id });
    const ended = (await api.call("listTrackedItems", { query: { filter: "ended" } })).data.items.find((item) => item.id === ace?.id);
    expect(ended?.ended?.restorableUntil).not.toBeNull();

    await api.call("restoreTracking", { params: { id: ace?.id ?? "" } });
    expect((await find("acePro2FlashPrint"))?.state).toBe("ACTIVE");
    expect(controller.state.savingsRecords.at(-1)?.voidedAt).not.toBeNull();
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.restore", outcome: "OK" });
  });

  it("“Vazgeçtim” ends without a saving; a want-to-buy item ends on one confirm and refuses a method", async () => {
    const dyson = await find("dysonV15");
    const ended = await api.call("endTracking", { params: { id: dyson?.id ?? "" }, body: { method: null, reboughtPrice: null } });
    expect(ended.data.saving).toBeNull();
    const buds = await find("airPodsPro2");
    const refused = await api.call("endTracking", { params: { id: buds?.id ?? "" }, body: { method: "PRICE_DIFFERENCE", reboughtPrice: null } }).then(() => null, (caught: unknown) => caught);
    expect((refused as ApiError).body.code).toBe("VALIDATION");
    expect((await api.call("endTracking", { params: { id: buds?.id ?? "" }, body: { method: null, reboughtPrice: null } })).data.state).toBe("ENDED");
  });

  it("“Geri al” only within 7 days; another user cannot end someone else's item", async () => {
    const old = (await api.call("listTrackedItems", { query: { filter: "ended" } })).data.items.find((item) => item.product.id === PRODUCTS.wh1000xm5.id);
    expect(old?.ended?.restorableUntil).toBeNull();
    const late = await api.call("restoreTracking", { params: { id: old?.id ?? "" } }).then(() => null, (caught: unknown) => caught);
    expect((late as ApiError).body.code).toBe("VALIDATION");
    const coat = await find("winterCoat");
    t.signInAs("secondUser");
    const foreign = await api.call("endTracking", { params: { id: coat?.id ?? "" }, body: { method: null, reboughtPrice: null } }).then(() => null, (caught: unknown) => caught);
    expect((foreign as ApiError).body.code).toBe("NOT_FOUND");
  });
});

describe("row prices v4 and the mode switch", () => {
  const find = async (key: keyof typeof PRODUCTS) => (await api.call("listTrackedItems", {})).data.items.find((item) => item.product.id === PRODUCTS[key].id);

  it("cheaper offers by rank only (at most 3, then a count); the own listing now; no identity", async () => {
    const coat = await find("winterCoat");
    expect(coat?.ranked.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(coat?.ranked[0]?.price.amount).toBe(299_900);
    expect(coat?.rankedMore).toBe(2);
    expect(Object.keys(coat?.ranked[0] ?? {}).sort()).toEqual(["price", "rank", "stockState"]);
    // (Dyson was ended by an earlier test in this file; X4's own listing is sold out.)
    const x4 = await find("x4");
    expect(x4?.ranked).toEqual([]);
    expect(x4?.ownNow).toEqual({ price: { amount: 2_499_900, currency: "TRY" }, stockState: "OUT_OF_STOCK" });
    // Want to buy: the cheapest offers by rank; no own listing.
    const osmo = await find("osmoPocket3");
    expect(osmo?.ranked.map((row) => row.price.amount)).toEqual([1_649_900, 1_729_900]);
    expect(osmo?.ownNow).toBeNull();
    const text = JSON.stringify((await api.call("listTrackedItems", {})).data);
    for (const seller of ["Moda Deposu", "Ses Dünyası", "Ev Teknik", "Görüntü Market", "Kulaklık Pazarı", "Aksiyon Market", "Lens Deposu"]) expect(text).not.toContain(seller);
  });

  it("“Aldım, kaydet” turns a want-to-buy row into a bought row (target removed, return day set); logged", async () => {
    const osmo = await find("osmoPocket3");
    const result = await api.call("markBought", {
      params: { id: osmo?.id ?? "" },
      body: { platformId: PLATFORMS.HEPSIBURADA.id, sellerRef: null, pricePaid: { amount: 1_649_900, currency: "TRY" }, pricePaidSource: "USER_TYPED", orderedOn: "2026-11-14", orderStatus: "ORDERED", returnDeadline: null },
    });
    expect(result.data).toMatchObject({ id: osmo?.id, mode: "BOUGHT", returnDeadlineStatus: "ESTIMATED" });
    const after = await find("osmoPocket3");
    expect(after).toMatchObject({ mode: "BOUGHT", want: null, purchase: { platformName: "Hepsiburada", pricePaid: { amount: 1_649_900 } } });
    expect(after?.returnDeadline).not.toBeNull();
    expect(controller.state.trackedItemEvents.at(-1)).toMatchObject({ type: "BOUGHT", trackedItemId: osmo?.id });
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.bought", outcome: "OK" });
    const again = await api.call("markBought", { params: { id: osmo?.id ?? "" }, body: { platformId: PLATFORMS.HEPSIBURADA.id, sellerRef: null, pricePaid: { amount: 1, currency: "TRY" }, pricePaidSource: "USER_TYPED", orderedOn: "2026-11-14", orderStatus: "ORDERED", returnDeadline: null } }).then(() => null, (caught: unknown) => caught);
    expect((again as ApiError).body.code).toBe("VALIDATION");
  });
});
