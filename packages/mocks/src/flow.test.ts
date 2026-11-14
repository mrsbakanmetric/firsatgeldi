// The Search and Add flow through the typed client, as the screen will call it
// (implementation_plan.md step 9: "the typed client gets valid responses").
import { ActivityEvent, ApiError, CreateTrackedItemRequest } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { PLATFORMS } from "./fixtures/market";
import { createTestApi } from "./test/harness";

const t = createTestApi();
const { api, controller } = t;
const product = PRODUCTS.acePro2FlashPrint;
const pricePaid = { amount: 2_899_900, currency: "TRY" } as const;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.useLocale("tr");
  controller.config = { ...controller.config, scenario: "success" };
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

async function lookupOwnSeller() {
  const { data } = await api.call("sellerLookup", { params: { id: product.id }, body: { platformId: PLATFORMS.HEPSIBURADA.id, name: "kamera dünyası" } });
  if (!data.match) throw new Error("own seller not found");
  return data.match;
}

describe("session", () => {
  it("returns the signed-in user with masked personal data and permission keys", async () => {
    const { data } = await api.call("getMe", {});
    expect(data.displayName).toBe("Sena B.");
    expect(data.emailMasked).toContain("***");
    expect(data.permissions).toContain("tracking.own.write");
    expect(data.permissions.some((key) => key.startsWith("admin."))).toBe(false);
  });

  it("gives the Application Manager every key", async () => {
    t.signInAs("manager");
    const { data } = await api.call("getMe", {});
    expect(data.roles).toEqual(["APP_MANAGER"]);
    expect(data.permissions).toContain("admin.offers.view_hidden_seller");
  });

  it("answers UNAUTHENTICATED for a guest", async () => {
    t.signInAs("guest");
    expect((await failure(api.call("getMe", {}))).body.code).toBe("UNAUTHENTICATED");
  });

  it("returns entitlements of the free plan (reveals unlimited under FREE_TOGGLE)", async () => {
    const { data } = await api.call("getEntitlements", {});
    expect(data).toMatchObject({ plan: "FREE", tracking: { limit: 10 }, reveals: { limit: null }, checkNow: { limit: 10 } });
  });

  it("lists recent searches in the request language", async () => {
    t.useLocale("en");
    const { data } = await api.call("getSearchHistory", {});
    expect(data.items.map((item) => item.query)).toContain("Winter coat");
  });
});

describe("search and identify", () => {
  it.each([
    ["tr", "Aksiyon kamerası"],
    ["en", "Action camera"],
  ] as const)("autocomplete returns catalogue products without price or store (%s)", async (locale, categoryName) => {
    t.useLocale(locale);
    const { data, meta } = await api.call("autocomplete", { query: { q: "insta360 ace pro 2" } });
    expect(data.tileCount).toBe(3);
    expect(meta?.total).toBe(data.items.length);
    expect(data.items[0]?.category.name).toBe(categoryName);
    expect(JSON.stringify(data)).not.toMatch(/price|seller|platform/i);
  });

  it("autocomplete works for guests and suggests a spelling fix", async () => {
    t.signInAs("guest");
    const { data } = await api.call("autocomplete", { query: { q: "kamra" } });
    expect(data.items).toHaveLength(0);
    expect(data.didYouMean).toBe("kamera");
  });

  it("identify text: understood attributes, bundle question and three exact candidates", async () => {
    const { data } = await api.call("identify", { body: { text: "Insta360 Ace Pro 2 Flash Print" } });
    expect(data.understood.map((attribute) => attribute.label)).toEqual(["Tür", "Marka", "Model", "Nesil", "Renk"]);
    expect(data.questions[0]?.prompt).toBe("Paket doğru mu?");
    expect(data.candidates.map((candidate) => candidate.variantLine)).toEqual([
      "2. nesil · Flash Print Bundle · Siyah",
      "2. nesil · Standart paket · Siyah",
      "2. nesil · Kreatör paketi · Siyah",
    ]);
    expect(data.similarCount).toBe(4);

    const answered = await api.call("answerIdentify", { params: { requestId: data.requestId }, body: { questionId: "bundle", optionId: "insta360-ace-pro-2-creator" } });
    expect(answered.data.questions[0]?.selectedOptionId).toBe("insta360-ace-pro-2-creator");

    const corrected = await api.call("answerIdentify", { params: { requestId: data.requestId }, body: { attributeKey: "generation", value: "1. nesil" } });
    expect(corrected.data.candidates[0]?.product.name).toBe("Insta360 Ace Pro");
  });

  it("identify text in English", async () => {
    t.useLocale("en");
    const { data } = await api.call("identify", { body: { text: "Insta360 Ace Pro 2" } });
    expect(data.questions[0]?.prompt).toBe("Is the bundle right?");
    expect(data.candidates[0]?.variantLine).toBe("Gen 2 · Standard bundle · Black");
  });

  it("identify a pasted store link: the user's own platform, seller and price (design case A)", async () => {
    const { data } = await api.call("identify", { body: { link: "https://www.hepsiburada.com/insta360-ace-pro-2-flash-print-bundle-p-HBC00007K2P9" } });
    expect(data.link).toEqual({ platformId: PLATFORMS.HEPSIBURADA.id, platformName: "Hepsiburada", sellerName: "Kamera Dünyası", pricePaid });
    expect(data.candidates[0]?.product.id).toBe(product.id);
  });

  it("product, similar products and a placeholder image", async () => {
    const { data } = await api.call("getProduct", { params: { id: product.id } });
    expect(data.title).toBe("Insta360 Ace Pro 2 Flash Print Bundle");
    const similar = await api.call("getSimilarProducts", { params: { id: product.id } });
    expect(similar.data.items.map((item) => item.difference)).toEqual(["GENERATION", "BUNDLE", "BUNDLE", "ACCESSORY"]);
    const image = await fetch(`http://mock.test/api/v1/img/${data.images[0]}/CARD_480`);
    expect(image.headers.get("content-type")).toBe("image/svg+xml");
  });
});

describe("uploads", () => {
  it("presign → upload → complete → upload.ready → extraction without personal data", async () => {
    const presign = await api.call("presignUploads", { body: { purpose: "ORDER_SCREENSHOT", files: [{ mime: "image/png", bytes: 120_000 }] } });
    const target = presign.data.uploads[0];
    if (!target) throw new Error("no upload");
    expect((await fetch(target.uploadUrl, { method: "PUT", body: "png" })).status).toBe(200);
    await api.call("completeUploads", { body: { batchId: presign.data.batchId } });
    expect(controller.state.streamLog.at(-1)?.event).toEqual({ type: "upload.ready", data: { uploadId: target.uploadId, batchId: presign.data.batchId } });

    const { data } = await api.call("getUpload", { params: { id: target.uploadId } });
    expect(data.status).toBe("READY");
    expect(data.extracted).toEqual({ productText: "Insta360 Ace Pro 2 · Flash Print", sellerName: "Kamera Dünyası", platformName: "Hepsiburada", pricePaid, orderedOn: "2026-11-08" });

    const identified = await api.call("identify", { body: { uploadIds: [target.uploadId] } });
    expect(identified.data.candidates[0]?.product.id).toBe(product.id);
  });

  it("refuses more files than the setting allows", async () => {
    const files = Array.from({ length: 6 }, () => ({ mime: "image/jpeg" as const, bytes: 1 }));
    expect((await failure(api.call("presignUploads", { body: { purpose: "IDENTIFY", files } }))).body.code).toBe("VALIDATION");
  });

  it("another user cannot read the upload", async () => {
    const presign = await api.call("presignUploads", { body: { purpose: "IDENTIFY", files: [{ mime: "image/jpeg", bytes: 10 }] } });
    t.signInAs("secondUser");
    const id = presign.data.uploads[0]?.uploadId ?? "";
    expect((await failure(api.call("getUpload", { params: { id } }))).body.code).toBe("NOT_FOUND");
  });
});

describe("confirm, teaser and tracking", () => {
  it("confirm context: platforms with return rules, target hints and allowances", async () => {
    const { data, meta } = await api.call("getConfirmContext", { params: { id: product.id } });
    expect(data.platforms.map((platform) => platform.name)).toContain("Hepsiburada");
    expect(data.targetHints.lowest30Days).toEqual({ amount: 2_490_000, currency: "TRY" });
    expect(meta?.entitlements?.tracking.limit).toBe(10);
  });

  it("guests are sent to sign-in for the confirm step (design case F)", async () => {
    t.signInAs("guest");
    expect((await failure(api.call("getConfirmContext", { params: { id: product.id } }))).body.code).toBe("UNAUTHENTICATED");
  });

  it("seller lookup finds only an exact name on the chosen platform", async () => {
    const own = await lookupOwnSeller();
    expect(own).toMatchObject({ sellerName: "Kamera Dünyası", sellerRating: 4.7, stockState: "IN_STOCK", warrantyType: "DISTRIBUTOR" });
    const partial = await api.call("sellerLookup", { params: { id: product.id }, body: { platformId: PLATFORMS.HEPSIBURADA.id, name: "Kamera" } });
    expect(partial.data.match).toBeNull();
  });

  it("teaser: two cheaper sellers by rank, saving with shipping (design: 3.002 TL and 1.750 TL)", async () => {
    const own = await lookupOwnSeller();
    const { data } = await api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: own.sellerRef } });
    expect(data.offers.map((offer) => [offer.rank, offer.price.amount, offer.saving?.amount])).toEqual([
      [1, 2_599_700, 300_200],
      [2, 2_719_900, 175_000],
    ]);
    expect(data.summary).toMatchObject({ cheaperCount: 2, maxSaving: { amount: 300_200, currency: "TRY" } });
  });

  it("“Diğer” platform: typed platform and seller, no seller check; the return last day only from the user (none = unknown)", async () => {
    const base = {
      mode: "BOUGHT", productId: product.id, identifyRequestId: null, platformId: null, otherPlatformName: "Mahalle Kamera", sellerName: "Ali Usta", sellerRef: null,
      pricePaid, pricePaidSource: "USER_TYPED", orderedOn: "2026-11-08", orderStatus: "DELIVERED", returnDeadline: null,
    } as const;
    const { data } = await api.call("createTrackedItem", { body: base, idempotencyKey: "other-1" });
    expect(data).toMatchObject({ mode: "BOUGHT", returnDeadline: null, returnDeadlineStatus: null });
    expect(controller.state.trackedItems.at(-1)).toMatchObject({ platform: null, otherPlatformName: "Mahalle Kamera", sellerName: "Ali Usta", sellerOfferId: null });
    expect(controller.state.trackedItemEvents.at(-1)?.data).toMatchObject({ otherPlatformName: "Mahalle Kamera" });
    expect(controller.state.activity.at(-1)?.metadata).toMatchObject({ otherPlatform: true });

    // Neither a known platform nor a typed one, both, or a seller ref on a typed platform → rejected by the contract.
    for (const body of [{ ...base, otherPlatformName: null }, { ...base, platformId: PLATFORMS.HEPSIBURADA.id }, { ...base, sellerRef: "ref_x" }]) {
      expect(CreateTrackedItemRequest.safeParse(body).success).toBe(false);
    }
    // A typed seller belongs to a typed platform only.
    expect(CreateTrackedItemRequest.safeParse({ ...base, platformId: PLATFORMS.HEPSIBURADA.id, otherPlatformName: null }).success).toBe(false);

    // This product is tracked once per mode; the next test starts it again.
    controller.state.trackedItems.splice(controller.state.trackedItems.findIndex((item) => item.id === data.id), 1);
  });

  it("creates a BOUGHT tracking with an estimated last return day, once", async () => {
    const own = await lookupOwnSeller();
    const body = {
      mode: "BOUGHT", productId: product.id, identifyRequestId: null, platformId: PLATFORMS.HEPSIBURADA.id, sellerRef: own.sellerRef,
      pricePaid, pricePaidSource: "USER_TYPED", orderedOn: "2026-11-08", orderStatus: "ORDERED", returnDeadline: null,
    } as const;
    const { data } = await api.call("createTrackedItem", { body, idempotencyKey: "confirm-1" });
    expect(data).toMatchObject({ mode: "BOUGHT", state: "ACTIVE", returnDeadline: "2026-11-24", returnDeadlineStatus: "ESTIMATED" });

    // Same Idempotency-Key → same answer, no second row.
    const replay = await api.call("createTrackedItem", { body, idempotencyKey: "confirm-1" });
    expect(replay.data.id).toBe(data.id);
    // New attempt for the same product and mode → "Zaten takip ediyorsun" (design case G).
    expect((await failure(api.call("createTrackedItem", { body, idempotencyKey: "confirm-2" }))).body.code).toBe("ALREADY_TRACKING");

    const context = await api.call("getConfirmContext", { params: { id: product.id } });
    expect(context.data.alreadyTracking.map((item) => item.trackedItemId)).toEqual([data.id]);
    expect(controller.state.trackedItemEvents.filter((event) => event.trackedItemId === data.id).map((event) => event.type)).toEqual(["CREATED"]);
  });

  it("creates a WANT tracking with a duration", async () => {
    const { data } = await api.call("createTrackedItem", {
      body: { mode: "WANT", productId: PRODUCTS.dysonV15.id, identifyRequestId: null, targetPrice: null, trackingDuration: "1M" },
    });
    expect(data).toMatchObject({ mode: "WANT", returnDeadline: null, trackingEndsAt: "2026-12-14T09:00:00.000Z" });
  });

  it("stops at the plan's tracking limit (design case I)", async () => {
    t.signInAs("secondUser");
    const keys = Object.values(PRODUCTS).filter((item) => item.id !== product.id).slice(0, 10);
    for (const item of keys) {
      await api.call("createTrackedItem", { body: { mode: "WANT", productId: item.id, identifyRequestId: null, targetPrice: null, trackingDuration: "UNLIMITED" } });
    }
    const error = await failure(api.call("createTrackedItem", { body: { mode: "WANT", productId: product.id, identifyRequestId: null, targetPrice: null, trackingDuration: "UNLIMITED" } }));
    expect(error.body).toEqual({ code: "LIMIT_REACHED", messageKey: "errors.limitReached", params: { limit: 10 } });
  });
});

describe("reveal gate", () => {
  async function teaserRefs() {
    const { data } = await api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: null } });
    return data.offers.map((offer) => offer.ref);
  }

  it("reveal → identity with expiry and FREE_TOGGLE; hide; go", async () => {
    const [ref = ""] = await teaserRefs();
    expect((await failure(api.call("goToOffer", { params: { ref } }))).body.code).toBe("FORBIDDEN");

    const { data } = await api.call("revealOffer", { params: { ref } });
    if (!data.allowed) throw new Error("reveal refused");
    expect(data.offer).toMatchObject({ rank: 1, sellerName: "Aksiyon Market", platformName: "Trendyol", gateUsed: "FREE_TOGGLE", revealExpiresAt: "2026-11-21T09:00:00.000Z" });

    const go = await api.call("goToOffer", { params: { ref } });
    expect(go.data).toEqual({ status: "OK", url: data.offer.listingUrl });

    const hidden = await api.call("hideOffer", { params: { ref } });
    expect(hidden.data.offer).not.toHaveProperty("sellerName");
    expect(controller.state.reveals.slice(-2).map((row) => row.action)).toEqual(["REVEAL", "HIDE"]);
  });

  it("the Application Manager reveals with gate ADMIN and an audit row", async () => {
    t.signInAs("manager");
    const [ref = ""] = await teaserRefs();
    const { data } = await api.call("revealOffer", { params: { ref } });
    expect(data.allowed && data.offer.gateUsed).toBe("ADMIN");
    expect(controller.state.auditLogs.at(-1)).toMatchObject({ action: "offer.reveal", containsHiddenSeller: true });
  });
});

describe("scenarios (five states)", () => {
  it("error → INTERNAL envelope", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    const error = await failure(api.call("autocomplete", { query: { q: "dyson" } }));
    expect(error.status).toBe(500);
    expect(error.body.messageKey).toBe("errors.internal");
  });

  it("empty → empty lists", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    expect((await api.call("autocomplete", { query: { q: "dyson" } })).data.items).toEqual([]);
    expect((await api.call("getSearchHistory", {})).data.items).toEqual([]);
  });

  it("stale → checks older than tracking.stale_hours", async () => {
    controller.config = { ...controller.config, scenario: "stale" };
    const { data } = await api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: null } });
    const ageHours = (Date.parse("2026-11-14T09:00:00.000Z") - Date.parse(data.summary.lastCheckedAt ?? "")) / 3_600_000;
    expect(ageHours).toBeGreaterThan(6);
  });

  it("loading → the request does not finish", async () => {
    controller.config = { ...controller.config, scenario: "loading" };
    const abort = new AbortController();
    const pending = api.call("autocomplete", { query: { q: "dyson" }, signal: abort.signal });
    const winner = await Promise.race([pending.then(() => "answered", () => "failed"), new Promise((resolve) => setTimeout(() => resolve("pending"), 50))]);
    abort.abort();
    expect(winner).toBe("pending");
  });

  it("session endpoints keep working in every scenario", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    expect((await api.call("getMe", {})).data.displayName).toBe("Sena B.");
  });
});

describe("action logging (database.md §14a)", () => {
  it("every activity row matches the activity_events shape", () => {
    expect(controller.state.activity.length).toBeGreaterThan(0);
    for (const row of controller.state.activity) expect(() => ActivityEvent.parse(row)).not.toThrow();
  });

  it("writes the action and outcome of each call, refusals included", async () => {
    const before = controller.state.activity.length;
    t.signInAs("guest");
    await failure(api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: null } }));
    await api.call("autocomplete", { query: { q: "dyson" } });
    const rows = controller.state.activity.slice(before);
    expect(rows.map((row) => [row.action, row.outcome, row.userId === null, row.anonId !== null])).toEqual([
      ["teaser", "DENIED", true, true],
      ["search", "OK", true, true],
    ]);
  });

  it("does not store e-mails or phone numbers typed into a search", async () => {
    await api.call("identify", { body: { text: "ali@example.com +90 532 123 45 67 dyson" } });
    expect(controller.state.searchEvents.at(-1)?.queryRaw).toBe("[gizlendi] [gizlendi] dyson");
  });
});
