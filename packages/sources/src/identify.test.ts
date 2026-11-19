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
  STORE_NOTES,
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

  it("writes the product name from brand, model and the variants the link carries (Trendyol, Teknosa, MediaMarkt)", () => {
    const answer = (colour: string) =>
      JSON.stringify({ category: "phone", brand: "Apple", model: "iPhone 18 Pro Max", fields: [{ key: "colour", value: colour }, { key: "storage", value: "512 GB" }], confidence: "HIGH" });
    const names = [
      ["https://www.trendyol.com/apple/iphone-18-pro-max-512gb-burgundy-p-1198082362?boutiqueId=691662&merchantId=968", "burgundy"],
      ["https://www.teknosa.com/apple-iphone-18-pro-max-512gb-burgonya-akilli-telefon-p-100000065177", "Burgundy"],
      ["https://www.mediamarkt.com.tr/tr/product/_apple-mjxv4tua-iphone-18-pro-max-512-gb-akilli-telefon-bordo-1256778.html", "bordo"],
    ].map(([link, colour]) => readIdentifyAnswer(reading(link ?? ""), answer(colour ?? "")).name);
    // Trendyol's name is the link's title (the model gave none here, so the link words as they are).
    expect(names).toEqual(["Apple Iphone 18 Pro Max 512gb Burgundy", "Apple iPhone 18 Pro Max 512 GB Burgundy", "Apple iPhone 18 Pro Max 512 GB Bordo"]);
  });

  it("keeps knowledge out of the name and does not repeat the brand (stores without a title in the link)", () => {
    const teknosa = reading("https://www.teknosa.com/apple-iphone-18-pro-max-512gb-burgonya-akilli-telefon-p-100000065177");
    const knowledge = JSON.stringify({ category: "phone", brand: "Apple", model: "iPhone 18 Pro Max", fields: [{ key: "storage", value: "1 TB" }], confidence: "HIGH" });
    expect(readIdentifyAnswer(teknosa, knowledge).name).toBe("Apple iPhone 18 Pro Max");
    const repeated = JSON.stringify({ category: "phone", brand: "Apple", model: "Apple iPhone", fields: [], confidence: "LOW" });
    expect(readIdentifyAnswer(teknosa, repeated).name).toBe("Apple iPhone");
  });

  it("Trendyol boot: a stock code given as the model is not also the size; the name reads as shoppers write it", () => {
    const boot = reading("https://www.trendyol.com/riccon/siyah-cilt-kadin-cizme-0012360-p-135941803?boutiqueId=61&merchantId=180000");
    const identity = readIdentifyAnswer(
      boot,
      JSON.stringify({
        category: "shoes",
        brand: "riccon",
        model: "0012360",
        fields: [
          { key: "type", value: "Çizme" },
          { key: "gender", value: "Kadın" },
          { key: "colour", value: "Siyah" },
          { key: "size", value: "0012360" },
        ],
        confidence: "HIGH",
      }),
    );
    expect(identity.dropped).toEqual([{ key: "size", value: "0012360", reason: "VALUE_REUSED" }]);
    expect(identity.name).toBe("Riccon Siyah Cilt Kadin Cizme");
    expect(boot.attributes.generation).toBeNull();
  });

  it("Trendyol: the name is the brand and the title the link carries, with Turkish letters restored", () => {
    const tights = reading("https://www.trendyol.com/katia-bony/ici-havlu-cocuk-tayt-antrasit-p-797541984?boutiqueId=61&merchantId=4227");
    const answer = (title: string) =>
      JSON.stringify({ category: "clothing", brand: "Katia Bony", model: null, fields: [{ key: "type", value: "tayt" }], title, confidence: "HIGH" });
    expect(readIdentifyAnswer(tights, answer("İçi Havlu Çocuk Tayt Antrasit"))).toMatchObject({ name: "Katia Bony İçi Havlu Çocuk Tayt Antrasit", stockCode: null });

    const boot = reading("https://www.trendyol.com/riccon/siyah-cilt-kadin-cizme-0012360-p-135941803?boutiqueId=61&merchantId=180000");
    const bootAnswer = JSON.stringify({ category: "shoes", brand: "riccon", model: null, fields: [], title: "Siyah Cilt Kadın Çizme", confidence: "HIGH" });
    expect(readIdentifyAnswer(boot, bootAnswer)).toMatchObject({ name: "Riccon Siyah Cilt Kadın Çizme", stockCode: "0012360" });

    const iphone = reading("https://www.trendyol.com/apple/iphone-18-pro-max-512gb-burgundy-p-1198082362?boutiqueId=691662&merchantId=968");
    const iphoneAnswer = JSON.stringify({ category: "phone", brand: "Apple", model: "iPhone 18 Pro Max", fields: [], title: "iPhone 18 Pro Max 512GB Burgundy", confidence: "HIGH" });
    expect(readIdentifyAnswer(iphone, iphoneAnswer).name).toBe("Apple iPhone 18 Pro Max 512GB Burgundy");
  });

  it("Trendyol: codes at the end are one stock code; a title that kept it is still used; 'Regular Fit' is the fit, not the size", () => {
    const shirt = reading("https://www.trendyol.com/pierre-cardin/beyaz-regular-fit-basic-tisort-50333999-vr013-p-1196828079?merchantId=150370&boutiqueId=61");
    const identity = readIdentifyAnswer(
      shirt,
      JSON.stringify({
        category: "clothing",
        brand: "Pierre Cardin",
        model: null,
        fields: [
          { key: "colour", value: "Beyaz" },
          { key: "fit", value: "Regular Fit" },
        ],
        title: "Beyaz Regular Fit Basic Tişört 50333999",
        confidence: "HIGH",
      }),
    );
    expect(identity).toMatchObject({ name: "Pierre Cardin Beyaz Regular Fit Basic Tişört", stockCode: "50333999", dropped: [] });
    expect(identity.fields.map(({ key, source }) => `${key}:${source}`)).toEqual(["colour:LINK", "fit:LINK"]);
    const boot = reading("https://www.trendyol.com/riccon/siyah-cilt-kadin-cizme-0012360-p-135941803");
    expect(readIdentifyAnswer(boot, JSON.stringify({ category: "shoes", brand: null, model: null, fields: [], title: null, confidence: "LOW" })).stockCode).toBe("0012360");
  });

  it("Trendyol: a title the model changed is not used; the link words are", () => {
    const tights = reading("https://www.trendyol.com/katia-bony/ici-havlu-cocuk-tayt-antrasit-p-797541984");
    const identity = readIdentifyAnswer(
      tights,
      JSON.stringify({ category: "clothing", brand: "Katia Bony", model: null, fields: [], title: "İçi Havlu Kız Çocuk Tayt Antrasit", confidence: "HIGH" }),
    );
    expect(identity.name).toBe("Katia Bony Ici Havlu Cocuk Tayt Antrasit");
    expect(identity.dropped).toEqual([{ key: "title", value: "İçi Havlu Kız Çocuk Tayt Antrasit", reason: "TITLE_CHANGED" }]);
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
    for (const category of CATEGORIES) expect(IDENTIFY_SYSTEM_PROMPT).toContain(`- ${category.key} (${category.name.tr}):`);
    expect(identifyUserPrompt(AIRPODS)).toBe(
      ["Store: TRENDYOL", "Store notes:", ...(STORE_NOTES.TRENDYOL ?? []).map((note) => `- ${note}`), "Brand from the link: apple", "Name words: airpods pro 3", "Model code: none"].join("\n"),
    );
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
