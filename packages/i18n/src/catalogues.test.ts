import { pluralCategories } from "@firsatgeldi/core";
import { describe, expect, it } from "vitest";
import { tr } from "./catalogues/tr";
import { LOCALES } from "./locales";
import { catalogues } from "./translate";
import type { CatalogueShape, Message, MessageTree } from "./types";

type Entry = [key: string, message: Message];

function entries(tree: MessageTree, prefix = ""): Entry[] {
  return Object.entries(tree).flatMap(([key, value]): Entry[] => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") return [[path, value]];
    if (typeof value.other === "string") return [[path, value as Message]];
    return entries(value as MessageTree, path);
  });
}

const placeholders = (message: Message) =>
  [...new Set((typeof message === "string" ? [message] : Object.values(message)).flatMap((text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])))].sort();

const reference = new Map(entries(catalogues.tr));

describe.each(LOCALES)("catalogue %s", (locale) => {
  const own = new Map(entries(catalogues[locale]));

  it("has exactly the Turkish keys", () => {
    expect([...own.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it("uses the same placeholders as Turkish", () => {
    for (const [key, message] of own) expect(placeholders(message), key).toEqual(placeholders(reference.get(key) ?? ""));
  });

  it("defines every plural category the language needs", () => {
    for (const [key, message] of own) {
      if (typeof message === "string") continue;
      for (const category of pluralCategories(locale)) expect(message[category], `${key}.${category}`).toBeTypeOf("string");
    }
  });

  it("has no empty message", () => {
    for (const [key, message] of own) {
      const texts = typeof message === "string" ? [message] : Object.values(message);
      for (const text of texts) expect(text.trim(), key).not.toBe("");
    }
  });
});

// Compile-time guard: a catalogue with a missing key does not type-check, so
// typecheck, build and CI fail. If this ever stops being an error, tsc fails
// on the unused directive.
// @ts-expect-error — "meta" is missing.
export const missingKey: CatalogueShape<typeof tr> = { app: { name: "" } };
