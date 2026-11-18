// Notifications on the mock API (step 13 PR 1): the list window, filters and category counts with
// their facets, read and read-all, the unread count, the preview with its 14-day history, "Senin
// için", digest and cap status, the delivery answer (decisions 2026-11-19), data isolation, the
// hidden-seller rule and the activity row of every write.
import { ApiError, type ApiErrorBody, notificationFilterOf } from "@firsatgeldi/contracts";
import { toCalendarDay } from "@firsatgeldi/core";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { OFFERS, PLATFORMS, SELLERS } from "./fixtures/market";
import { USERS } from "./fixtures/users";
import { SYSTEM_SETTINGS } from "./settings";
import { createTestApi } from "./test/harness";

const t = createTestApi({ seedTracking: true });
const { api, controller } = t;
const DAY_MS = 86_400_000;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.resetClock();
  controller.config = { ...controller.config, scenario: "success" };
  controller.state.notifications.length = 0;
  controller.state.notificationsSeeded.clear();
  controller.state.notificationPrefs.clear();
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiErrorBody> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).body as ApiErrorBody;
}
const last = () => controller.state.activity.at(-1);
const list = async (query: Parameters<typeof api.call<"getNotifications">>[1]["query"] = {}) => (await api.call("getNotifications", { query })).data;

describe("the list (GET /notifications)", () => {
  it("the last 30 days, newest first; older rows are kept but not listed", async () => {
    const { items, facets } = await list();
    expect(items.length).toBe(13);
    expect([...items].map((item) => item.createdAt)).toEqual([...items].map((item) => item.createdAt).sort().reverse());
    const from = Date.now() - SYSTEM_SETTINGS["notify.list_days"] * DAY_MS;
    for (const item of items) expect(Date.parse(item.createdAt)).toBeGreaterThanOrEqual(from);
    // The 40-day-old row is still stored.
    expect(controller.state.notifications.filter((row) => row.userId === USERS.user.id)).toHaveLength(items.length + 1);
    expect(facets.unread).toBe(4);
  });

  it("filters with counts: Fırsat = found + ended, İade = return + delivery, Aramalarım, Diğer", async () => {
    const { items, facets } = await list();
    expect(facets.filters.ALL).toBe(items.length);
    for (const filter of ["DEAL", "RETURN", "SEARCH", "OTHER"] as const) {
      const filtered = (await list({ filter })).items;
      expect(filtered).toHaveLength(facets.filters[filter]);
      for (const item of filtered) expect(notificationFilterOf(item.type)).toBe(filter);
    }
    expect(facets.filters).toMatchObject({ DEAL: 3, RETURN: 2, SEARCH: 1 });
  });

  it("search by product name, category with counts, only unread", async () => {
    expect((await list({ q: "dyson" })).items.map((item) => item.type)).toEqual(["DEADLINE_SOON"]);
    const { facets } = await list();
    const category = facets.categories[0];
    expect(category).toBeDefined();
    const inCategory = (await list({ category: category?.id ?? "" })).items;
    expect(inCategory).toHaveLength(category?.count ?? -1);
    const unread = (await list({ unread: "true" })).items;
    expect(unread.every((item) => !item.read)).toBe(true);
    expect(unread).toHaveLength(4);
  });

  it("a \"Fırsat geldi\" fades when the same product's \"Fırsat bitti\" came later; the ended row stays normal", async () => {
    const { items } = await list();
    const coat = items.filter((item) => item.subject.kind === "PRODUCT" && item.subject.product.id === PRODUCTS.winterCoat.id);
    expect(coat.find((item) => item.type === "DEAL_FOUND")?.faded).toBe(true);
    expect(coat.find((item) => item.type === "DEAL_ENDED")?.faded).toBe(false);
    expect(items.find((item) => item.type === "DEAL_FOUND" && !item.read)?.faded).toBe(false);
  });

  it("subjects: product with mode, account (mandatory) and person; values carry their check time", async () => {
    const { items } = await list();
    const deal = items.find((item) => item.type === "DEAL_FOUND" && !item.read);
    expect(deal?.subject).toMatchObject({ kind: "PRODUCT", mode: "BOUGHT" });
    expect(deal?.values).toMatchObject({ pricePaid: { amount: 2_899_900 }, cheapest: { amount: 2_599_700 }, saving: { amount: 300_200 }, ownStore: "Hepsiburada" });
    expect(deal?.values.checkedAt).not.toBeNull();
    expect(items.find((item) => item.type === "SEARCHED_PRODUCT_DROP")?.subject).toMatchObject({ kind: "PRODUCT", mode: "NOT_TRACKED", trackedItemId: null });
    expect(items.find((item) => item.type === "NEW_DEVICE_SIGNIN")).toMatchObject({ subject: { kind: "ACCOUNT" }, mandatory: true, values: { device: { browser: "Chrome", os: "Windows" } } });
    expect(items.find((item) => item.type === "FOLLOW_ACCEPTED")?.subject).toEqual({ kind: "PERSON", username: "ayse_d" });
    for (const item of items.filter((entry) => entry.values.cheapest !== null)) expect(item.values.checkedAt).not.toBeNull();
  });

  it("guests are asked to sign in; another user sees only their own; the empty scenario is empty", async () => {
    t.signInAs("guest");
    expect((await failure(api.call("getNotifications", { query: {} }))).code).toBe("UNAUTHENTICATED");
    t.signInAs("user");
    const own = (await list()).items[0]?.id ?? "";
    t.signInAs("secondUser");
    expect((await list()).items).toEqual([]);
    expect((await failure(api.call("getNotification", { params: { id: own } }))).code).toBe("NOT_FOUND");
    expect((await failure(api.call("readNotification", { params: { id: own } }))).code).toBe("NOT_FOUND");
    t.signInAs("user");
    controller.config = { ...controller.config, scenario: "empty" };
    expect((await list()).items).toEqual([]);
    expect((await api.call("getUnreadCount", {})).data).toEqual({ unread: 0, unreadDeal: false });
  });
});

describe("read", () => {
  it("one item: read, logged; the unread count and the deal flag follow", async () => {
    expect((await api.call("getUnreadCount", {})).data).toEqual({ unread: 4, unreadDeal: true });
    const deal = (await list()).items.find((item) => item.type === "DEAL_FOUND" && !item.read);
    await api.call("readNotification", { params: { id: deal?.id ?? "" } });
    expect(last()).toMatchObject({ action: "notification.read", targetType: "notification", targetId: deal?.id, metadata: { type: "DEAL_FOUND" } });
    expect((await api.call("getUnreadCount", {})).data).toEqual({ unread: 3, unreadDeal: false });
  });

  it("\"Tümünü okundu yap\": all read, logged with the count", async () => {
    expect((await api.call("readAllNotifications", {})).data.updated).toBe(4);
    expect(last()).toMatchObject({ action: "notification.read_all", metadata: { updated: 4 } });
    expect((await api.call("getUnreadCount", {})).data.unread).toBe(0);
  });
});

describe("the preview (GET /notifications/:id)", () => {
  it("the item with its 14-day cheapest price where it applies; none for a return or account item", async () => {
    const { items } = await list();
    const deal = await api.call("getNotification", { params: { id: items.find((item) => item.type === "DEAL_FOUND" && !item.read)?.id ?? "" } });
    expect(deal.data.history).toHaveLength(14);
    expect(deal.data.history?.at(-1)?.cheapest.amount).toBe(2_599_700);
    const ret = await api.call("getNotification", { params: { id: items.find((item) => item.type === "DEADLINE_SOON")?.id ?? "" } });
    expect(ret.data.history).toBeNull();
    expect(ret.data.values).toMatchObject({ returnDaysLeft: 2, ownStore: "Teknosa" });
  });
});

describe("\"Senin için\" and delivery status", () => {
  it("drops in the tracked list, untracked searches, frequent searches; cheapest offer only", async () => {
    const { data } = await api.call("getForYou", {});
    expect(data.drops).toHaveLength(3);
    expect(data.searches.map((entry) => entry.product.name)).toContain("DJI Osmo Action 5 Pro");
    expect(data.frequent.length).toBeGreaterThan(0);
  });

  it("digest off by default; on after choosing it in Settings; the daily cap", async () => {
    expect((await api.call("getDeliveryStatus", {})).data).toMatchObject({ digest: { on: false, time: SYSTEM_SETTINGS["notify.digest_time"] }, cap: { limit: SYSTEM_SETTINGS["notify.daily_cap"], sentToday: 3, deferred: 0 } });
    await api.call("updateNotificationPreferences", { body: { delivery: "DIGEST" } });
    expect((await api.call("getDeliveryStatus", {})).data.digest.on).toBe(true);
  });
});

describe("the delivery question (decisions 2026-11-19)", () => {
  const prompt = async () => (await list()).items.find((item) => item.type === "DELIVERY_PROMPT" && item.awaitingAnswer);

  it("\"Evet, aldım\": today is the delivery day, the deadline starts; logged as tracking.delivered", async () => {
    const item = await prompt();
    const { data } = await api.call("answerDeliveryPrompt", { params: { id: item?.id ?? "" }, body: { answer: "YES" } });
    expect(data.deliveredOn).toBe(toCalendarDay(controller.now()));
    expect(data.returnDeadline).not.toBeNull();
    expect(last()).toMatchObject({ action: "tracking.delivered", metadata: { answer: "TODAY", source: "notification" } });
    const tracked = controller.state.trackedItems.find((row) => row.id === data.trackedItemId);
    expect(tracked?.orderStatus).toBe("DELIVERED");
    // Answered: no second answer.
    expect((await failure(api.call("answerDeliveryPrompt", { params: { id: item?.id ?? "" }, body: { answer: "NOT_YET" } }))).code).toBe("VALIDATION");
  });

  it("\"Henüz değil\": asked again after 2 days, at most 3 times; logged as notification.delivery_later", async () => {
    const reask = SYSTEM_SETTINGS["notify.delivery_reask_days"] * DAY_MS;
    let item = await prompt();
    const answers: number[] = [];
    for (let ask = 1; ask <= SYSTEM_SETTINGS["notify.delivery_reask_max"]; ask += 1) {
      expect(item).toBeDefined();
      const { data } = await api.call("answerDeliveryPrompt", { params: { id: item?.id ?? "" }, body: { answer: "NOT_YET" } });
      expect(last()).toMatchObject({ action: "notification.delivery_later" });
      answers.push(data.asksLeft);
      if (data.nextAskAt) expect(Date.parse(data.nextAskAt) - controller.now().getTime()).toBe(reask);
      // Nothing new before the time comes.
      expect(await prompt()).toBeUndefined();
      t.advanceClock(reask + 1);
      item = await prompt();
    }
    expect(answers).toEqual([2, 1, 0]);
    expect(item).toBeUndefined();
  });

  it("only a delivery question can be answered", async () => {
    const deal = (await list()).items.find((entry) => entry.type === "DEAL_FOUND");
    expect((await failure(api.call("answerDeliveryPrompt", { params: { id: deal?.id ?? "" }, body: { answer: "YES" } }))).code).toBe("VALIDATION");
  });
});

describe("hidden-seller rule", () => {
  it("no seller identity in the list, the previews or \"Senin için\"; a store name only as the user's own purchase", async () => {
    const answers: unknown[] = [];
    for (const locale of ["tr", "en"] as const) {
      t.useLocale(locale);
      const { items } = await list();
      answers.push(items, (await api.call("getForYou", {})).data);
      for (const item of items) answers.push((await api.call("getNotification", { params: { id: item.id } })).data);
    }
    t.useLocale("tr");
    // The user's own purchases may name their store; nothing else may name any store or seller.
    const text = JSON.stringify(answers).replace(/"ownStore":"[^"]*"/g, '"ownStore":null');
    for (const seller of Object.values(SELLERS)) for (const secret of [seller.name, seller.id, seller.externalId]) expect(text).not.toContain(secret);
    for (const platform of Object.values(PLATFORMS)) for (const secret of [platform.name, platform.domain, platform.id]) expect(text).not.toContain(secret);
    for (const offer of OFFERS) expect(text).not.toContain(offer.id);
  });
});
