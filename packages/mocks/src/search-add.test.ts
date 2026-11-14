// Mock API pieces added for the Search and Add screen (plan step 10; user
// decisions 2026-11-14): template options on understood attributes, seller
// trust on the lookup, `meta.sourcesMissing`, the upload policy, an order
// screen recognised in an identification photo, bulk add, and the catalogue
// miss that searches the live sources and saves to the catalogue.
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { PLATFORMS, SELLERS } from "./fixtures/market";
import { BASE_URL, createTestApi } from "./test/harness";

const t = createTestApi();
const { api, controller } = t;
const product = PRODUCTS.acePro2FlashPrint;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.useLocale("tr");
  controller.config = { ...controller.config, scenario: "success", photo: "product" };
  controller.state.sellerLookups.clear();
});
afterAll(() => t.server.close());

function lookup(platform: keyof typeof PLATFORMS, name: string) {
  return api.call("sellerLookup", { params: { id: product.id }, body: { platformId: PLATFORMS[platform].id, name } });
}

async function uploadPhoto(): Promise<string> {
  const presign = await api.call("presignUploads", { body: { purpose: "IDENTIFY", files: [{ mime: "image/jpeg", bytes: 1000 }] } });
  const target = presign.data.uploads[0];
  if (!target) throw new Error("no upload");
  await fetch(target.uploadUrl, { method: "PUT", body: "jpeg" });
  await api.call("completeUploads", { body: { batchId: presign.data.batchId } });
  return target.uploadId;
}

describe("understood attributes", () => {
  it.each(["tr", "en"] as const)("carry the category template values and whether they are match-critical (%s)", async (locale) => {
    t.useLocale(locale);
    const { data } = await api.call("identify", { body: { text: "ace pro 2 flash print" } });
    const byKey = Object.fromEntries(data.understood.map((attribute) => [attribute.key, attribute]));
    expect(byKey["model"]?.options).toEqual(expect.arrayContaining(["Ace Pro 2", "Ace Pro"]));
    expect(byKey["model"]?.matchCritical).toBe(true);
    expect(byKey["color"]?.matchCritical).toBe(false);
    for (const attribute of data.understood) expect(attribute.options).toContain(attribute.value);
  });
});

describe("seller trust on the rating tile", () => {
  it("not enough evidence → the store rating against the setting (Kamera Dünyası 4,7 → good)", async () => {
    const { data } = await lookup("HEPSIBURADA", SELLERS.kameraDunyasi.name);
    expect(data.match?.trust).toEqual({ verdict: "INSUFFICIENT", reasonKey: "trust.reason.storeRatingGood" });
  });

  it("low store rating → caution by the fallback (design case J, 3,1)", async () => {
    const { data } = await lookup("TRENDYOL", SELLERS.hizliElektronik.name);
    expect(data.match?.trust).toEqual({ verdict: "INSUFFICIENT", reasonKey: "trust.reason.storeRatingLow" });
  });

  it("FırsatGeldi verdicts pass through with their reason; no data at all → no reason", async () => {
    expect((await lookup("MEDIAMARKT", SELLERS.teknikDukkan.name)).data.match?.trust).toEqual({ verdict: "GOOD", reasonKey: "trust.reason.consistent" });
    expect((await lookup("TEKNOSA", SELLERS.fotoPazari.name)).data.match?.trust).toEqual({ verdict: "CAUTION", reasonKey: "trust.reason.stockOutOften" });
    expect((await lookup("TEKNOSA", SELLERS.yeniDukkan.name)).data.match?.trust).toEqual({ verdict: "INSUFFICIENT", reasonKey: null });
  });

  it("stale scenario: the answer says some stores were not reached", async () => {
    controller.config = { ...controller.config, scenario: "stale" };
    expect((await lookup("HEPSIBURADA", SELLERS.kameraDunyasi.name)).meta?.sourcesMissing).toBe(true);
    const teaser = await api.call("teaser", { params: { id: product.id }, body: { pricePaid: { amount: 2_899_900, currency: "TRY" }, sellerRef: null } });
    expect(teaser.meta?.sourcesMissing).toBe(true);
  });

  it("no flag when every store answered", async () => {
    expect((await lookup("HEPSIBURADA", SELLERS.kameraDunyasi.name)).meta?.sourcesMissing).toBeUndefined();
  });
});

describe("upload policy", () => {
  it("identification photos: 5 files, 10 MB, kept 24 hours — open to guests, no activity row", async () => {
    t.signInAs("guest");
    const before = controller.state.activity.length;
    const { data } = await api.call("getUploadPolicy", { query: { purpose: "IDENTIFY" } });
    expect(data).toMatchObject({ maxFiles: 5, maxBytes: 10 * 1024 * 1024, retention: { amount: 24, unit: "HOURS" } });
    expect(data.acceptedTypes).toEqual(["image/jpeg", "image/png", "image/webp", "image/heic"]);
    expect(controller.state.activity.length).toBe(before);
  });

  it("support screenshots: 3 files, kept 30 days", async () => {
    const { data } = await api.call("getUploadPolicy", { query: { purpose: "SUPPORT_ATTACHMENT" } });
    expect(data).toMatchObject({ maxFiles: 3, retention: { amount: 30, unit: "DAYS" } });
  });

  it("an unknown purpose is refused by the server (VALIDATION)", async () => {
    // The typed client refuses it before sending; the server checks it again.
    const response = await fetch(`${BASE_URL}/api/v1/uploads/policy?purpose=X`);
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("VALIDATION");
  });
});

describe("photos", () => {
  it("an order screen sent as IDENTIFY is recognised: product, seller, price and date only", async () => {
    controller.config = { ...controller.config, photo: "order" };
    const id = await uploadPhoto();
    const { data } = await api.call("getUpload", { params: { id } });
    expect(data.purpose).toBe("IDENTIFY");
    expect(data.extracted).toMatchObject({ sellerName: "Kamera Dünyası", platformName: "Hepsiburada", pricePaid: { amount: 2_899_900, currency: "TRY" } });
  });

  it("a product photo has nothing to extract", async () => {
    const id = await uploadPhoto();
    expect((await api.call("getUpload", { params: { id } })).data.extracted).toBeNull();
  });

  it.each(["tr", "en"] as const)("one screen with three products → three items in the drawn order (%s)", async (locale) => {
    t.useLocale(locale);
    controller.config = { ...controller.config, photo: "bulk" };
    const id = await uploadPhoto();
    const { data } = await api.call("identify", { body: { uploadIds: [id] } });
    expect(data.items.map((item) => item.candidates[0]?.product.id)).toEqual([PRODUCTS.acePro2FlashPrint.id, PRODUCTS.wh1000xm5.id, PRODUCTS.iphone16Case.id]);
    expect(data.items[1]?.label).toBe(locale === "tr" ? "Kulak üstü kablosuz kulaklık" : "Over-ear wireless headphones");
  });
});

describe("catalogue miss → search stores (architecture.md §11)", () => {
  it("autocomplete does not know the product; identify finds it live, saves it, and autocomplete then offers it", async () => {
    expect((await api.call("autocomplete", { query: { q: "sony zv-e1 kit" } })).data.items).toEqual([]);
    const { data } = await api.call("identify", { body: { text: "sony zv-e1 kit" } });
    expect(data.candidates.map((candidate) => candidate.product.id)).toEqual([PRODUCTS.zvE1Kit.id]);
    expect(controller.state.activity.at(-1)?.metadata).toMatchObject({ source: "SEARCH_BOX", savedFromLiveSources: 1 });
    expect(controller.state.searchEvents.at(-1)?.source).toBe("SEARCH_BOX");
    expect((await api.call("autocomplete", { query: { q: "sony zv-e1 kit" } })).data.items.map((item) => item.id)).toEqual([PRODUCTS.zvE1Kit.id]);
  });

  it("guests may search the stores too", async () => {
    t.signInAs("guest");
    expect((await api.call("identify", { body: { text: "sony zv-e1" } })).data.candidates.length).toBeGreaterThan(0);
  });
});
