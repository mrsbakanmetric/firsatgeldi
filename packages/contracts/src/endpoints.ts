// Endpoint registry: one entry per API endpoint with its request/response
// schemas, permission key, guest allow-list flag, idempotency and activity
// action. The typed client, the mock API and (Phase 2) the API server and its
// OpenAPI document are all derived from this list (architecture.md §15, §16).
import { z } from "zod";
import { ActivityAction } from "./activity";
import { EntitlementSummary } from "./envelope";
import { Cursor, Id, ImageSha256, ImageVariant } from "./common";
import { IdentifyAnswer, IdentifyRequest, IdentifyResult } from "./identify";
import { GoResult, HideResult, OfferRef, RevealResult } from "./offers";
import type { PermissionKey } from "./permissions";
import { AutocompleteQuery, AutocompleteResult, ProductView, SimilarProducts } from "./products";
import { Me, SearchHistory } from "./session";
import {
  ConfirmContext,
  CreateTrackedItemRequest,
  SellerLookupRequest,
  SellerLookupResult,
  TeaserRequest,
  TeaserResult,
  TrackedItemCreated,
} from "./tracking";
import { CompleteUploadRequest, CompleteUploadResult, PresignRequest, PresignResult, UploadView } from "./uploads";

/** API prefix (architecture.md §15.4). */
export const API_PREFIX = "/api/v1";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * How the response body is shaped:
 * json = response envelope · binary = file (image) · stream = Server-Sent Events.
 */
export type ResponseKind = "json" | "binary" | "stream";

export interface EndpointDefinition {
  readonly method: HttpMethod;
  /** Path after API_PREFIX, Express-style params (`/products/:id`). */
  readonly path: string;
  readonly params: z.ZodObject | null;
  readonly query: z.ZodObject | null;
  readonly body: z.ZodType | null;
  /** Schema of `data` in the envelope (json), or null (binary/stream). */
  readonly response: z.ZodType | null;
  readonly kind: ResponseKind;
  /** Permission key checked on the server for signed-in callers (database.md §4). */
  readonly permission: PermissionKey;
  /** On the explicit public allow-list: reachable without a session (architecture.md §15.1). */
  readonly public: boolean;
  /** Requires an `Idempotency-Key` header (architecture.md §15.3). */
  readonly idempotent: boolean;
  /** Activity history action written for every call (database.md §14a); null = read without a log row. */
  readonly activity: ActivityAction | null;
  /** The response can contain offers: scanned by the hidden-seller leak test (architecture.md §6.5). */
  readonly returnsOffers: boolean;
}

function endpoint<const T extends EndpointDefinition>(definition: T): T {
  return definition;
}

const IdParams = z.object({ id: Id });
const RefParams = z.object({ ref: OfferRef });
const NONE = { params: null, query: null, body: null } as const;
const READ = { idempotent: false, activity: null, returnsOffers: false, kind: "json" } as const;

export const ENDPOINTS = {
  // ME
  getMe: endpoint({ method: "GET", path: "/me", ...NONE, response: Me, ...READ, permission: "account.own.view", public: false }),
  getEntitlements: endpoint({
    method: "GET", path: "/me/entitlements", ...NONE, response: EntitlementSummary, ...READ,
    permission: "packages.own.view", public: false,
  }),
  getSearchHistory: endpoint({
    method: "GET", path: "/me/search-history", params: null, query: z.object({ cursor: Cursor.optional() }), body: null,
    response: SearchHistory, ...READ, permission: "account.own.view", public: false,
  }),
  stream: endpoint({
    method: "GET", path: "/me/stream", ...NONE, response: null, ...READ, kind: "stream",
    // [ASSUMPTION] the docs name no key for the live-update stream.
    permission: "account.own.view", public: false,
  }),

  // IDENTIFY, SEARCH AND UPLOADS
  autocomplete: endpoint({
    method: "GET", path: "/search/autocomplete", params: null, query: AutocompleteQuery, body: null,
    response: AutocompleteResult, ...READ, activity: "search", permission: "search.use", public: true,
  }),
  presignUploads: endpoint({
    method: "POST", path: "/uploads/presign", params: null, query: null, body: PresignRequest,
    response: PresignResult, ...READ, activity: "upload", permission: "upload.own.create", public: true,
  }),
  completeUploads: endpoint({
    method: "POST", path: "/uploads/complete", params: null, query: null, body: CompleteUploadRequest,
    response: CompleteUploadResult, ...READ, idempotent: true, activity: "upload", permission: "upload.own.create", public: true,
  }),
  getUpload: endpoint({
    // Not marked "(guest)" in implementation_plan.md Appendix B.1; the key is [ASSUMPTION].
    method: "GET", path: "/uploads/:id", params: IdParams, query: null, body: null,
    response: UploadView, ...READ, permission: "upload.own.create", public: false,
  }),
  image: endpoint({
    method: "GET", path: "/img/:sha256/:variant", params: z.object({ sha256: ImageSha256, variant: ImageVariant }), query: null, body: null,
    response: null, ...READ, kind: "binary", permission: "catalog.view", public: true,
  }),
  identify: endpoint({
    method: "POST", path: "/identify", params: null, query: null, body: IdentifyRequest,
    response: IdentifyResult, ...READ, activity: "identify", permission: "identify.use", public: true,
  }),
  answerIdentify: endpoint({
    method: "POST", path: "/identify/:requestId/answer", params: z.object({ requestId: Id }), query: null, body: IdentifyAnswer,
    response: IdentifyResult, ...READ, activity: "identify", permission: "identify.use", public: true,
  }),
  getProduct: endpoint({
    method: "GET", path: "/products/:id", params: IdParams, query: null, body: null,
    response: ProductView, ...READ, permission: "catalog.view", public: true,
  }),
  getSimilarProducts: endpoint({
    method: "GET", path: "/products/:id/similar", params: IdParams, query: null, body: null,
    response: SimilarProducts, ...READ, permission: "catalog.view", public: true,
  }),

  // CONFIRM AND TRACKING
  getConfirmContext: endpoint({
    method: "GET", path: "/products/:id/confirm-context", params: IdParams, query: null, body: null,
    response: ConfirmContext, ...READ, permission: "tracking.own.write", public: false,
  }),
  sellerLookup: endpoint({
    method: "POST", path: "/products/:id/seller-lookup", params: IdParams, query: null, body: SellerLookupRequest,
    response: SellerLookupResult, ...READ, activity: "seller_lookup", permission: "tracking.own.write", public: false,
  }),
  teaser: endpoint({
    method: "POST", path: "/products/:id/teaser", params: IdParams, query: null, body: TeaserRequest,
    response: TeaserResult, ...READ, activity: "teaser", returnsOffers: true, permission: "tracking.own.write", public: false,
  }),
  createTrackedItem: endpoint({
    method: "POST", path: "/tracked-items", params: null, query: null, body: CreateTrackedItemRequest,
    response: TrackedItemCreated, ...READ, idempotent: true, activity: "tracking.confirm", permission: "tracking.own.write", public: false,
  }),

  // REVEAL AND OFFERS
  revealOffer: endpoint({
    method: "POST", path: "/offers/:ref/reveal", params: RefParams, query: null, body: null,
    response: RevealResult, ...READ, idempotent: true, activity: "reveal", returnsOffers: true, permission: "reveal.own.use", public: false,
  }),
  hideOffer: endpoint({
    method: "POST", path: "/offers/:ref/hide", params: RefParams, query: null, body: null,
    response: HideResult, ...READ, activity: "reveal.hide", returnsOffers: true, permission: "reveal.own.use", public: false,
  }),
  goToOffer: endpoint({
    method: "POST", path: "/offers/:ref/go", params: RefParams, query: null, body: null,
    response: GoResult, ...READ, activity: "offer.go", returnsOffers: true, permission: "offer.own.go", public: false,
  }),
} as const satisfies Record<string, EndpointDefinition>;

export type Endpoints = typeof ENDPOINTS;
export type EndpointName = keyof Endpoints;

type InferOr<S, Fallback> = S extends z.ZodType ? z.input<S> : Fallback;

export type EndpointParams<N extends EndpointName> = InferOr<Endpoints[N]["params"], undefined>;
export type EndpointQuery<N extends EndpointName> = InferOr<Endpoints[N]["query"], undefined>;
export type EndpointBody<N extends EndpointName> = InferOr<Endpoints[N]["body"], undefined>;
export type EndpointData<N extends EndpointName> = Endpoints[N]["response"] extends z.ZodType ? z.output<Endpoints[N]["response"]> : never;

/** Endpoints whose body is the JSON envelope (the typed client calls these). */
export type JsonEndpointName = { [N in EndpointName]: Endpoints[N]["kind"] extends "json" ? N : never }[EndpointName];

/** Fills `:name` segments; values are URL-encoded. */
export function buildPath(path: string, params: Readonly<Record<string, string>> | undefined): string {
  return path.replace(/:(\w+)/g, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(value);
  });
}

/** Catalogue image URL (architecture.md §11a): the URL never reveals the platform. */
export function imagePath(sha256: string, variant: ImageVariant): string {
  return API_PREFIX + buildPath(ENDPOINTS.image.path, { sha256, variant });
}
