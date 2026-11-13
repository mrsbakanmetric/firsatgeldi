// Typed API client, framework-free (web now, mobile later). Every request body
// is validated before sending and every response is validated against the
// contract; a mismatch is an error, never silently used. The client does not
// know whether the mock API or the real API answers (implementation_plan.md §4).
import type { z } from "zod";
import { type ApiLocale } from "./common";
import {
  API_PREFIX,
  buildPath,
  type EndpointBody,
  type EndpointData,
  type EndpointParams,
  type EndpointQuery,
  ENDPOINTS,
  type JsonEndpointName,
} from "./endpoints";
import { dataEnvelope, ErrorEnvelope, type Meta } from "./envelope";
import { type ApiErrorBody, CONTRACT_ERROR_MESSAGE_KEY, NETWORK_ERROR_MESSAGE_KEY } from "./errors";

/** Client platform header (architecture.md §15.3). */
export type ClientPlatform = "web" | "mobile";

export interface ApiClientOptions {
  /** Origin of the API, e.g. `https://api.example` or `""` for same-origin. */
  readonly baseUrl: string;
  readonly platform: ClientPlatform;
  /** Current UI language, sent as Accept-Language. */
  readonly locale: () => ApiLocale;
  readonly fetch?: typeof fetch;
  /** Creates Idempotency-Key values; defaults to crypto.randomUUID. */
  readonly idempotencyKey?: () => string;
}

/** Why a call failed: an API error envelope, the network, or a contract mismatch. */
export type ApiFailure = "api" | "network" | "contract";

export class ApiError extends Error {
  readonly status: number;
  readonly failure: ApiFailure;
  readonly body: ApiErrorBody | { code: null; messageKey: string };

  constructor(failure: ApiFailure, status: number, body: ApiErrorBody | { code: null; messageKey: string }) {
    super(`API ${failure} error ${status}${body.code ? ` ${body.code}` : ""}`);
    this.name = "ApiError";
    this.failure = failure;
    this.status = status;
    this.body = body;
  }
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly meta: Meta | undefined;
}

/** Optional when there is nothing to send or every field is optional (e.g. a query with only a cursor). */
type OptionalIfUndefined<K extends string, V> = undefined extends V
  ? { readonly [P in K]?: V }
  : Record<string, never> extends V
    ? { readonly [P in K]?: V }
    : { readonly [P in K]: V };

export type CallInput<N extends JsonEndpointName> = OptionalIfUndefined<"params", EndpointParams<N>> &
  OptionalIfUndefined<"query", EndpointQuery<N>> &
  OptionalIfUndefined<"body", EndpointBody<N>> & {
    /** Reuse the same key when retrying the same action. */
    readonly idempotencyKey?: string;
    readonly signal?: AbortSignal;
  };

export interface ApiClient {
  call<N extends JsonEndpointName>(name: N, input: CallInput<N>): Promise<ApiResponse<EndpointData<N>>>;
}

function queryString(query: Readonly<Record<string, unknown>> | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetch ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const newKey = options.idempotencyKey ?? (() => globalThis.crypto.randomUUID());

  return {
    async call(name, input) {
      const definition = ENDPOINTS[name];
      const loose = input as { params?: Record<string, string>; query?: Record<string, unknown>; body?: unknown; idempotencyKey?: string; signal?: AbortSignal };

      // Validate what we send with the same schemas the server uses.
      const params = definition.params ? (definition.params.parse(loose.params) as Record<string, string>) : undefined;
      const query = definition.query ? (definition.query.parse(loose.query ?? {}) as Record<string, unknown>) : undefined;
      const body = definition.body ? (definition.body as z.ZodType).parse(loose.body) : undefined;

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Accept-Language": options.locale(),
        "X-Client-Platform": options.platform,
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (definition.idempotent) headers["Idempotency-Key"] = loose.idempotencyKey ?? newKey();

      const url = `${options.baseUrl}${API_PREFIX}${buildPath(definition.path, params)}${queryString(query)}`;
      let response: Response;
      try {
        response = await doFetch(url, {
          method: definition.method,
          headers,
          credentials: "include",
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
          ...(loose.signal ? { signal: loose.signal } : {}),
        });
      } catch (error) {
        if (loose.signal?.aborted) throw error;
        throw new ApiError("network", 0, { code: null, messageKey: NETWORK_ERROR_MESSAGE_KEY });
      }

      const json = await readJson(response);
      if (!response.ok) {
        const parsed = ErrorEnvelope.safeParse(json);
        if (parsed.success) throw new ApiError("api", response.status, parsed.data.error);
        throw new ApiError("contract", response.status, { code: null, messageKey: CONTRACT_ERROR_MESSAGE_KEY });
      }

      const parsed = dataEnvelope(definition.response as z.ZodType).safeParse(json);
      if (!parsed.success) throw new ApiError("contract", response.status, { code: null, messageKey: CONTRACT_ERROR_MESSAGE_KEY });
      return parsed.data as ApiResponse<EndpointData<typeof name>>;
    },
  };
}
