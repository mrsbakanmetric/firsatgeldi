// Home on the mock API (modules.md Home; architecture.md §16.1 HomeView; design "3 Ana Sayfa" v2):
// Hemen Gözat in Home priority order with hidden offers by rank, the emphasised second urgent
// item, up to four cards, the return reminder, "Şu an en çok düşenler" by the documented rule
// (categories first, own products excluded, general list, hidden), and the single Check Now.
import { type ApiError, TOP_DROP_ITEM_KEYS } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { SELLERS } from "./fixtures/market";
import { SYSTEM_SETTINGS } from "./settings";
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

const scenario = (name: typeof controller.config.scenario) => {
  controller.config = { ...controller.config, scenario: name };
};

describe("Hemen Gözat and the cards", () => {
  it("Hemen Gözat = first in priority order with up to 3 hidden offers by rank; second deal emphasised first", async () => {
    const { data, meta } = await api.call("getHome", {});
    expect(data.featured?.product.id).toBe(PRODUCTS.acePro2FlashPrint.id);
    expect(data.featured?.offers.map((offer) => offer.rank)).toEqual([1, 2]);
    expect(data.featured?.cheaperCount).toBe(2);
    expect(data.featured?.offers[0]?.saving).toEqual({ amount: 300_200, currency: "TRY" });
    expect(data.cards.map((card) => card.product.id)).toEqual([PRODUCTS.winterCoat.id, PRODUCTS.dysonV15.id, PRODUCTS.osmoPocket3.id, PRODUCTS.x4.id]);
    expect(data.cards).toHaveLength(SYSTEM_SETTINGS["home.tracked_cards"]);
    expect(data.cards.map((card) => card.emphasised)).toEqual([true, false, false, false]);
    expect(meta?.total).toBe(6);
    expect(meta?.entitlements?.checkNow).toEqual({ used: 7, limit: 10 });
  });

  it("summary line: the four figures, the protected amount and the return reminder (≤ 2 days)", async () => {
    const { data } = await api.call("getHome", {});
    expect(data.summary.tracking).toEqual({ count: 6, bought: 4, want: 2 });
    expect(data.summary.deals.count).toBe(3);
    // Price paid of the active bought items: 28.999 + 3.299 + 30.999 + 24.999 TL.
    expect(data.protectedTotal).toEqual({ amount: 8_829_600, currency: "TRY" });
    expect(data.returnsSoon).toEqual({ count: 1, items: [{ id: expect.any(String), name: PRODUCTS.dysonV15.name.tr }] });
  });

  it("no deal at all: Hemen Gözat is the item with the nearest return deadline, no offers", async () => {
    scenario("no-deal");
    const { data } = await api.call("getHome", {});
    expect(data.featured?.product.id).toBe(PRODUCTS.dysonV15.id);
    expect(data.featured?.deal).toBeNull();
    expect(data.featured?.offers).toEqual([]);
    expect(data.cards.some((card) => card.emphasised)).toBe(false);
  });

  it("new user: nothing tracked → no Hemen Gözat, no cards, the general top drops", async () => {
    scenario("empty");
    const { data, meta } = await api.call("getHome", {});
    expect(data.featured).toBeNull();
    expect(data.cards).toEqual([]);
    expect(data.protectedTotal).toBeNull();
    expect(meta?.total).toBe(0);
    expect(data.topDrops).toMatchObject({ scope: "GENERAL", hasTrackedCategories: false });
    expect(data.topDrops?.items.map((item) => item.product.id)).toEqual([PRODUCTS.airfryerXxl.id, PRODUCTS.osmoAction5Pro.id, PRODUCTS.kindlePaperwhite.id]);
  });

  it("guests have no Home data (the shell shows the landing / sign-in instead)", async () => {
    t.signInAs("guest");
    const error = await api.call("getHome", {}).then(() => null, (caught: unknown) => caught as ApiError);
    expect(error?.body.code).toBe("UNAUTHENTICATED");
  });
});

describe("Şu an en çok düşenler", () => {
  it("the user's categories first, biggest drop first; own tracked products and small drops never listed", async () => {
    const { data } = await api.call("getHome", {});
    const drops = data.topDrops;
    expect(drops?.scope).toBe("CATEGORIES");
    expect(drops?.windowDays).toBe(30);
    expect(drops?.items.map((item) => item.product.id)).toEqual([PRODUCTS.osmoAction5Pro.id, PRODUCTS.speedProMax.id, PRODUCTS.goProHero13.id]);
    expect(drops?.categories.map((category) => category.id)).toEqual([PRODUCTS.osmoAction5Pro.category.id, PRODUCTS.speedProMax.category.id]);
    const [osmo] = drops?.items ?? [];
    expect(osmo).toMatchObject({ averagePrice: { amount: 1_828_663 }, currentPrice: { amount: 1_499_900 }, dropAmount: { amount: 328_763 }, dropPct: 17, sellerCount: 4, stockState: "IN_STOCK" });
    // The Insta360 X4 dropped too, but the user tracks it.
    expect(JSON.stringify(drops)).not.toContain(PRODUCTS.x4.id);
    expect(JSON.stringify(drops)).not.toContain(PRODUCTS.acePro.id);
    for (const item of drops?.items ?? []) expect(Object.keys(item)).toEqual(TOP_DROP_ITEM_KEYS);
  });

  it("no big drop in the user's categories → the general list, flagged for the note", async () => {
    scenario("drops-general");
    const { data } = await api.call("getHome", {});
    expect(data.topDrops).toMatchObject({ scope: "GENERAL", hasTrackedCategories: true });
    expect(data.topDrops?.items.map((item) => item.product.id)).toEqual([PRODUCTS.airfryerXxl.id, PRODUCTS.kindlePaperwhite.id, PRODUCTS.galaxyWatch7.id]);
  });

  it("nothing qualifies → null (the section is hidden)", async () => {
    scenario("drops-none");
    expect((await api.call("getHome", {})).data.topDrops).toBeNull();
  });

  it("names follow the request language", async () => {
    t.useLocale("en");
    const { data } = await api.call("getHome", {});
    expect(data.topDrops?.items[0]?.product.category.name).toBe("Action camera");
    expect(data.featured?.product.name).toBe(PRODUCTS.acePro2FlashPrint.name.en);
  });
});

describe("Şimdi kontrol et (one item)", () => {
  it("checked within the cache window → CACHED, no allowance used; logged as check_now", async () => {
    const { data: home } = await api.call("getHome", {});
    const id = home.featured?.id as string;
    const before = controller.state.checkNowUsage.length;
    const { data } = await api.call("checkNow", { params: { id } });
    expect(data).toEqual({ status: "CACHED", remaining: 3 });
    expect(controller.state.checkNowUsage.slice(before)).toEqual([expect.objectContaining({ trackedItemId: id, consumed: false })]);
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "check_now", outcome: "OK", targetType: "tracked_item", targetId: id, metadata: { cached: true } });
  });

  it("otherwise one allowance, check.finished, and LIMIT_REACHED at zero", async () => {
    const { data: home } = await api.call("getHome", {});
    const old = home.cards.filter((card) => card.lastCheckedAt && Date.parse(card.lastCheckedAt) < Date.now() - 10 * 60_000);
    expect(old.length).toBeGreaterThanOrEqual(3);
    const sent = controller.state.streamLog.length;
    expect((await api.call("checkNow", { params: { id: old[0]?.id as string } })).data).toEqual({ status: "CHECKING", remaining: 2 });
    expect(controller.state.streamLog.slice(sent).map((entry) => entry.event.type)).toEqual(["check.finished"]);
    await api.call("checkNow", { params: { id: old[1]?.id as string } });
    await api.call("checkNow", { params: { id: old[2]?.id as string } });
    const last = old[3] ?? home.cards.find((card) => !old.includes(card));
    t.advanceClock(10 * 60_000);
    const error = await api.call("checkNow", { params: { id: last?.id as string } }).then(() => null, (caught: unknown) => caught as ApiError);
    expect(error?.body.code).toBe("LIMIT_REACHED");
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "check_now", outcome: "LIMITED" });
  });

  it("another user's item does not exist", async () => {
    const { data: home } = await api.call("getHome", {});
    t.signInAs("secondUser");
    const error = await api.call("checkNow", { params: { id: home.featured?.id as string } }).then(() => null, (caught: unknown) => caught as ApiError);
    expect(error?.body.code).toBe("NOT_FOUND");
    expect(JSON.stringify(home.topDrops)).not.toContain(SELLERS.kameraDunyasi.name);
  });
});
