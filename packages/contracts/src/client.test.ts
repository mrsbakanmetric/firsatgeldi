import { http, HttpResponse } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "./client";
import { API_PREFIX } from "./endpoints";
import { errorBody } from "./errors";

const BASE = "http://api.test";
const PRODUCT_ID = "0b6e2b0e-8f3c-4b8f-9f55-6d1e5b2a7c10";
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function client(locale: "tr" | "en" = "tr") {
  return createApiClient({ baseUrl: BASE, platform: "web", locale: () => locale, idempotencyKey: () => "key-1" });
}

const product = {
  id: PRODUCT_ID,
  slug: "insta360-ace-pro-2",
  title: "Insta360 Ace Pro 2",
  variantLine: null,
  category: { id: PRODUCT_ID, name: "Aksiyon kamerası" },
  brand: "Insta360",
  attributes: [],
  images: [],
  storeCount: 9,
};

describe("typed API client", () => {
  it("builds the URL and headers and returns validated data", async () => {
    let seen: Request | undefined;
    server.use(
      http.get(`${BASE}${API_PREFIX}/products/:id`, ({ request }) => {
        seen = request;
        return HttpResponse.json({ data: product });
      }),
    );
    const result = await client("en").call("getProduct", { params: { id: PRODUCT_ID } });
    expect(result.data.title).toBe("Insta360 Ace Pro 2");
    expect(seen?.headers.get("accept-language")).toBe("en");
    expect(seen?.headers.get("x-client-platform")).toBe("web");
    expect(seen?.headers.get("idempotency-key")).toBeNull();
  });

  it("strips fields the contract does not define", async () => {
    server.use(http.get(`${BASE}${API_PREFIX}/products/:id`, () => HttpResponse.json({ data: { ...product, sellerName: "x" } })));
    const result = await client().call("getProduct", { params: { id: PRODUCT_ID } });
    expect(result.data).not.toHaveProperty("sellerName");
  });

  it("sends an Idempotency-Key where the contract requires one", async () => {
    let key: string | null = null;
    server.use(
      http.post(`${BASE}${API_PREFIX}/uploads/complete`, ({ request }) => {
        key = request.headers.get("idempotency-key");
        return HttpResponse.json({ data: { batchId: PRODUCT_ID, uploads: [] } });
      }),
    );
    await client().call("completeUploads", { body: { batchId: PRODUCT_ID } });
    expect(key).toBe("key-1");
  });

  it("validates the request body before sending", async () => {
    await expect(client().call("presignUploads", { body: { purpose: "IDENTIFY", files: [] } })).rejects.toThrow();
  });

  it("turns an error envelope into ApiError with the catalogue key", async () => {
    server.use(http.get(`${BASE}${API_PREFIX}/me`, () => HttpResponse.json({ error: errorBody("UNAUTHENTICATED") }, { status: 401 })));
    const error = await client().call("getMe", {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).body).toEqual({ code: "UNAUTHENTICATED", messageKey: "errors.unauthenticated" });
    expect((error as ApiError).failure).toBe("api");
  });

  it("rejects a response that breaks the contract", async () => {
    server.use(http.get(`${BASE}${API_PREFIX}/products/:id`, () => HttpResponse.json({ data: { id: "not-a-uuid" } })));
    const error = await client().call("getProduct", { params: { id: PRODUCT_ID } }).catch((caught: unknown) => caught);
    expect((error as ApiError).failure).toBe("contract");
    expect((error as ApiError).body.messageKey).toBe("errors.internal");
  });

  it("reports a network failure", async () => {
    server.use(http.get(`${BASE}${API_PREFIX}/me`, () => HttpResponse.error()));
    const error = await client().call("getMe", {}).catch((caught: unknown) => caught);
    expect((error as ApiError).failure).toBe("network");
    expect((error as ApiError).body.messageKey).toBe("errors.network");
  });
});
