// In-memory "server side" of the mock API: the rows the real API would write
// (database.md §8, §9, §11, §14, §14a, §14b), plus the session and scenario
// switches used in development (implementation_plan.md §4).
import type { ActivityEvent, ApiLocale, NotificationType, StreamEvent } from "@firsatgeldi/contracts";
import type { ProductKey } from "./fixtures/catalog";
import type { PlatformKey } from "./fixtures/market";
import type { UserKey } from "./fixtures/users";
import { seedAccounts } from "./fixtures/accounts";
import { seedTrackedItems } from "./fixtures/tracking";
import { newId } from "./ids";
import { MOCK_SETTINGS } from "./settings";

/** newUser = a just-created account (signed in after sign-up and the verification link). */
export const MOCK_SESSIONS = ["guest", "user", "secondUser", "newUser", "manager"] as const;
export type MockSession = (typeof MOCK_SESSIONS)[number];
/**
 * Home only: no-deal = no item has a deal (Hemen Gözat shows the nearest return) ·
 * drops-general = nothing dropped in the user's categories (general list + note) ·
 * drops-none = nothing qualifies (the section is hidden).
 */
export const MOCK_SCENARIOS = ["success", "loading", "empty", "error", "stale", "no-deal", "drops-general", "drops-none"] as const;
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
  /** Typed platform name when the user picked "Diğer". */
  readonly otherPlatformName?: string | null;
  readonly sellerOfferId: string | null;
  /** Typed seller on a "Diğer" platform, saved as typed. */
  readonly sellerName?: string | null;
  readonly pricePaidMinor: number | null;
  readonly state: "ACTIVE" | "ENDED" | "EXPIRED";
  readonly createdAt: string;
  /** BOUGHT: order day and status (database.md §8 `ordered_at`, `order_status`). */
  readonly orderedOn?: string | null;
  readonly orderStatus?: "ORDERED" | "SHIPPED" | "DELIVERED" | null;
  readonly returnDeadline?: string | null;
  readonly returnDeadlineStatus?: "ESTIMATED" | "CONFIRMED" | "USER_EDITED" | "UNVERIFIED_DEFAULT" | null;
  /** WANT: target and duration. */
  readonly targetPriceMinor?: number | null;
  readonly trackingDuration?: "1W" | "1M" | "3M" | "UNLIMITED" | null;
  readonly trackingEndsAt?: string | null;
  /** Ended tracking (database.md §8 `ended_at`, `end_reason`) and the saving recorded for it. */
  readonly endedAt?: string | null;
  readonly endReason?: "USER" | "RETURN_WINDOW" | "TRACKING_DURATION" | "MOVED_TO_BOUGHT" | "ACCOUNT_DELETED" | null;
  readonly savingMinor?: number | null;
  /** Seeded row (design "4 Takip Ettiklerim"): its 14-day history comes from the fixture. */
  readonly seedKey?: string;
}

/** `savings_records` row (database.md §8): written when a bought item ends with a saving; voided on "Geri al". */
export interface SavingsRecordRow {
  readonly id: string;
  readonly userId: string;
  readonly trackedItemId: string;
  readonly method: "RETURN_REBUY" | "PRICE_DIFFERENCE";
  readonly pricePaidMinor: number;
  readonly priceReboughtMinor: number;
  readonly savingMinor: number;
  readonly recordedAt: string;
  voidedAt: string | null;
}

/** `check_now_usage` row (database.md §9): consumed = false inside the cache window. */
export interface CheckNowUsageRow {
  readonly userId: string;
  readonly trackedItemId: string | null;
  readonly consumed: boolean;
  readonly createdAt: string;
}

/** `tracked_item_events` row (database.md §8, append-only). */
export interface TrackedItemEventRow {
  readonly id: string;
  readonly trackedItemId: string;
  readonly type:
    | "CREATED"
    | "ENDED"
    | "RESTORED"
    | "BOUGHT"
    | "PRICE_EDITED"
    | "DEADLINE_EDITED"
    | "ORDER_STATUS_EDITED"
    | "TARGET_EDITED"
    | "DELIVERED"
    | "STEP_TICKED"
    | "STEP_UNTICKED"
    | "REQUEST_UPDATED"
    | "EXTENDED";
  readonly data: Readonly<Record<string, unknown>>;
  readonly actor: "USER" | "SYSTEM" | "ADMIN";
  readonly createdAt: string;
}

/** Request tracking of one item ("Fiyat farkı istedim" / "İade talebi açtım", modules.md Return Window). */
export interface TrackingRequestRow {
  readonly kind: "PRICE_DIFFERENCE" | "RETURN";
  readonly since: string;
  readonly outcome: "GIVEN" | "REFUSED" | "COUPON" | null;
}

/** `buyer_feedback` row (database.md): the two optional questions, one answer per item. */
export interface BuyerFeedbackRow {
  readonly priceDifferenceGiven: "YES" | "NO" | "NOT_ASKED" | null;
  readonly returnSmooth: "YES" | "PROBLEM" | "NOT_DONE" | null;
  readonly createdAt: string;
}

/** `reports` row (Trust and Accuracy): a wrong price on an offer, or a different product. */
export interface ReportRow {
  readonly id: string;
  readonly userId: string;
  readonly trackedItemId: string;
  readonly offerId: string | null;
  readonly kind: "WRONG_PRICE" | "DIFFERENT_PRODUCT";
  readonly note: string | null;
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

/**
 * Sign-in account (`users` + `auth_identities`, database.md §3). The mock keeps the password in
 * memory only to compare it; the real API stores an Argon2id hash and never a password.
 */
export interface AuthAccountRow {
  readonly email: string;
  readonly userId: string;
  readonly session: UserKey;
  state: "ACTIVE" | "UNVERIFIED" | "PENDING_DELETION" | "SUSPENDED" | "DELETED";
  password: string | null;
  deletionRequestedAt: string | null;
  purgeAfter: string | null;
  readonly suspendedReason: string | null;
  welcomeGiftGranted: boolean;
}

/** Wrong-password count per e-mail as typed (known or not, so the count reveals nothing). */
export interface LoginFailureRow {
  failures: number;
  lockedUntil: string | null;
}

/** `email_tokens` row (database.md §3): one-time link, stored hashed by the real API. */
export interface EmailTokenRow {
  readonly token: string;
  readonly purpose: "VERIFY_EMAIL" | "RESET_PASSWORD" | "CHANGE_EMAIL";
  readonly email: string;
  /** CHANGE_EMAIL: the account whose address changes to `email`. */
  readonly accountEmail?: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  usedAt: string | null;
}

/** Correct password on a suspended or pending-deletion account: what the challenge may do. */
export interface AccountChallengeRow {
  readonly email: string;
  readonly kind: "PENDING_DELETION" | "SUSPENDED";
  readonly expiresAt: string;
}

/** An e-mail the mock "sends" (no mail provider in Phase 1): development prints the link. */
export interface MockMail {
  readonly purpose: EmailTokenRow["purpose"];
  readonly emailMasked: string;
  readonly token: string;
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
  readonly checkNowUsage: CheckNowUsageRow[];
  readonly savingsRecords: SavingsRecordRow[];
  /** Last finished check per tracked item (`checks`); seeded rows fall back to their fixture age. */
  readonly lastChecks: Map<string, string>;
  /** Product Detail: ticked action steps, request tracking and buyer answers per tracked item. */
  readonly steps: Map<string, Set<"RETURN_REQUEST" | "PRICE_DIFFERENCE" | "REORDER" | "END">>;
  readonly requests: Map<string, TrackingRequestRow>;
  readonly feedback: Map<string, BuyerFeedbackRow>;
  readonly reports: ReportRow[];
  /** "Stoğa gelince haber ver" subscriptions (user + offer). */
  readonly stockAlerts: { readonly userId: string; readonly offerId: string; readonly createdAt: string }[];
  /** "Mağazaya git": price re-checks already shown per user and offer (`userId:offerId`), so the next press goes through. */
  readonly priceRechecked: Set<string>;
  /** Sign-in (database.md §3, §9, §14b): accounts by e-mail, failures, links, challenges. */
  readonly accounts: Map<string, AuthAccountRow>;
  readonly loginFailures: Map<string, LoginFailureRow>;
  readonly emailTokens: EmailTokenRow[];
  readonly challenges: Map<string, AccountChallengeRow>;
  /** Last link request per `purpose:e-mail` as typed (known or not), for `auth.resend_cooldown_seconds`. */
  readonly emailRequests: Map<string, string>;
  /** `user_consents` rows: terms accepted at sign-up. */
  readonly userConsents: { readonly userId: string; readonly termsVersion: string; readonly acceptedAt: string }[];
  /** `token_ledger` rows (database.md §9): the welcome gift, once per account. */
  readonly tokenLedger: { readonly userId: string; readonly kind: "WELCOME"; readonly amount: number; readonly createdAt: string }[];
  /** Every session of a user revoked (password reset). */
  readonly sessionRevocations: { readonly userId: string; readonly at: string }[];
  /** Data exports requested ("Verilerimi indir"). */
  readonly dataExports: { readonly id: string; readonly userId: string; readonly requestedAt: string; readyAt: string | null }[];
  /** Settings and Account (database.md §3, §6a, §11, §14): per signed-in user, created on first use. */
  readonly profiles: Map<string, ProfileRow>;
  readonly access: Map<string, AccessRow>;
  readonly sessions: SessionRow[];
  readonly notificationPrefs: Map<string, NotificationPrefsRow>;
  readonly cookieConsents: Map<string, { analytics: boolean; marketing: boolean; version: string; decidedAt: string }>;
  /** Hidden search ids ("Gizle"; cleared by "Geri al"); the rows themselves are kept. */
  readonly hiddenSearches: Set<string>;
  /** Profilim (database.md §8 `follows`, `blocks`): rows of the signed-in users, created on first use. */
  readonly follows: FollowRow[];
  readonly blocks: { readonly blockerId: string; readonly blockedId: string }[];
  /** Users whose Profilim rows were created from the fixtures. */
  readonly profileSeeded: Set<string>;
  /** Follow rows just removed, kept for "Geri al" within `community.follow_undo_minutes`. */
  readonly removedFollows: { readonly row: FollowRow; readonly removedBy: string; readonly removedAt: string }[];
  /** In-app notifications (database.md §10 `notifications`): fixture rows on first use + rows made by actions. */
  readonly notifications: NotificationStateRow[];
  /** Users whose notification rows were created from the fixtures. */
  readonly notificationsSeeded: Set<string>;
}

/** One `notifications` row. `createdAt` in the future = scheduled (a delivery question asked again later). */
export interface NotificationStateRow {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly createdAt: string;
  readAt: string | null;
  /** The fixture it came from (subject and values), or null for a row made by an action. */
  readonly seedKey: string | null;
  /** FOLLOW_ACCEPTED: who approved. */
  readonly actorId?: string;
  /** DELIVERY_PROMPT asked again: the tracked item. */
  readonly trackedItemId?: string | null;
  /** DELIVERY_PROMPT: still waiting for "Evet, aldım" / "Henüz değil". */
  awaitingAnswer: boolean;
}

/** One `follows` row: one-way; PENDING until a private profile approves. */
export interface FollowRow {
  readonly followerId: string;
  readonly followeeId: string;
  status: "ACCEPTED" | "PENDING";
  readonly createdAt: string;
}

/** `users` profile columns the Settings screen changes. */
export interface ProfileRow {
  displayName: string | null;
  username: string | null;
  usernameChangedAt: string | null;
  avatarSha256: string | null;
  locale: ApiLocale;
  theme: "light" | "dark" | "system";
  privacyLevel: "EVERYONE" | "FOLLOWERS" | "ONLY_ME";
}

/** E-mail change in progress, password change time, linked providers, the re-authentication window. */
export interface AccessRow {
  pendingEmail: { email: string; sentAt: string } | null;
  passwordChangedAt: string | null;
  identities: Set<"GOOGLE" | "APPLE">;
  reauthUntil: string | null;
}

/** `sessions` + `user_devices` (no location). */
export interface SessionRow {
  readonly id: string;
  readonly userId: string;
  readonly deviceType: "DESKTOP" | "PHONE" | "TABLET";
  readonly browser: string;
  readonly os: string;
  readonly lastUsedAt: string;
  readonly current: boolean;
  revokedAt: string | null;
}

/** `notification_preferences` + `notification_type_preferences` (no row = default). */
export interface NotificationPrefsRow {
  delivery: "INSTANT" | "DIGEST";
  slots: ("ALWAYS" | "MORNING" | "NOON" | "EVENING")[];
  /** `ROW_KEY:CHANNEL` → enabled; missing = the default. */
  readonly switches: Map<string, boolean>;
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
    checkNowUsage: [],
    savingsRecords: [],
    lastChecks: new Map(),
    steps: new Map(),
    requests: new Map(),
    feedback: new Map(),
    reports: [],
    stockAlerts: [],
    priceRechecked: new Set(),
    accounts: new Map(),
    loginFailures: new Map(),
    emailTokens: [],
    challenges: new Map(),
    emailRequests: new Map(),
    userConsents: [],
    tokenLedger: [],
    sessionRevocations: [],
    dataExports: [],
    profiles: new Map(),
    access: new Map(),
    sessions: [],
    notificationPrefs: new Map(),
    cookieConsents: new Map(),
    hiddenSearches: new Set(),
    follows: [],
    blocks: [],
    profileSeeded: new Set(),
    removedFollows: [],
    notifications: [],
    notificationsSeeded: new Set(),
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
  /** Called after a mock sign-in or sign-out changed `config.session` (the browser remembers it). */
  persist?: (config: MockConfig) => void;
  /** Called for every e-mail the mock "sends" (the browser prints the link in development). */
  onMail?: (mail: MockMail) => void;
}

export interface MockControllerOptions {
  readonly config?: Partial<MockConfig>;
  /**
   * Seeds the signed-in users' tracked items drawn in "4 Takip Ettiklerim" (development;
   * tests that need them). Off by default so Search and Add tests start with an empty list.
   */
  readonly seedTracking?: boolean;
  readonly now?: () => Date;
  readonly schedule?: (task: () => void, ms: number) => void;
}

export function createMockController(options: MockControllerOptions = {}): MockController {
  const now = options.now ?? (() => new Date());
  const state = createMockState();
  seedAccounts(state, now());
  if (options.seedTracking) seedTrackedItems(state, now());
  return {
    config: { ...DEFAULT_MOCK_CONFIG, ...options.config },
    state,
    now,
    schedule: options.schedule ?? ((task, ms) => void setTimeout(task, ms)),
  };
}
