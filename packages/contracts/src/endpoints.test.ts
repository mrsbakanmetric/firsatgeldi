import { describe, expect, it } from "vitest";
import { Email, SignUpRequest } from "./auth";
import { buildPath, ENDPOINTS, imagePath } from "./endpoints";
import { TOP_DROP_ITEM_KEYS, TopDropItem, TopDrops } from "./home";
import { HiddenOfferView, REVEALED_ONLY_FIELDS } from "./offers";
import { PERMISSION_KEYS, seedPermissions } from "./permissions";
import { CreateReportRequest, DetailHiddenOffer, OfferSummary, StockSubject } from "./product-detail";
import { Rating } from "./common";

const definitions = Object.entries(ENDPOINTS);

describe("endpoint registry", () => {
  it("has one entry per method and path", () => {
    const keys = definitions.map(([, definition]) => `${definition.method} ${definition.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(definitions.filter(([, definition]) => definition.method !== "GET"))("%s (write) writes an activity row", (_name, definition) => {
    expect(definition.activity).not.toBeNull();
  });

  it.each(definitions)("%s uses a catalogue permission key", (_name, definition) => {
    expect(PERMISSION_KEYS).toContain(definition.permission);
  });

  it.each(definitions.filter(([, definition]) => definition.kind === "json"))("%s has a response schema", (_name, definition) => {
    expect(definition.response).not.toBeNull();
  });

  it("only keys marked public in database.md §4 are on the guest allow-list", () => {
    const publicKeys = new Set(["public.view", "content.view", "catalog.view", "search.use", "identify.use", "upload.own.create", "upload.own.view", "auth.use", "support.own.create", "consent.own.write"]);
    for (const [, definition] of definitions) {
      if (definition.public) expect(publicKeys).toContain(definition.permission);
    }
  });
});

describe("sign-in endpoints", () => {
  const auth = definitions.filter(([, definition]) => definition.permission === "auth.use");

  it("are signed-out flows on the public allow-list; only sign-out needs a session", () => {
    expect(auth.length).toBeGreaterThan(0);
    for (const [name, definition] of auth) expect(definition.public).toBe(name !== "signOut");
  });

  it("e-mails are trimmed and lower-cased before they are checked", () => {
    expect(Email.parse("  Sena@Ornek.TEST ")).toBe("sena@ornek.test");
    expect(Email.safeParse("sena").success).toBe(false);
  });

  it("sign-up needs the terms ticked", () => {
    const body = { email: "a@b.test", password: "deneme123", termsVersion: "v1", locale: "tr" };
    expect(SignUpRequest.safeParse({ ...body, acceptTerms: false }).success).toBe(false);
    expect(SignUpRequest.safeParse({ ...body, acceptTerms: true }).success).toBe(true);
  });
});

describe("paths", () => {
  it("fills and encodes parameters", () => {
    expect(buildPath("/offers/:ref/reveal", { ref: "a/b" })).toBe("/offers/a%2Fb/reveal");
  });

  it("fails on a missing parameter", () => {
    expect(() => buildPath("/products/:id", {})).toThrow();
  });

  it("image URLs carry only the content address and variant", () => {
    expect(imagePath("a".repeat(64), "CARD_480")).toBe(`/api/v1/img/${"a".repeat(64)}/CARD_480`);
  });
});

describe("hidden-seller views", () => {
  it("HiddenOfferView defines no identity field", () => {
    for (const field of REVEALED_ONLY_FIELDS) expect(Object.keys(HiddenOfferView.shape)).not.toContain(field);
  });

  it("\"Şu an en çok düşenler\" is seller-less: only product, prices, drop, seller count, stock and check time", () => {
    expect(TOP_DROP_ITEM_KEYS).toEqual(["product", "averagePrice", "currentPrice", "dropAmount", "dropPct", "sellerCount", "stockState", "checkedAt"]);
    expect(Object.keys(TopDropItem.shape.product.shape)).toEqual(["id", "name", "imageSha256", "category"]);
    for (const field of [...REVEALED_ONLY_FIELDS, "ref", "sellerId", "offerId"]) {
      expect(TOP_DROP_ITEM_KEYS as string[]).not.toContain(field);
      expect(Object.keys(TopDrops.shape)).not.toContain(field);
    }
  });
});

describe("Product Detail views", () => {
  it("a hidden offer on Product Detail defines no identity field; its summary line names nobody", () => {
    for (const field of REVEALED_ONLY_FIELDS) expect(Object.keys(DetailHiddenOffer.shape)).not.toContain(field);
    expect(Object.keys(OfferSummary.shape)).toEqual(["trust", "installments", "campaign"]);
    // Stock rows refer to a cheaper seller by rank only.
    expect(StockSubject.options.map((option) => Object.keys(option.shape))).toEqual([["kind", "rank"], ["kind"]]);
  });

  it("ratings keep the store's scale and never exceed it", () => {
    expect(Rating.safeParse({ value: 9.4, scale: 10, count: 12_400 }).success).toBe(true);
    expect(Rating.safeParse({ value: 9.4, scale: 5, count: null }).success).toBe(false);
  });

  it("a wrong-price report names an offer by its ref; a different-product report names none", () => {
    const base = { trackedItemId: "00000000-0000-4000-8000-000000000000", note: null };
    expect(CreateReportRequest.safeParse({ ...base, kind: "WRONG_PRICE", offerRef: "abcdefghijklmnopqrst" }).success).toBe(true);
    expect(CreateReportRequest.safeParse({ ...base, kind: "WRONG_PRICE", offerRef: null }).success).toBe(false);
    expect(CreateReportRequest.safeParse({ ...base, kind: "DIFFERENT_PRODUCT", offerRef: "abcdefghijklmnopqrst" }).success).toBe(false);
  });
});

describe("permission seed (database.md §4)", () => {
  it("USER holds every non-admin key; APP_MANAGER holds every key", () => {
    expect(seedPermissions("USER").some((key) => key.startsWith("admin."))).toBe(false);
    expect(seedPermissions("USER")).toContain("reveal.own.use");
    expect(seedPermissions("APP_MANAGER")).toHaveLength(PERMISSION_KEYS.length);
  });
});
