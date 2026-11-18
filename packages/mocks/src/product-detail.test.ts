// Product Detail on the mock API (modules.md Product Detail, Price and Stock History, Ratings,
// Return Window, Want to Buy; implementation_plan.md Appendix B.2): the seeded rows of design
// "4 Takip Ettiklerim" opened one by one, every read and every write with its log rows.
import { ApiError, HistoryRange } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { PLATFORMS, SELLERS } from "./fixtures/market";
import { calendarPath } from "./handlers/product-detail";
import { BASE_URL, createTestApi } from "./test/harness";

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

const tl = (amount: number) => ({ amount: amount * 100, currency: "TRY" as const });
/** The seeded tracked item of a product (bought, unless `mode` says otherwise). */
const idOf = (key: keyof typeof PRODUCTS, mode: "BOUGHT" | "WANT" = "BOUGHT") => controller.state.trackedItems.find((item) => item.productKey === key && item.mode === mode)?.id ?? "";
const plain = (text: string | null | undefined) => (text ?? "").replace(/\u00a0/g, " ");

async function refused(run: () => Promise<unknown>): Promise<ApiError> {
  const error = await run().then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("detail", () => {
  it("the list item plus the page's own fields: variant line, tracking start, own return rule, steps", async () => {
    const { data, meta } = await api.call("getTrackedItem", { params: { id: idOf("acePro2FlashPrint") } });
    expect(data.product.variantLine).not.toBeNull();
    expect(data.trackingStartedOn).toBe("2026-11-01");
    expect(data.returnRule).toEqual(PLATFORMS.HEPSIBURADA.returnRule);
    expect(data.purchase).toMatchObject({ sellerName: SELLERS.kameraDunyasi.name, platformName: "Hepsiburada" });
    expect(data.steps).toEqual([
      { step: "RETURN_REQUEST", done: false },
      { step: "REORDER", done: false },
      { step: "END", done: false },
    ]);
    expect(data.deliveryPrompt).toBe(false);
    expect(data.targetHints).toBeNull();
    expect(meta).toBeUndefined();
  });

  it("“Teslim aldın mı?” is asked once the estimated delivery day has passed and the last day is still estimated", async () => {
    const { data } = await api.call("getTrackedItem", { params: { id: idOf("x4") } });
    expect(data.returnDeadlineStatus).toBe("ESTIMATED");
    expect(data.deliveryPrompt).toBe(true);
  });

  it("want to buy: no steps; target suggestions from the seller-less history (design chips 30 gün / 6 ay)", async () => {
    const { data } = await api.call("getTrackedItem", { params: { id: idOf("airPodsPro2", "WANT") } });
    expect(data.steps).toEqual([]);
    expect(data.returnRule).toBeNull();
    // Only 14 days of history: a 30-day suggestion; the 6-month one needs no more data than that rule says.
    expect(data.targetHints?.lowest30Days).not.toBeNull();
  });

  it("another user's item does not exist; a guest must sign in", async () => {
    t.signInAs("secondUser");
    expect((await refused(() => api.call("getTrackedItem", { params: { id: idOf("acePro2FlashPrint") } }))).body.code).toBe("NOT_FOUND");
    t.signInAs("guest");
    expect((await refused(() => api.call("getTrackedItem", { params: { id: idOf("acePro2FlashPrint") } }))).body.code).toBe("UNAUTHENTICATED");
  });

  it("“/tracked-items/summary” is still the summary, never read as an id", async () => {
    const { data } = await api.call("getTrackedItemsSummary", {});
    expect(data.tracking.count).toBeGreaterThan(0);
  });
});

describe("offers", () => {
  it("bought: the cheaper offers by rank with a one-line summary; the user's own listing as the reference row", async () => {
    const { data } = await api.call("getTrackedItemOffers", { params: { id: idOf("acePro2FlashPrint") } });
    expect(data.offers.map((offer) => [offer.rank, offer.revealed, offer.price.amount])).toEqual([
      [1, false, 2_599_700],
      [2, false, 2_719_900],
    ]);
    expect(data.offers[0]?.summary).toEqual({ trust: { verdict: "INSUFFICIENT", reasonKey: "trust.reason.storeRatingGood" }, installments: { maxInterestFree: 6 }, campaign: { kind: "BANK", amount: null } });
    expect(data.own).toMatchObject({ sellerName: SELLERS.kameraDunyasi.name, platformName: "Hepsiburada", price: tl(28_999), stockState: "IN_STOCK" });
    expect(data.checkedCount).toBe(7);
    expect(data.underReview).toBe(0);
    expect(JSON.stringify(data)).not.toContain(SELLERS.aksiyonMarket.name);
  });

  it("want: the in-stock offers, cheapest first; no reference row", async () => {
    const { data } = await api.call("getTrackedItemOffers", { params: { id: idOf("airPodsPro2", "WANT") } });
    expect(data.offers.map((offer) => offer.rank)).toEqual([1, 2]);
    expect(data.own).toBeNull();
  });

  it("an ended item lists no offers (history stays readable)", async () => {
    const id = idOf("wh1000xm5");
    expect((await api.call("getTrackedItemOffers", { params: { id } })).data.offers).toEqual([]);
    expect((await api.call("getPriceHistory", { params: { id }, query: { range: "14d" } })).data.cheapest).toHaveLength(14);
  });
});

describe("price history", () => {
  const id = () => idOf("acePro2FlashPrint");

  it("1 month: 30 days, tracking start, today's lowest by rank, four tiles and the buy-or-wait line", async () => {
    const { data } = await api.call("getPriceHistory", { params: { id: id() }, query: { range: "1m" } });
    expect(data.cheapest).toHaveLength(30);
    expect(data.from).toBe("2026-10-16");
    expect(data.trackingStartedOn).toBe("2026-11-01");
    expect(data.reference).toEqual({ kind: "PAID", price: tl(28_999) });
    expect(data.lowest).toEqual({ day: "2026-11-14", price: tl(25_997), rankThen: 1 });
    expect(data.tiles).toEqual({ lowest: tl(25_997), highest: tl(29_699), average: expect.objectContaining({ currency: "TRY" }), change: tl(25_997 - 29_699) });
    expect(data.dataDays).toBe(30);
    // Bought: "Son 30 günün en düşüğü" (Product Detail v2).
    expect(data.hint).toEqual({ kind: "LOWEST_IN_DAYS", days: 30 });
  });

  it("6 months: the lowest was another day, named by its rank then (\"o gün en ucuz 2. satıcıydı\")", async () => {
    const { data } = await api.call("getPriceHistory", { params: { id: id() }, query: { range: "6m" } });
    expect(data.cheapest).toHaveLength(180);
    expect(data.lowest).toMatchObject({ price: tl(24_899), rankThen: 2 });
  });

  it("every range answers; a range longer than the data shows what exists (\"veri N günlük\")", async () => {
    for (const range of HistoryRange.options) {
      const { data } = await api.call("getPriceHistory", { params: { id: id() }, query: { range } });
      expect(data.dataDays).toBe(Math.min(data.cheapest.length, 180));
    }
    const all = (await api.call("getPriceHistory", { params: { id: id() }, query: { range: "all" } })).data;
    expect(all.cheapest).toHaveLength(180);
    const year = (await api.call("getPriceHistory", { params: { id: id() }, query: { range: "1y" } })).data;
    expect(year.cheapest.slice(0, 365 - 180).every((value) => value === null)).toBe(true);
  });

  it("want: \"Son 6 ayın en düşüğüne 1.098 TL var\" and the target chips 25.997 / 24.899 (Product Detail v2)", async () => {
    const product = PRODUCTS.acePro2FlashPrint;
    const created = await api.call("createTrackedItem", { body: { mode: "WANT", productId: product.id, identifyRequestId: null, targetPrice: tl(25_000), trackingDuration: "1M" } });
    // A new row has no seed history of its own; give it the product's history, as the real API shares it.
    const index = controller.state.trackedItems.findIndex((item) => item.id === created.data.id);
    const row = controller.state.trackedItems[index];
    if (!row) throw new Error("no row");
    controller.state.trackedItems[index] = { ...row, seedKey: "ace-pro-2" };
    const history = (await api.call("getPriceHistory", { params: { id: created.data.id }, query: { range: "1m" } })).data;
    expect(history.reference).toEqual({ kind: "TARGET", price: tl(25_000) });
    expect(history.hint).toEqual({ kind: "ABOVE_LOWEST", days: 180, amount: tl(1_098) });
    const detail = (await api.call("getTrackedItem", { params: { id: created.data.id } })).data;
    expect(detail.targetHints).toEqual({ lowest30Days: tl(25_997), lowest6Months: tl(24_899) });
  });
});

describe("stock history", () => {
  it("14 days: the cheapest three by rank and the user's own seller; changes newest first; the conclusion", async () => {
    const { data } = await api.call("getStockHistory", { params: { id: idOf("acePro2FlashPrint") }, query: { range: "14d" } });
    expect(data.rows.map((row) => row.subject)).toEqual([{ kind: "RANK", rank: 1 }, { kind: "RANK", rank: 2 }, { kind: "OWN" }]);
    for (const row of data.rows) expect(row.days).toHaveLength(14);
    // The drawn strip of the cheapest offer: "iiiilooiiiiiii" (oldest first) — one day before tracking began is "no data".
    expect(data.rows[0]?.days.slice(1, 8)).toEqual(["IN_STOCK", "IN_STOCK", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "OUT_OF_STOCK", "IN_STOCK"]);
    expect((data.changes[0]?.day ?? "") >= (data.changes.at(-1)?.day ?? "")).toBe(true);
    expect(data.changes.some((change) => change.subject.kind === "RANK" && change.to === "OUT_OF_STOCK")).toBe(true);
    expect(data.conclusion).toEqual({ subject: { kind: "RANK", rank: 1 }, state: "IN_STOCK", atLeastDays: 7 });
  });

  it("1 month: days before tracking began have no data — nothing is guessed", async () => {
    const { data } = await api.call("getStockHistory", { params: { id: idOf("acePro2FlashPrint") }, query: { range: "1m" } });
    expect(data.from).toBe("2026-10-16");
    for (const row of data.rows) expect(row.days.slice(0, 16).every((day) => day === null)).toBe(true);
  });
});

describe("ready texts and ratings", () => {
  it("the price-difference message goes to the seller bought from, in both languages", async () => {
    const tr = (await api.call("getPriceDifferenceMessage", { params: { id: idOf("acePro2FlashPrint") }, query: { locale: "tr" } })).data;
    expect(tr.recipient).toBe(SELLERS.kameraDunyasi.name);
    expect(plain(tr.text)).toBe(
      "Merhaba, 1 Kasım 2026 tarihinde 28.999 TL fiyatla aldığım Insta360 Ace Pro 2 Flash Print Bundle ürününün fiyatı şu an 25.997 TL. Aradaki 3.002 TL farkın iadesini rica ederim.",
    );
    expect(tr.difference).toEqual(tl(3_002));
    const en = (await api.call("getPriceDifferenceMessage", { params: { id: idOf("acePro2FlashPrint") }, query: { locale: "en" } })).data;
    expect(plain(en.text)).toContain("TL 3,002");
  });

  it("nothing cheaper → no text; a want-to-buy item has no message", async () => {
    expect((await api.call("getPriceDifferenceMessage", { params: { id: idOf("dysonV15") }, query: { locale: "tr" } })).data.text).toBeNull();
    expect((await refused(() => api.call("getPriceDifferenceMessage", { params: { id: idOf("airPodsPro2", "WANT") }, query: { locale: "tr" } }))).body.code).toBe("VALIDATION");
  });

  it("the product rating across stores, seller-less and public; few ratings are marked", async () => {
    t.signInAs("guest");
    const ace = (await api.call("getProductRatings", { params: { id: PRODUCTS.acePro2FlashPrint.id } })).data;
    expect(ace).toMatchObject({ average: { value: 4.5, scale: 5, count: 3_850 }, storeCount: 4, few: false });
    expect((await api.call("getProductRatings", { params: { id: PRODUCTS.airPodsPro2.id } })).data.few).toBe(true);
    expect((await api.call("getProductRatings", { params: { id: PRODUCTS.winterCoat.id } })).data).toEqual({ average: null, storeCount: 0, few: false, readAt: null });
  });

  it("“Takvime ekle”: the last return day as an .ics file with a reminder one day before", async () => {
    const response = await fetch(`${BASE_URL}${calendarPath(idOf("acePro2FlashPrint"))}`);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    const body = await response.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20261118");
    expect(body).toContain("TRIGGER:-P1D");
    expect(body).toContain("İade için son gün · Insta360 Ace Pro 2 Flash Print Bundle");
    t.signInAs("secondUser");
    expect((await fetch(`${BASE_URL}${calendarPath(idOf("acePro2FlashPrint"))}`)).status).toBe(404);
  });
});

describe("writes — each one logged", () => {
  const lastActivity = () => controller.state.activity.at(-1);
  const lastEvent = () => controller.state.trackedItemEvents.at(-1);

  it("correcting the price paid and the last day (bought); the target belongs to want-to-buy only", async () => {
    const id = idOf("dysonV15");
    const { data } = await api.call("updateTrackedItem", { params: { id }, body: { pricePaid: tl(30_499), returnDeadline: "2026-11-20" } });
    expect(data.purchase?.pricePaid).toEqual(tl(30_499));
    expect(data.returnDeadline).toBe("2026-11-20");
    expect(data.returnDeadlineStatus).toBe("USER_EDITED");
    expect(lastActivity()).toMatchObject({ action: "tracking.edit", outcome: "OK", targetId: id, metadata: { fields: ["pricePaid", "returnDeadline"] } });
    expect(controller.state.trackedItemEvents.slice(-2).map((row) => row.type)).toEqual(["PRICE_EDITED", "DEADLINE_EDITED"]);
    expect((await refused(() => api.call("updateTrackedItem", { params: { id }, body: { targetPrice: tl(20_000) } }))).body.code).toBe("VALIDATION");
    // An empty change is refused by the shared schema before it is sent (the server applies the same schema).
    await expect(api.call("updateTrackedItem", { params: { id }, body: {} })).rejects.toThrow();
  });

  it("“Teslim aldın mı? · Evet, bugün” fixes the last day from today", async () => {
    const id = idOf("x4");
    const { data } = await api.call("answerDelivered", { params: { id }, body: { answer: "TODAY", day: null } });
    expect(data).toEqual({ returnDeadline: "2026-12-14", returnDeadlineStatus: "CONFIRMED" });
    expect(lastEvent()).toMatchObject({ type: "DELIVERED", data: { answer: "TODAY" } });
    expect(lastActivity()).toMatchObject({ action: "tracking.delivered", outcome: "OK" });
    expect((await api.call("getTrackedItem", { params: { id } })).data.deliveryPrompt).toBe(false);
  });

  it("steps tick and untick (“Yaptım ✓”); “Takibi bitir” is not a tick", async () => {
    const id = idOf("acePro2FlashPrint");
    const ticked = await api.call("tickStep", { params: { id, step: "RETURN_REQUEST" }, body: { done: true } });
    expect(ticked.data.steps[0]).toEqual({ step: "RETURN_REQUEST", done: true });
    expect(lastEvent()?.type).toBe("STEP_TICKED");
    const unticked = await api.call("tickStep", { params: { id, step: "RETURN_REQUEST" }, body: { done: false } });
    expect(unticked.data.steps[0]?.done).toBe(false);
    expect(lastActivity()).toMatchObject({ action: "tracking.step", metadata: { step: "RETURN_REQUEST", done: false } });
    expect((await refused(() => api.call("tickStep", { params: { id, step: "END" }, body: { done: true } }))).body.code).toBe("VALIDATION");
    expect((await refused(() => api.call("tickStep", { params: { id, step: "PRICE_DIFFERENCE" }, body: { done: true } }))).body.code).toBe("VALIDATION");
  });

  it("request tracking: set, answered, cleared", async () => {
    const id = idOf("acePro2FlashPrint");
    const asked = await api.call("updateRequest", { params: { id }, body: { kind: "PRICE_DIFFERENCE", outcome: null } });
    expect(asked.data.request).toMatchObject({ kind: "PRICE_DIFFERENCE", outcome: null });
    const answered = await api.call("updateRequest", { params: { id }, body: { kind: "PRICE_DIFFERENCE", outcome: "GIVEN" } });
    expect(answered.data.request?.since).toBe(asked.data.request?.since);
    expect((await api.call("updateRequest", { params: { id }, body: { kind: null, outcome: null } })).data.request).toBeNull();
    expect(lastActivity()).toMatchObject({ action: "tracking.request", outcome: "OK" });
  });

  it("extending: want-to-buy only", async () => {
    const { data } = await api.call("extendTracking", { params: { id: idOf("airPodsPro2", "WANT") }, body: { duration: "3M" } });
    expect(data.trackingDuration).toBe("3M");
    expect(data.trackingEndsAt).toBe("2027-02-14T09:00:00.000Z");
    expect(lastEvent()?.type).toBe("EXTENDED");
    expect((await refused(() => api.call("extendTracking", { params: { id: idOf("dysonV15") }, body: { duration: "1M" } }))).body.code).toBe("VALIDATION");
  });

  it("the two buyer questions: after tracking ended, once", async () => {
    expect((await refused(() => api.call("sendFeedback", { params: { id: idOf("dysonV15") }, body: { priceDifferenceGiven: "YES", returnSmooth: null } }))).body.code).toBe("VALIDATION");
    const id = idOf("wh1000xm5");
    const { data } = await api.call("sendFeedback", { params: { id }, body: { priceDifferenceGiven: "YES", returnSmooth: "YES" } });
    expect(data.feedback).toEqual({ priceDifferenceGiven: "YES", returnSmooth: "YES" });
    expect(lastActivity()).toMatchObject({ action: "feedback.create", outcome: "OK" });
    expect((await api.call("getTrackedItem", { params: { id } })).data.feedback).toEqual({ priceDifferenceGiven: "YES", returnSmooth: "YES" });
    expect((await refused(() => api.call("sendFeedback", { params: { id }, body: { priceDifferenceGiven: "NO", returnSmooth: null } }))).body.code).toBe("VALIDATION");
  });

  it("reports: a wrong price on an offer (by its ref, logged by rank) or a different product", async () => {
    const id = idOf("acePro2FlashPrint");
    const [offer] = (await api.call("getTrackedItemOffers", { params: { id } })).data.offers;
    const wrong = await api.call("createReport", { body: { trackedItemId: id, kind: "WRONG_PRICE", offerRef: offer?.ref ?? "", note: "Sepette farklı" } });
    expect(wrong.data.status).toBe("RECEIVED");
    expect(lastActivity()).toMatchObject({ action: "report.create", targetType: "offer", metadata: { kind: "WRONG_PRICE", rank: 1 }, containsHiddenSeller: false });
    expect(JSON.stringify(lastActivity())).not.toContain(SELLERS.aksiyonMarket.name);
    await api.call("createReport", { body: { trackedItemId: id, kind: "DIFFERENT_PRODUCT", offerRef: null, note: null } });
    expect(controller.state.reports.map((report) => report.kind)).toEqual(["WRONG_PRICE", "DIFFERENT_PRODUCT"]);
    await expect(api.call("createReport", { body: { trackedItemId: id, kind: "WRONG_PRICE", offerRef: null, note: null } })).rejects.toThrow();
  });

  it("“Stoğa gelince haber ver”: one subscription per offer, however often pressed", async () => {
    const [offer] = (await api.call("getTrackedItemOffers", { params: { id: idOf("acePro2FlashPrint") } })).data.offers;
    await api.call("notifyBackInStock", { params: { ref: offer?.ref ?? "" } });
    await api.call("notifyBackInStock", { params: { ref: offer?.ref ?? "" } });
    expect(controller.state.stockAlerts).toHaveLength(1);
    expect(lastActivity()).toMatchObject({ action: "offer.notify_back_in_stock", outcome: "OK" });
  });

  it("writes on an ended item are refused", async () => {
    const id = idOf("wh1000xm5");
    expect((await refused(() => api.call("updateTrackedItem", { params: { id }, body: { orderStatus: "DELIVERED" } }))).body.code).toBe("VALIDATION");
    expect((await refused(() => api.call("tickStep", { params: { id, step: "REORDER" }, body: { done: true } }))).body.code).toBe("VALIDATION");
  });
});

describe("“Mağazaya git” re-check (design flows A–B)", () => {
  async function revealed(key: keyof typeof PRODUCTS, mode: "BOUGHT" | "WANT", rank: number) {
    const offer = (await api.call("getTrackedItemOffers", { params: { id: idOf(key, mode) } })).data.offers.find((item) => item.rank === rank);
    const ref = offer?.ref ?? "";
    await api.call("revealOffer", { params: { ref }, idempotencyKey: crypto.randomUUID() });
    return ref;
  }

  it("the price moved: the new price and the link (no next offer after the last one); the next press goes through", async () => {
    const ref = await revealed("acePro2FlashPrint", "BOUGHT", 2);
    const first = (await api.call("goToOffer", { params: { ref } })).data;
    expect(first).toMatchObject({ status: "PRICE_CHANGED", price: tl(27_599) });
    if (first.status !== "PRICE_CHANGED") throw new Error("expected PRICE_CHANGED");
    expect(first.url).toMatch(/^https:\/\//);
    expect(first.next).toBeNull();
    expect((await api.call("goToOffer", { params: { ref } })).data.status).toBe("OK");
  });

  it("sold out: the next offer takes its place with its own rank, hidden; nothing is opened", async () => {
    const ref = await revealed("osmoPocket3", "WANT", 1);
    const result = (await api.call("goToOffer", { params: { ref } })).data;
    expect(result.status).toBe("GONE");
    if (result.status !== "GONE") throw new Error("expected GONE");
    expect(result.next?.rank).toBe(2);
    expect(result.next).not.toHaveProperty("platformName");
    expect(result).not.toHaveProperty("url");
  });
});

describe("frequent returns (design flows D)", () => {
  it("the user's own high return rate at the store bought from is given; otherwise null", async () => {
    expect((await api.call("getTrackedItem", { params: { id: idOf("dysonV15") } })).data.frequentReturns).toEqual({ count: 4, months: 3 });
    expect((await api.call("getTrackedItem", { params: { id: idOf("acePro2FlashPrint") } })).data.frequentReturns).toBeNull();
  });
});
