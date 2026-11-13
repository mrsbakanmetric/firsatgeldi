import { describe, expect, it } from "vitest";
import { buildPath, ENDPOINTS, imagePath } from "./endpoints";
import { HiddenOfferView, REVEALED_ONLY_FIELDS } from "./offers";
import { PERMISSION_KEYS, seedPermissions } from "./permissions";

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
    const publicKeys = new Set(["public.view", "content.view", "catalog.view", "search.use", "identify.use", "upload.own.create", "auth.use", "support.own.create", "consent.own.write"]);
    for (const [, definition] of definitions) {
      if (definition.public) expect(publicKeys).toContain(definition.permission);
    }
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
});

describe("permission seed (database.md §4)", () => {
  it("USER holds every non-admin key; APP_MANAGER holds every key", () => {
    expect(seedPermissions("USER").some((key) => key.startsWith("admin."))).toBe(false);
    expect(seedPermissions("USER")).toContain("reveal.own.use");
    expect(seedPermissions("APP_MANAGER")).toHaveLength(PERMISSION_KEYS.length);
  });
});
