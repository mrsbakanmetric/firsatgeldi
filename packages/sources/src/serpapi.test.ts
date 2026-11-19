import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKey, createSerpApiClient, SerpApiBudgetError, SerpApiError } from "./serpapi.ts";

const KEY = "test-key-123";
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "serpapi-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function fakeFetch(body: string, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(body, { status }));
}

describe("SerpApi client — never a real search in tests", () => {
  it("spends one search, saves the answer and reuses it for free", async () => {
    const fetch = fakeFetch(JSON.stringify({ shopping_results: [] }));
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch });
    expect((await client.googleShopping("asics 1042A237-101")).fromCache).toBe(false);
    expect((await client.googleShopping("asics 1042A237-101")).fromCache).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.spent()).toBe(1);
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ engine: "google_shopping", gl: "tr", hl: "tr", q: "asics 1042A237-101", api_key: KEY });
  });

  it("reads a product page by its token under the same cap, saved like a search", async () => {
    const fetch = fakeFetch(JSON.stringify({ product_results: {} }));
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch });
    expect((await client.googleProduct("token-1")).fromCache).toBe(false);
    expect((await client.googleProduct("token-1")).fromCache).toBe(true);
    await expect(client.googleShopping("next")).rejects.toBeInstanceOf(SerpApiBudgetError);
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ engine: "google_immersive_product", gl: "tr", hl: "tr", page_token: "token-1" });
  });

  it("searches the web under the same cap, saved like a search", async () => {
    const fetch = fakeFetch(JSON.stringify({ organic_results: [] }));
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch });
    expect((await client.googleWeb("ring light")).fromCache).toBe(false);
    expect((await client.googleWeb("ring light")).fromCache).toBe(true);
    const url = new URL(String(fetch.mock.calls[0]?.[0]));
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ engine: "google", gl: "tr", hl: "tr", q: "ring light" });
  });

  it("stops before sending when the run's cap is used up", async () => {
    const fetch = fakeFetch("{}");
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch });
    await client.googleShopping("first");
    await expect(client.googleShopping("second")).rejects.toBeInstanceOf(SerpApiBudgetError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("spends nothing with a cap of zero", async () => {
    const fetch = fakeFetch("{}");
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 0, cacheDir: dir, fetch });
    await expect(client.googleShopping("any")).rejects.toBeInstanceOf(SerpApiBudgetError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never writes the key into a saved answer", async () => {
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch: fakeFetch(JSON.stringify({ echo: `api_key=${KEY}` })) });
    await client.googleShopping("q");
    const [file] = await readdir(dir);
    const saved = await readFile(join(dir, file ?? ""), "utf8");
    expect(saved).not.toContain(KEY);
    expect(saved).toContain("[REDACTED]");
  });

  it("saves nothing on an error answer and keeps the key out of the message", async () => {
    const client = createSerpApiClient({ apiKey: KEY, maxQueries: 1, cacheDir: dir, fetch: fakeFetch(`bad key ${KEY}`, 401) });
    const failure = await client.googleShopping("q").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(SerpApiError);
    expect(String((failure as Error).message)).not.toContain(KEY);
    await expect(readdir(dir)).resolves.toEqual([]);
  });

  it("names a saved answer by its parameters, in any order, never by the key", () => {
    expect(cacheKey({ q: "a", gl: "tr" })).toBe(cacheKey({ gl: "tr", q: "a" }));
    expect(cacheKey({ q: "a" })).not.toBe(cacheKey({ q: "b" }));
  });
});
