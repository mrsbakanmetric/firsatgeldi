// Hidden-seller leak test on the mock responses (architecture.md §6.5;
// CLAUDE.md product rule 3): before "Göster" no response body, error message,
// image URL or live-update event carries a cheaper seller's identity — seller
// name, seller or offer id, external id, platform name/code/domain or listing URL.
import { ApiError, ENDPOINTS, type EndpointName, HiddenOfferView, imagePath } from "@firsatgeldi/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { listingUrl, OFFERS, PLATFORMS, SELLERS, type SellerKey } from "./fixtures/market";
import { USERS } from "./fixtures/users";
import { createTestApi, NOW } from "./test/harness";
import { fullOffer } from "./views";

const t = createTestApi();
const { api, controller } = t;
const product = PRODUCTS.acePro2FlashPrint;
const pricePaid = { amount: 2_899_900, currency: "TRY" } as const;
const OWN_SELLER: SellerKey = "kameraDunyasi";

/** One captured answer: which endpoint, the raw text, and whether it may carry offers. */
interface Capture {
  readonly source: string;
  readonly text: string;
  /** Platform names are only secret where offers appear (the confirm step lists all platforms to pick from). */
  readonly offerChannel: boolean;
}

const captures: Capture[] = [];
const called = new Set<EndpointName>();

/** Every offer except the user's own: its identity must stay hidden. */
const hiddenOffers = OFFERS.filter((offer) => offer.product === "acePro2FlashPrint" && offer.seller !== OWN_SELLER);
const identitySecrets = hiddenOffers.flatMap((offer) => {
  const seller = SELLERS[offer.seller];
  return [seller.name, seller.id, seller.externalId, offer.id, listingUrl(offer)];
});
const platformSecrets = [...new Set(hiddenOffers.map((offer) => SELLERS[offer.seller].platform))].flatMap((key) => {
  const platform = PLATFORMS[key];
  return [platform.name, platform.code, platform.domain, platform.id];
});

/** Calls through the real typed client and keeps the raw JSON, errors included. */
async function capture<N extends EndpointName>(name: N, run: () => Promise<unknown>): Promise<unknown> {
  called.add(name);
  const offerChannel = ENDPOINTS[name].returnsOffers;
  try {
    const result = await run();
    captures.push({ source: name, text: JSON.stringify(result), offerChannel });
    collectImages(result);
    return result;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    // Error envelopes are scanned like any other answer.
    captures.push({ source: `${name} (error)`, text: JSON.stringify(error.body), offerChannel: true });
    return undefined;
  }
}

/** Image URLs built from every content address in a response. */
function collectImages(value: unknown) {
  const text = JSON.stringify(value);
  for (const match of text.matchAll(/"imageSha256":"([0-9a-f]{64})"|"images":\[([^\]]*)\]/g)) {
    const shas = match[1] ? [match[1]] : (match[2] ?? "").split(",").map((item) => item.replace(/"/g, "")).filter(Boolean);
    for (const sha of shas) captures.push({ source: "image URL", text: imagePath(sha, "CARD_480"), offerChannel: true });
  }
}

function leaks(scan: readonly Capture[]): string[] {
  const found: string[] = [];
  for (const item of scan) {
    for (const secret of identitySecrets) if (item.text.includes(secret)) found.push(`${item.source}: ${secret}`);
    if (item.offerChannel) for (const secret of platformSecrets) if (item.text.includes(secret)) found.push(`${item.source}: ${secret}`);
  }
  return found;
}

let teaserRefs: string[] = [];
let ownRef = "";

beforeAll(async () => {
  t.server.listen({ onUnhandledFrame: "error" });
  t.signInAs("user");

  // The whole Search and Add flow, before any "Göster".
  for (const locale of ["tr", "en"] as const) {
    t.useLocale(locale);
    await capture("getMe", () => api.call("getMe", {}));
    await capture("getEntitlements", () => api.call("getEntitlements", {}));
    await capture("getSearchHistory", () => api.call("getSearchHistory", {}));
    await capture("autocomplete", () => api.call("autocomplete", { query: { q: "insta360" } }));
    await capture("identify", () => api.call("identify", { body: { text: "Insta360 Ace Pro 2" } }));
    await capture("identify", () => api.call("identify", { body: { link: "https://www.hepsiburada.com/insta360-ace-pro-2-flash-print-bundle-p-HBC00007K2P9" } }));
    await capture("getProduct", () => api.call("getProduct", { params: { id: product.id } }));
    await capture("getSimilarProducts", () => api.call("getSimilarProducts", { params: { id: product.id } }));
    await capture("getConfirmContext", () => api.call("getConfirmContext", { params: { id: product.id } }));
  }
  const identified = (await api.call("identify", { body: { text: "Insta360 Ace Pro 2" } })).data;
  await capture("answerIdentify", () => api.call("answerIdentify", { params: { requestId: identified.requestId }, body: { questionId: "bundle", optionId: product.key } }));

  // Upload flow: SSE events are captured in the state's stream log.
  const presign = (await capture("presignUploads", () =>
    api.call("presignUploads", { body: { purpose: "ORDER_SCREENSHOT", files: [{ mime: "image/png", bytes: 1000 }] } }),
  )) as Awaited<ReturnType<typeof api.call<"presignUploads">>>;
  const upload = presign.data.uploads[0];
  if (!upload) throw new Error("no upload");
  await fetch(upload.uploadUrl, { method: "PUT", body: "x" });
  await capture("completeUploads", () => api.call("completeUploads", { body: { batchId: presign.data.batchId } }));
  await capture("getUpload", () => api.call("getUpload", { params: { id: upload.uploadId } }));

  const lookup = (await capture("sellerLookup", () =>
    api.call("sellerLookup", { params: { id: product.id }, body: { platformId: PLATFORMS.HEPSIBURADA.id, name: SELLERS[OWN_SELLER].name } }),
  )) as Awaited<ReturnType<typeof api.call<"sellerLookup">>>;
  ownRef = lookup.data.match?.sellerRef ?? "";

  const teaser = (await capture("teaser", () => api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: ownRef } }))) as Awaited<
    ReturnType<typeof api.call<"teaser">>
  >;
  teaserRefs = teaser.data.offers.map((offer) => offer.ref);

  await capture("createTrackedItem", () =>
    api.call("createTrackedItem", {
      body: {
        mode: "BOUGHT", productId: product.id, identifyRequestId: null, platformId: PLATFORMS.HEPSIBURADA.id, sellerRef: ownRef,
        pricePaid, pricePaidSource: "USER_TYPED", orderedOn: "2026-11-08", orderStatus: "ORDERED", returnDeadline: null,
      },
    }),
  );
  // Hide and go before a reveal: the answers (and errors) must not name the seller.
  await capture("hideOffer", () => api.call("hideOffer", { params: { ref: teaserRefs[1] ?? "" } }));
  await capture("goToOffer", () => api.call("goToOffer", { params: { ref: teaserRefs[0] ?? "" } }));
  // The user's own seller ref can never be revealed.
  await capture("revealOffer", () => api.call("revealOffer", { params: { ref: ownRef } }));
});

afterAll(() => t.server.close());

describe("hidden-seller rule — before Göster", () => {
  it("the scanner catches an unshaped server-side offer (the test is not vacuous)", () => {
    const [offer] = hiddenOffers;
    if (!offer) throw new Error("no hidden offer");
    const raw = fullOffer({ now: NOW, checkedAt: () => NOW.toISOString() }, offer, "ref-ref-ref-ref-ref", 1, pricePaid.amount);
    expect(leaks([{ source: "unshaped", text: JSON.stringify(raw), offerChannel: true }]).length).toBeGreaterThan(0);
    // The contract view removes exactly those fields.
    expect(leaks([{ source: "shaped", text: JSON.stringify(HiddenOfferView.parse(raw)), offerChannel: true }])).toEqual([]);
  });

  it("the flow exercised every endpoint that can return offers", () => {
    const offerEndpoints = (Object.keys(ENDPOINTS) as EndpointName[]).filter((name) => ENDPOINTS[name].returnsOffers);
    for (const name of offerEndpoints) expect(called).toContain(name);
  });

  it("the teaser lists the cheaper sellers by rank only", () => {
    expect(teaserRefs).toHaveLength(2);
  });

  it("no response body or error message carries a hidden identity", () => {
    expect(leaks(captures)).toEqual([]);
  });

  it("image URLs carry only a content address and a variant", () => {
    const images = captures.filter((item) => item.source === "image URL");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image.text).toMatch(/^\/api\/v1\/img\/[0-9a-f]{64}\/[A-Z0-9_]+$/);
  });

  it("live-update events carry no identity", () => {
    const events = controller.state.streamLog.map((entry) => ({ source: `stream ${entry.event.type}`, text: JSON.stringify(entry.event), offerChannel: true }));
    expect(events.length).toBeGreaterThan(0);
    expect(leaks(events)).toEqual([]);
  });

  it("activity rows carry no identity (only ids, flagged contains_hidden_seller where present)", () => {
    const rows = controller.state.activity.map((row) => ({ source: `activity ${row.action}`, text: JSON.stringify({ ...row, targetId: null }), offerChannel: true }));
    expect(leaks(rows)).toEqual([]);
  });
});

describe("hidden-seller rule — after Göster", () => {
  it("reveal names only the revealed seller; later teasers stay hidden", async () => {
    const ref = teaserRefs[0] ?? "";
    const { data } = await api.call("revealOffer", { params: { ref } });
    if (!data.allowed) throw new Error("reveal refused");
    expect(data.offer.sellerName).toBe(SELLERS.aksiyonMarket.name);
    expect(JSON.stringify(data)).not.toContain(SELLERS.lensDeposu.name);

    const again = await api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: ownRef } });
    expect(leaks([{ source: "teaser after reveal", text: JSON.stringify(again), offerChannel: true }])).toEqual([]);
  });

  it("a second user cannot use the first user's refs and sees no identity", async () => {
    t.signInAs("secondUser");
    const answers: Capture[] = [];
    for (const ref of teaserRefs) {
      for (const name of ["revealOffer", "hideOffer", "goToOffer"] as const) {
        const error = await api.call(name, { params: { ref } }).then(
          () => null,
          (caught: unknown) => caught,
        );
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).body.code).toBe("NOT_FOUND");
        answers.push({ source: `${name} as second user`, text: JSON.stringify((error as ApiError).body), offerChannel: true });
      }
    }
    const own = await api.call("teaser", { params: { id: product.id }, body: { pricePaid, sellerRef: null } });
    answers.push({ source: "second user teaser", text: JSON.stringify(own), offerChannel: true });
    expect(leaks(answers)).toEqual([]);
    expect(USERS.secondUser.id).not.toBe(USERS.user.id);
    t.signInAs("user");
  });
});
