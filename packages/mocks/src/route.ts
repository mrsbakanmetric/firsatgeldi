// One mock route per registry endpoint, run through the same lifecycle as the
// real API (architecture.md §15.1), in order: latency/scenario → session →
// authorisation (permission key, public allow-list) → Zod input → idempotency →
// handler → response shaping (Zod output schema strips undeclared fields,
// so hidden-seller identity cannot leak) → activity log.
import {
  type ActivityEvent,
  type ActivityOutcome,
  API_PREFIX,
  type ApiLocale,
  dataEnvelope,
  ENDPOINTS,
  type EndpointName,
  type ErrorCode,
  ERRORS,
  errorBody,
  type Meta,
  type PermissionKey,
  seedPermissions,
} from "@firsatgeldi/contracts";
import { localeFromAcceptLanguage } from "@firsatgeldi/core";
import { delay, http, HttpResponse } from "msw";
import type { z } from "zod";
import { USERS } from "./fixtures/users";
import { newId } from "./ids";
import { MOCK_SETTINGS, SYSTEM_SETTINGS } from "./settings";
import type { Actor, MockController } from "./state";

const SUPPORTED_LOCALES = ["tr", "en"] as const satisfies readonly ApiLocale[];
const DEFAULT_LOCALE: ApiLocale = "tr";
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

/** Endpoints that keep working in every scenario, so the shell and session still render. */
const SCENARIO_EXEMPT = new Set<EndpointName>(["getMe", "getEntitlements", "stream", "image"]);

/** An API error raised by a handler. */
export class MockApiError extends Error {
  readonly code: ErrorCode;
  readonly extra: { params?: Record<string, string | number>; fields?: Record<string, string> };
  constructor(code: ErrorCode, extra: MockApiError["extra"] = {}) {
    super(code);
    this.code = code;
    this.extra = extra;
  }
}

export interface ActivityNote {
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  containsHiddenSeller?: boolean;
}

export interface RouteContext<N extends EndpointName> {
  readonly controller: MockController;
  readonly request: Request;
  readonly origin: string;
  readonly locale: ApiLocale;
  readonly actor: Actor;
  readonly now: Date;
  readonly params: z.output<NonNullable<(typeof ENDPOINTS)[N]["params"]>>;
  readonly query: z.output<NonNullable<(typeof ENDPOINTS)[N]["query"]>>;
  readonly body: (typeof ENDPOINTS)[N]["body"] extends z.ZodType ? z.output<(typeof ENDPOINTS)[N]["body"]> : undefined;
  /** "empty" scenario: list-shaped answers come back empty. */
  readonly empty: boolean;
  /** Time of a check made `minutesAgo` minutes ago (moved back in the "stale" scenario). */
  checkedAt(minutesAgo: number): string;
  /** Adds target and metadata to this call's activity row. */
  note(note: ActivityNote): void;
}

export interface RouteResult<N extends EndpointName> {
  readonly data: (typeof ENDPOINTS)[N]["response"] extends z.ZodType ? z.input<(typeof ENDPOINTS)[N]["response"]> : never;
  readonly meta?: Meta;
  readonly status?: number;
}

export type RouteImplementation<N extends EndpointName> = (context: RouteContext<N>) => RouteResult<N> | Promise<RouteResult<N>>;

export function actorFor(controller: MockController): Actor {
  const session = controller.config.session;
  if (session === "guest") return { kind: "guest", anonId: controller.state.anonId };
  return { kind: "user", userKey: session, userId: USERS[session].id };
}

export function permissionsOf(actor: Actor): PermissionKey[] {
  if (actor.kind === "guest") return [];
  return [...new Set(USERS[actor.userKey].roles.flatMap((role) => seedPermissions(role)))];
}

function requestLocale(request: Request): ApiLocale {
  return (localeFromAcceptLanguage(request.headers.get("accept-language"), SUPPORTED_LOCALES) as ApiLocale | null) ?? DEFAULT_LOCALE;
}

function outcomeOf(status: number, code: ErrorCode | null): ActivityOutcome {
  if (status < 400) return "OK";
  if (code === "LIMIT_REACHED" || code === "RATE_LIMITED") return "LIMITED";
  if (status === 401 || status === 403) return "DENIED";
  return "ERROR";
}

function fieldsOf(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join(".") || "_"] = ERRORS.VALIDATION.messageKey;
  return fields;
}

/** Same salted-hash shape as `activity_events.device_hash/ip_hash`; never a raw value. */
const MOCK_DEVICE_HASH = "mock-device-hash";
const MOCK_IP_HASH = "mock-ip-hash";

function recordActivity(controller: MockController, name: EndpointName, actor: Actor, request: Request, status: number, code: ErrorCode | null, note: ActivityNote) {
  const action = ENDPOINTS[name].activity;
  if (action === null) return;
  const row: ActivityEvent = {
    id: newId(),
    occurredAt: controller.now().toISOString(),
    userId: actor.kind === "user" ? actor.userId : null,
    anonId: actor.kind === "guest" ? actor.anonId : null,
    sessionId: null,
    deviceHash: MOCK_DEVICE_HASH,
    ipHash: MOCK_IP_HASH,
    platform: request.headers.get("x-client-platform") === "mobile" ? "MOBILE" : "WEB",
    action,
    targetType: note.targetType ?? null,
    targetId: note.targetId ?? null,
    metadata: note.metadata ?? null,
    containsHiddenSeller: note.containsHiddenSeller ?? false,
    outcome: outcomeOf(status, code),
  };
  controller.state.activity.push(row);
}

function errorResponse(code: ErrorCode, extra: MockApiError["extra"] = {}) {
  return HttpResponse.json({ error: errorBody(code, extra) }, { status: ERRORS[code].status });
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new MockApiError("VALIDATION");
  }
}

function idempotencyScope(actor: Actor, name: EndpointName, key: string): string {
  return `${actor.kind === "user" ? actor.userId : actor.anonId}:${name}:${key}`;
}

/** Builds the msw handler for one endpoint. */
export function route<N extends EndpointName>(controller: MockController, name: N, implementation: RouteImplementation<N>) {
  const definition = ENDPOINTS[name];
  const method = definition.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
  // "*" matches any origin: same-origin in the browser, any base URL in tests.
  return http[method](`*${API_PREFIX}${definition.path}`, async ({ request, params: rawParams }) => {
    const { config } = controller;
    const scenarioApplies = !SCENARIO_EXEMPT.has(name);
    if (config.latencyMs > 0) await delay(config.latencyMs);
    if (scenarioApplies && config.scenario === "loading") await delay("infinite");

    const actor = actorFor(controller);
    const note: ActivityNote = {};
    const finish = (response: Response, code: ErrorCode | null) => {
      recordActivity(controller, name, actor, request, response.status, code, note);
      return response;
    };
    const fail = (code: ErrorCode, extra?: MockApiError["extra"]) => finish(errorResponse(code, extra), code);

    // Authorisation: guests only on the public allow-list; users by permission key.
    if (actor.kind === "guest" && !definition.public) return fail("UNAUTHENTICATED");
    if (actor.kind === "user" && !permissionsOf(actor).includes(definition.permission)) return fail("FORBIDDEN");

    try {
      const url = new URL(request.url);
      const params = definition.params ? definition.params.safeParse(rawParams) : null;
      if (params && !params.success) return fail("NOT_FOUND");
      const query = definition.query ? definition.query.safeParse(Object.fromEntries(url.searchParams)) : null;
      if (query && !query.success) return fail("VALIDATION", { fields: fieldsOf(query.error) });
      const rawBody = definition.body ? await readBody(request) : undefined;
      const body = definition.body ? (definition.body as z.ZodType).safeParse(rawBody) : null;
      if (body && !body.success) return fail("VALIDATION", { fields: fieldsOf(body.error) });

      let scope: string | null = null;
      if (definition.idempotent) {
        const key = request.headers.get("idempotency-key");
        if (!key) return fail("VALIDATION", { fields: { "Idempotency-Key": ERRORS.VALIDATION.messageKey } });
        scope = idempotencyScope(actor, name, key);
        const cached = controller.state.idempotency.get(scope);
        if (cached) return HttpResponse.json(cached.body as Record<string, unknown>, { status: cached.status });
      }

      if (scenarioApplies && config.scenario === "error") return fail("INTERNAL");

      const now = controller.now();
      const staleShift = scenarioApplies && config.scenario === "stale" ? SYSTEM_SETTINGS["tracking.stale_hours"] * MOCK_SETTINGS.staleFactor * MS_PER_HOUR : 0;
      const context = {
        controller,
        request,
        origin: url.origin,
        locale: requestLocale(request),
        actor,
        now,
        params: params?.data,
        query: query?.data,
        body: body?.data,
        empty: scenarioApplies && config.scenario === "empty",
        checkedAt: (minutesAgo: number) => new Date(now.getTime() - minutesAgo * MS_PER_MINUTE - staleShift).toISOString(),
        note: (extra: ActivityNote) => Object.assign(note, extra),
      } as unknown as RouteContext<N>;

      const result = await implementation(context);
      // Output validation: undeclared fields (seller, platform, link …) are stripped here.
      const envelope = dataEnvelope(definition.response as z.ZodType).parse({ data: result.data, ...(result.meta ? { meta: result.meta } : {}) });
      const status = result.status ?? 200;
      if (scope) controller.state.idempotency.set(scope, { status, body: envelope });
      return finish(HttpResponse.json(envelope as Record<string, unknown>, { status }), null);
    } catch (error) {
      if (error instanceof MockApiError) return fail(error.code, error.extra);
      throw error;
    }
  });
}
