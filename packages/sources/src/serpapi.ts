// SerpApi client — link reading path 2 and the `DiscoverySource` (architecture.md §7.1,
// §10.1). The user's plan allows 250 searches a month (implementation_plan.md Appendix A ›
// SerpApi budget): every answer is saved and reused, a run may spend at most
// `maxQueries` searches, and tests never call SerpApi (they read saved answers).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
/** Google Shopping, Turkish results (Appendix A: `engine=google_shopping`, `gl=tr`, `hl=tr`). */
const SHOPPING_PARAMS = { engine: "google_shopping", gl: "tr", hl: "tr", google_domain: "google.com.tr" } as const;
/** Google's product page behind a Shopping result (`immersive_product_page_token`): every field the product carries. */
const PRODUCT_PARAMS = { engine: "google_immersive_product", gl: "tr", hl: "tr", google_domain: "google.com.tr" } as const;
const REQUEST_TIMEOUT_MS = 30_000;

export class SerpApiBudgetError extends Error {
  readonly maxQueries: number;
  constructor(maxQueries: number) {
    super(`SerpApi budget for this run is used up (${maxQueries} searches). Nothing was sent.`);
    this.name = "SerpApiBudgetError";
    this.maxQueries = maxQueries;
  }
}

export class SerpApiError extends Error {
  readonly status: number;
  constructor(status: number, detail: string) {
    super(`SerpApi answered ${status}: ${detail}`);
    this.name = "SerpApiError";
    this.status = status;
  }
}

export interface SerpApiConfig {
  readonly apiKey: string;
  /** Hard cap of live searches for one run; saved answers do not count. */
  readonly maxQueries: number;
  /** Folder of saved answers, one JSON file per search. */
  readonly cacheDir: string;
  readonly fetch?: typeof fetch;
}

export interface SavedAnswer {
  /** True when the answer came from the folder and no search was spent. */
  readonly fromCache: boolean;
  readonly body: unknown;
}

export interface SerpApiClient {
  googleShopping(query: string): Promise<SavedAnswer>;
  /** The product page of one Shopping result, by its `immersive_product_page_token`. */
  googleProduct(pageToken: string): Promise<SavedAnswer>;
  /** Live searches spent in this run. */
  spent(): number;
}

/** File name of a saved answer: the search parameters, never the key. */
export function cacheKey(params: Readonly<Record<string, string>>): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

/** The key must never reach a saved file or a log line. */
function withoutKey(text: string, apiKey: string): string {
  return apiKey ? text.split(apiKey).join("[REDACTED]") : text;
}

export function createSerpApiClient(config: SerpApiConfig): SerpApiClient {
  const fetchFn = config.fetch ?? fetch;
  let spent = 0;

  async function search(params: Readonly<Record<string, string>>): Promise<SavedAnswer> {
    const file = join(config.cacheDir, `${cacheKey(params)}.json`);
    const saved = await readFile(file, "utf8").catch(() => null);
    if (saved !== null) return { fromCache: true, body: JSON.parse(saved) as unknown };

    if (spent >= config.maxQueries) throw new SerpApiBudgetError(config.maxQueries);
    spent += 1;
    const url = new URL(SERPAPI_ENDPOINT);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("api_key", config.apiKey);
    const response = await fetchFn(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const text = withoutKey(await response.text(), config.apiKey);
    if (!response.ok) throw new SerpApiError(response.status, text.slice(0, 300));
    await mkdir(config.cacheDir, { recursive: true });
    await writeFile(file, text);
    return { fromCache: false, body: JSON.parse(text) as unknown };
  }

  return {
    googleShopping: (query) => search({ ...SHOPPING_PARAMS, q: query }),
    googleProduct: (pageToken) => search({ ...PRODUCT_PARAMS, page_token: pageToken }),
    spent: () => spent,
  };
}
