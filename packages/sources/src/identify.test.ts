import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CATEGORIES } from "./categories.ts";
import {
  createLinkIdentifier,
  createOllamaClassifier,
  IDENTIFY_SCHEMA,
  IDENTIFY_SYSTEM_PROMPT,
  IdentifyAnswerError,
  IdentifyBudgetError,
  identifyUserPrompt,
  type ProductClassifier,
  readIdentifyAnswer,
} from "./identify.ts";
import { type LinkTextReading, readLinkText } from "./link-text.ts";

function reading(link: string): LinkTextReading {
  const result = readLinkText(link);
  if (!result.ok) throw new Error(result.reason);
  return result.reading;
}

const AIRPODS = reading("https://www.trendyol.com/apple/airpods-pro-3-p-987974460");
const BOOT = reading("https://www.trendyol.com/derimod/kadin-siyah-deri-bot-38-numara-p-123");

/** The answers the local model gave in the first test (2026-11-19), including its guesses. */
const AIRPODS_ANSWER = JSON.stringify({
  category: "headphones",
  brand: "Apple",
  model: "AirPods Pro 3",
  fields: [
    { key: "type", value: "kulak içi" },
    { key: "connection", value: "kablosuz" },
    { key: "colour", value: "black" },
    { key: "price", value: "1499" },
  ],
  confidence: "HIGH",
});

const fake = (answer: string): ProductClassifier & { calls: number } => {
  const classifier = {
    provider: "fake",
    model: "fake-1",
    calls: 0,
    async complete() {
      classifier.calls += 1;
      return answer;
    },
  };
  return classifier;
};

describe("reading the model's answer", () => {
  it("keeps what the link carries as LINK, facts the model knows as KNOWLEDGE, and drops guessed variants and unlisted fields", () => {
    const identity = readIdentifyAnswer(AIRPODS, AIRPODS_ANSWER);
    expect(identity.category).toEqual({ key: "headphones", name: { tr: "Kulaklık", en: "Headphones" } });
    expect(identity.brand).toEqual({ value: "Apple", source: "LINK" });
    expect(identity.model).toEqual({ value: "AirPods Pro 3", source: "LINK" });
    expect(identity.fields.map(({ key, value, source }) => ({ key, value, source }))).toEqual([
      { key: "type", value: "kulak içi", source: "KNOWLEDGE" },
      { key: "connection", value: "kablosuz", source: "KNOWLEDGE" },
    ]);
    expect(identity.dropped).toEqual([
      { key: "colour", value: "black", reason: "VARIANT_NOT_IN_LINK" },
      { key: "price", value: "1499", reason: "NOT_IN_TEMPLATE" },
    ]);
  });

  it("keeps a variant the link carries, also written differently (Siyah = siyah, kadın = kadin)", () => {
    const identity = readIdentifyAnswer(
      BOOT,
      JSON.stringify({
        category: "shoes",
        brand: "Derimod",
        model: null,
        fields: [
          { key: "type", value: "bot" },
          { key: "gender", value: "kadın" },
          { key: "colour", value: "Siyah" },
          { key: "size", value: "38" },
          { key: "size", value: "39" },
        ],
        confidence: "HIGH",
      }),
    );
    expect(identity.fields.map(({ key, source }) => `${key}:${source}`)).toEqual(["type:LINK", "gender:LINK", "colour:LINK", "size:LINK"]);
    expect(identity.dropped).toEqual([{ key: "size", value: "39", reason: "DUPLICATE" }]);
    expect(identity.model).toBeNull();
  });

  it("keeps a colour the link writes another way (link 'burgonya', model 'Burgundy')", () => {
    const teknosa = reading("https://www.teknosa.com/apple-iphone-18-pro-max-512gb-burgonya-akilli-telefon-p-100000065177");
    const identity = readIdentifyAnswer(
      teknosa,
      JSON.stringify({
        category: "phone",
        brand: "Apple",
        model: "iPhone 18 Pro Max",
        fields: [
          { key: "storage", value: "512 GB" },
          { key: "colour", value: "Burgundy" },
        ],
        confidence: "HIGH",
      }),
    );
    expect(identity.fields.map(({ key, source }) => `${key}:${source}`)).toEqual(["storage:LINK", "colour:LINK"]);
    expect(identity.dropped).toEqual([]);
  });

  it("reads placeholder values ('none', 'Bilinmiyor') as no value", () => {
    const identity = readIdentifyAnswer(
      AIRPODS,
      JSON.stringify({ category: "headphones", brand: "Apple", model: "unknown", fields: [{ key: "colour", value: "none" }, { key: "type", value: "Bilinmiyor" }], confidence: "MEDIUM" }),
    );
    expect(identity).toMatchObject({ model: null, fields: [], dropped: [] });
  });

  it("files an unknown category under 'other' and refuses an answer that is not the schema", () => {
    expect(readIdentifyAnswer(AIRPODS, JSON.stringify({ category: "spaceship", brand: null, model: null, fields: [], confidence: "LOW" })).category.key).toBe("other");
    expect(() => readIdentifyAnswer(AIRPODS, "not json")).toThrow(IdentifyAnswerError);
    expect(() => readIdentifyAnswer(AIRPODS, JSON.stringify({ category: "phone" }))).toThrow(IdentifyAnswerError);
  });
});

describe("prompt and schema", () => {
  it("offers exactly the category list and asks for no field outside it", () => {
    const properties = IDENTIFY_SCHEMA.properties as { category: { enum: string[] } };
    expect(properties.category.enum).toEqual(CATEGORIES.map((category) => category.key));
    for (const category of CATEGORIES) expect(IDENTIFY_SYSTEM_PROMPT).toContain(`- ${category.key}:`);
    expect(identifyUserPrompt(AIRPODS)).toBe("Store: TRENDYOL\nBrand from the link: apple\nName words: airpods pro 3\nModel code: none");
  });
});

describe("saved answers and the call budget", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("calls the model once per input, then reuses the saved answer; stops at the budget", async () => {
    dir = await mkdtemp(join(tmpdir(), "identify-"));
    const classifier = fake(AIRPODS_ANSWER);
    let clock = 1000;
    const identifier = createLinkIdentifier({ classifier, cacheDir: dir, maxCalls: 1, now: () => (clock += 250) });

    const first = await identifier.identify(AIRPODS);
    expect(first).toMatchObject({ fromCache: false, provider: "fake", modelId: "fake-1", durationMs: 250 });
    const again = await identifier.identify(AIRPODS);
    expect(again.fromCache).toBe(true);
    expect(classifier.calls).toBe(1);
    expect(await readdir(dir)).toHaveLength(1);

    await expect(identifier.identify(BOOT)).rejects.toThrow(IdentifyBudgetError);
    expect(identifier.spent()).toBe(1);
  });
});

describe("Ollama classifier", () => {
  it("sends the schema with thinking off and returns the message text", async () => {
    let sent: Record<string, unknown> = {};
    const classifier = createOllamaClassifier({
      model: "qwen3:4b",
      fetch: async (_url, init) => {
        sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({ message: { content: AIRPODS_ANSWER } }));
      },
    });
    expect(await classifier.complete({ system: "s", user: "u", schema: IDENTIFY_SCHEMA })).toBe(AIRPODS_ANSWER);
    expect(sent).toMatchObject({ model: "qwen3:4b", stream: false, think: false, format: IDENTIFY_SCHEMA, options: { temperature: 0 } });
  });

  it("reports a failed call instead of guessing", async () => {
    const classifier = createOllamaClassifier({ model: "qwen3:4b", fetch: async () => new Response("down", { status: 500 }) });
    await expect(classifier.complete({ system: "s", user: "u", schema: IDENTIFY_SCHEMA })).rejects.toThrow(IdentifyAnswerError);
  });
});
