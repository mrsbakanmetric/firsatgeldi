// In-memory "server side" of the mock API: the rows the real API would write
// (database.md §8, §9, §11, §14, §14a, §14b), plus the session and scenario
// switches used in development (implementation_plan.md §4).
import type { ActivityEvent, ApiLocale, StreamEvent } from "@firsatgeldi/contracts";
import type { ProductKey } from "./fixtures/catalog";
import type { PlatformKey } from "./fixtures/market";
import type { UserKey } from "./fixtures/users";
import { newId } from "./ids";
import { MOCK_SETTINGS } from "./settings";

export const MOCK_SESSIONS = ["guest", "user", "secondUser", "manager"] as const;
export type MockSession = (typeof MOCK_SESSIONS)[number];
export const MOCK_SCENARIOS = ["success", "loading", "empty", "error", "stale"] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];
/**
 * What the mock "recognises" in an uploaded photo (no image recognition in Phase 1):
 * product = a product photo · order = an order screen (seller, price, date read; design case B) ·
 * bulk = one screen with three products (design case C).
 */
export const MOCK_PHOTOS = ["product", "order", "bulk"] as const;
export type MockPhoto = (typeof MOCK_PHOTOS)[number];

export interface MockConfig {
  /** guest = no session; the other values sign in as that fixture user. */
  readonly session: MockSession;
  readonly scenario: MockScenario;
  readonly latencyMs: number;
  readonly photo: MockPhoto;
}

export const DEFAULT_MOCK_CONFIG: MockConfig = { session: "user", scenario: "success", latencyMs: MOCK_SETTINGS.defaultLatencyMs, photo: "product" };

/** Who acts: a guest (anonymous cookie id) or a fixture user. */
export type Actor = { readonly kind: "guest"; readonly anonId: string } | { readonly kind: "user"; readonly userKey: UserKey; readonly userId: string };

export interface RefTarget {
  readonly userId: string;
  readonly offerId: string;
  readonly productKey: ProductKey;
  /** Rank shown when the ref was issued (1 = cheapest). */
  readonly rank: number;
  /** Price the user typed, for the saving in later views (kuruş). */
  readonly pricePaidMinor: number | null;
}

/** `offer_reveals` row (database.md §9, append-only). */
export interface OfferRevealRow {
  readonly id: string;
  readonly userId: string;
  readonly offerId: string;
  readonly action: "REVEAL" | "HIDE" | "EXPIRE" | "REFUND";
  readonly gate: "FREE_TOGGLE" | "PREMIUM" | "MONTHLY_FREE" | "TOKEN" | "ADMIN" | null;
  readonly priceAtReveal: number | null;
  readonly offerRankAtReveal: number | null;
  readonly expiresAt: string | null;
  readonly priceWatchUntil: string | null;
  readonly createdAt: string;
}

/** `tracked_items` row (database.md §8), the fields the mock needs. */
export interface TrackedItemRow {
  readonly id: string;
  readonly userId: string;
  readonly productKey: ProductKey;
  readonly mode: "BOUGHT" | "WANT";
  readonly platform: PlatformKey | null;
  readonly sellerOfferId: string | null;
  readonly pricePaidMinor: number | null;
  readonly state: "ACTIVE" | "ENDED" | "EXPIRED";
  readonly createdAt: string;
}

/** `tracked_item_events` row (database.md §8, append-only). */
export interface TrackedItemEventRow {
  readonly id: string;
  readonly trackedItemId: string;
  readonly type: "CREATED";
  readonly data: Readonly<Record<string, unknown>>;
  readonly actor: "USER" | "SYSTEM" | "ADMIN";
  readonly createdAt: string;
}

/** `audit_logs` row (database.md §14), the fields the mock needs. */
export interface AuditLogRow {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly containsHiddenSeller: boolean;
  readonly createdAt: string;
}

/** `search_events` row (database.md §11); query text with e-mail/phone patterns replaced. */
export interface SearchEventRow {
  readonly id: string;
  readonly userId: string | null;
  readonly anonId: string | null;
  readonly queryRaw: string;
  readonly locale: ApiLocale;
  readonly source: "SEARCH_BOX" | "AUTOCOMPLETE" | "LINK" | "PHOTO";
  readonly resultCount: number;
  readonly occurredAt: string;
}

export interface UploadRow {
  readonly id: string;
  readonly batchId: string;
  readonly owner: Actor;
  readonly purpose: "IDENTIFY" | "ORDER_SCREENSHOT" | "AVATAR" | "SUPPORT_ATTACHMENT";
  readonly position: number;
  readonly declaredMime: string;
  readonly declaredBytes: number;
  status: "PRESIGNED" | "UPLOADED" | "PROCESSING" | "READY" | "REJECTED" | "EXPIRED" | "DELETED";
  rejectReason: "TYPE" | "SIZE" | "DIMENSIONS" | "DECODE" | "UNSAFE" | null;
  /** What the mock "recognises" in this photo (`MockConfig.photo` at upload time). */
  readonly recognised: MockPhoto;
  readonly expiresAt: string;
  readonly purgeAt: string;
}

export interface IdentifyRequestRow {
  readonly id: string;
  readonly owner: Actor;
  /** Understood attributes after the user's corrections. */
  attributes: Record<string, string>;
  selectedOptions: Record<string, string>;
  readonly text: string | null;
  readonly uploadIds: readonly string[];
  readonly link: string | null;
}

export interface StreamSubscriber {
  readonly actor: Actor;
  send(event: StreamEvent): void;
}

export interface MockState {
  /** Guest session id (`anon_id` cookie); a new value is a new guest session. */
  anonId: string;
  readonly refs: Map<string, RefTarget>;
  readonly reveals: OfferRevealRow[];
  readonly trackedItems: TrackedItemRow[];
  readonly trackedItemEvents: TrackedItemEventRow[];
  readonly identifyRequests: Map<string, IdentifyRequestRow>;
  readonly uploads: Map<string, UploadRow>;
  readonly activity: ActivityEvent[];
  readonly auditLogs: AuditLogRow[];
  readonly searchEvents: SearchEventRow[];
  /** Every live-update event sent, for the leak test. */
  readonly streamLog: { readonly actor: Actor; readonly event: StreamEvent }[];
  readonly subscribers: Set<StreamSubscriber>;
  readonly idempotency: Map<string, { readonly status: number; readonly body: unknown }>;
  /** Accepted seller lookups per user (epoch ms), for `seller_lookup.rate_limit_per_minute`. */
  readonly sellerLookups: Map<string, number[]>;
  /** Products found through the live sources and saved to the catalogue (architecture.md §11). */
  readonly catalogAdded: Set<string>;
}

export function createMockState(): MockState {
  return {
    anonId: newId(),
    refs: new Map(),
    reveals: [],
    trackedItems: [],
    trackedItemEvents: [],
    identifyRequests: new Map(),
    uploads: new Map(),
    activity: [],
    auditLogs: [],
    searchEvents: [],
    streamLog: [],
    subscribers: new Set(),
    idempotency: new Map(),
    sellerLookups: new Map(),
    catalogAdded: new Set(),
  };
}

/** Starts a new guest session (another browser, or cleared cookies): earlier guest rows belong to the old session. */
export function startGuestSession(state: MockState): void {
  state.anonId = newId();
}

export interface MockController {
  config: MockConfig;
  readonly state: MockState;
  /** Current time; tests may pin it. */
  now(): Date;
  /** Schedules simulated background work (image processing); tests may run it at once. */
  schedule(task: () => void, ms: number): void;
}

export interface MockControllerOptions {
  readonly config?: Partial<MockConfig>;
  readonly now?: () => Date;
  readonly schedule?: (task: () => void, ms: number) => void;
}

export function createMockController(options: MockControllerOptions = {}): MockController {
  return {
    config: { ...DEFAULT_MOCK_CONFIG, ...options.config },
    state: createMockState(),
    now: options.now ?? (() => new Date()),
    schedule: options.schedule ?? ((task, ms) => void setTimeout(task, ms)),
  };
}
