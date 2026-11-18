// Settings and Account (modules.md Settings and Account; architecture.md §16 ME, §17;
// pagedesign.md §8.9 design v2.1; decisions 2026-11-18). Shapes and the endpoints not
// named in architecture.md §16 are [ASSUMPTION — shape] until §16.1 writes them out.
// Personal data: e-mail and phone are masked everywhere; the full own value comes only
// from `GET /me/pii`, after re-authentication, and every reveal is logged.
import { z } from "zod";
import { Cursor, Id, ImageSha256, Timestamp } from "./common";
import { Email, Password } from "./auth";
import { PermissionKey, RoleCode } from "./permissions";

// ── Profil ───────────────────────────────────────────────────────────────────

/** Username rules [DECIDED 2026-11-18]: 3–20 characters, lowercase letters, digits, `_`, `.`. */
export const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;
export const Username = z.string().trim().toLowerCase().regex(USERNAME_PATTERN);
export const DisplayName = z.string().trim().min(1).max(60);

/**
 * `PATCH /me` — profile, language, theme, privacy; at least one field. `avatarUploadId` = a READY
 * upload with purpose AVATAR (cropped on the client), `null` removes the photo (initials again).
 * Username taken → USERNAME_TAKEN; changed less than `username.change_days` ago → USERNAME_LOCKED.
 */
export const UpdateMeRequest = z
  .object({
    displayName: DisplayName.optional(),
    username: Username.optional(),
    avatarUploadId: Id.nullable().optional(),
    locale: z.enum(["tr", "en"]).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    privacyLevel: z.enum(["EVERYONE", "FOLLOWERS", "ONLY_ME"]).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: "nothing to change" });
export type UpdateMeRequest = z.infer<typeof UpdateMeRequest>;

/** `GET /me/username-check?u=` — "✓ Kullanılabilir" or why not, with three suggestions when taken. */
export const UsernameCheckQuery = z.object({ u: z.string().trim().toLowerCase().min(1).max(40) });
export const UsernameCheck = z.object({
  available: z.boolean(),
  reason: z.enum(["TAKEN", "INVALID", "TOO_SOON"]).nullable(),
  suggestions: z.array(Username).max(3),
  /** TOO_SOON: the first day the username can change again. */
  changeableFrom: Timestamp.nullable(),
});
export type UsernameCheck = z.infer<typeof UsernameCheck>;

// ── E-posta ve şifre ─────────────────────────────────────────────────────────

export const Provider = z.enum(["GOOGLE", "APPLE"]);
export type Provider = z.infer<typeof Provider>;

/**
 * `GET /me/access` [ASSUMPTION — endpoint] — the "E-posta ve şifre" rows: masked e-mail (and a
 * pending change), phone (shown only), password (set or not, last change), linked Google / Apple,
 * and for an Application Manager the two-step verification row (information only in this step).
 */
export const AccountAccess = z.object({
  emailMasked: z.string().min(1),
  emailVerified: z.boolean(),
  pendingEmail: z.object({ emailMasked: z.string().min(1), sentAt: Timestamp, resendAfterSeconds: z.number().int().nonnegative() }).nullable(),
  phoneMasked: z.string().min(1).nullable(),
  password: z.object({ set: z.boolean(), changedAt: Timestamp.nullable() }),
  identities: z.array(z.object({ provider: Provider, linked: z.boolean() })),
  twoFactor: z.object({ required: z.boolean(), enabled: z.boolean() }).nullable(),
  /** Re-authentication still valid until (null = ask first). */
  reauthUntil: Timestamp.nullable(),
  /** How long a re-authentication lasts (`pii.reauth_minutes`), stated in the dialog before it opens. */
  reauthMinutes: z.number().int().positive(),
});
export type AccountAccess = z.infer<typeof AccountAccess>;

/** `POST /me/reauth` — the password, or for an account without one the provider it signs in with. */
export const ReauthRequest = z.discriminatedUnion("method", [
  z.object({ method: z.literal("PASSWORD"), password: Password }),
  z.object({ method: Provider, credential: z.string().min(1).max(4096) }),
]);
export const ReauthResult = z.object({ validUntil: Timestamp });

/** `GET /me/pii` — the full own values, only within the re-authentication window (else REAUTH_REQUIRED). */
export const OwnPii = z.object({
  email: z.string().min(3),
  phone: z.string().min(1).nullable(),
  /** The values mask themselves again then (`pii.self_reveal_seconds`). */
  visibleUntil: Timestamp,
});
export type OwnPii = z.infer<typeof OwnPii>;

/** `PATCH /me/email` — new address (needs re-authentication); the old one stays valid until the link is opened. */
export const ChangeEmailRequest = z.object({ email: Email });

/** `POST /me/password` — current + new password (live rules); the other devices are signed out. */
export const ChangePasswordRequest = z.object({ currentPassword: Password, newPassword: Password });
export const PasswordChanged = z.object({ status: z.literal("PASSWORD_CHANGED"), otherSessionsRevoked: z.number().int().nonnegative() });

/** `POST /me/identities/:provider` { credential } · `DELETE /me/identities/:provider` → the rows again. */
export const ProviderParams = z.object({ provider: z.enum(["google", "apple"]) });
export const LinkIdentityRequest = z.object({ credential: z.string().min(1).max(4096) });

// ── Güvenlik ve cihazlar ─────────────────────────────────────────────────────

export const DeviceType = z.enum(["DESKTOP", "PHONE", "TABLET"]);
/** A signed-in device (`sessions` + `user_devices`); no location [DECIDED 2026-11-18]. */
export const SessionView = z.object({
  id: Id,
  deviceType: DeviceType,
  browser: z.string().min(1),
  os: z.string().min(1),
  lastUsedAt: Timestamp,
  current: z.boolean(),
});
export type SessionView = z.infer<typeof SessionView>;

/** A recent sign-in from the own activity history; failed attempts grouped with their count. */
export const SignInView = z.object({
  id: Id,
  method: z.enum(["EMAIL", "GOOGLE", "APPLE"]),
  outcome: z.enum(["OK", "FAILED"]),
  failedCount: z.number().int().positive().nullable(),
  newDevice: z.boolean(),
  deviceType: DeviceType,
  browser: z.string().min(1).nullable(),
  os: z.string().min(1).nullable(),
  occurredAt: Timestamp,
});
export type SignInView = z.infer<typeof SignInView>;

/** `GET /me/security` — "Oturum açık cihazlar" (current first) and "Son girişler" (newest first). */
export const SecurityView = z.object({ sessions: z.array(SessionView), signIns: z.array(SignInView) });
export type SecurityView = z.infer<typeof SecurityView>;

export const SessionRevoked = z.object({ revoked: z.number().int().nonnegative() });

// ── Arama geçmişi ────────────────────────────────────────────────────────────
// `GET /me/search-history` lives in session.ts (also feeds "Son aramaların").

/** `POST /me/search-history/:id/hide` · `/unhide` ("Geri al"). */
export const SearchHidden = z.object({ id: Id, hidden: z.boolean() });

// ── Bildirimler ──────────────────────────────────────────────────────────────

/** Time slots [DECIDED 2026-11-18]: ALWAYS alone, or any of MORNING 08–12, NOON 12–17, EVENING 17–22. */
export const TimeSlot = z.enum(["ALWAYS", "MORNING", "NOON", "EVENING"]);
export const TimeSlots = z
  .array(TimeSlot)
  .min(1)
  .refine((slots) => new Set(slots).size === slots.length, { message: "duplicate slot" })
  .refine((slots) => !slots.includes("ALWAYS") || slots.length === 1, { message: "ALWAYS is exclusive" });

/**
 * One row of the type × channel matrix. A row may cover two notification types ("İade süresi",
 * "Fiyat düştü · hedefe ulaştı") and switches both. Locked rows ("kapatılamaz") cannot change.
 * "Göster'den sonra fiyat arttı" and "bildirimin sonucu" have no row: always on [DECIDED 2026-11-18].
 */
export const NotificationRowKey = z.enum([
  "DEAL_FOUND",
  "DEAL_ENDED",
  "RETURN",
  "DELIVERY_PROMPT",
  "PRICE_DROP_TARGET",
  "BACK_IN_STOCK",
  "TRACKING_EXPIRING",
  "SAVING_RECORDED",
  "SEARCHED_PRODUCT_DROP",
  "ACCOUNT_SECURITY",
  "ADMIN_FRAUD_CASE",
  "ADMIN_SOURCE_ALERT",
  "ADMIN_BUDGET",
  "ADMIN_PENDING_DIGEST",
  "ADMIN_ROLE_CHANGED",
]);
export type NotificationRowKey = z.infer<typeof NotificationRowKey>;
export const NotificationChannel = z.enum(["IN_APP", "EMAIL"]);

export const NotificationRow = z.object({
  key: NotificationRowKey,
  group: z.enum(["ADMIN", "OWN"]),
  /** The notification types the row switches (`notifications.type`). */
  types: z.array(z.string().min(1)).min(1),
  inApp: z.boolean(),
  email: z.boolean(),
  locked: z.boolean(),
});

/** `GET /me/notification-preferences`. */
export const NotificationPreferences = z.object({
  delivery: z.enum(["INSTANT", "DIGEST"]),
  /** `notify.digest_time` in the user's local time ("19:00"). */
  digestTime: z.string().regex(/^\d{2}:\d{2}$/),
  slots: TimeSlots,
  dailyCap: z.object({ limit: z.number().int().positive(), usedToday: z.number().int().nonnegative() }),
  rows: z.array(NotificationRow),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;

/** `PUT /me/notification-preferences` — what changed (switches save at once). */
export const UpdateNotificationPreferences = z
  .object({
    delivery: z.enum(["INSTANT", "DIGEST"]).optional(),
    slots: TimeSlots.optional(),
    switches: z.array(z.object({ key: NotificationRowKey, channel: NotificationChannel, enabled: z.boolean() })).min(1).optional(),
  })
  .refine((body) => body.delivery !== undefined || body.slots !== undefined || body.switches !== undefined, { message: "nothing to change" });

// ── Gizlilik ve çerezler ─────────────────────────────────────────────────────

/** `GET|PUT /me/cookie-consent` — necessary always on; analytics and marketing off by default. */
export const CookieConsent = z.object({ necessary: z.literal(true), analytics: z.boolean(), marketing: z.boolean(), version: z.string().min(1), decidedAt: Timestamp.nullable() });
export const UpdateCookieConsent = z.object({ analytics: z.boolean(), marketing: z.boolean() });

// ── Verilerim ve hesap ───────────────────────────────────────────────────────

/** `POST|GET /me/export` — a ZIP (JSON inside), downloadable `account.export_download_days` (7). */
export const DataExport = z.object({
  id: Id,
  status: z.enum(["PREPARING", "READY", "EXPIRED"]),
  requestedAt: Timestamp,
  readyAt: Timestamp.nullable(),
  expiresAt: Timestamp.nullable(),
});
export type DataExport = z.infer<typeof DataExport>;
export const LatestExport = z.object({ export: DataExport.nullable() });
/** `POST /me/export/:id/link` — a short-lived download link of a READY export ("İndir (ZIP)"). */
export const ExportLink = z.object({ url: z.url(), expiresAt: Timestamp });

/** `GET /me/deletion-preview` — what the delete dialog lists; `blocked` for the last Application Manager. */
export const DeletionPreview = z.object({
  activeTracking: z.number().int().nonnegative(),
  tokenBalance: z.number().int().nonnegative(),
  pendingRequests: z.number().int().nonnegative(),
  restoreUntil: Timestamp,
  blocked: z.enum(["ROLE_HANDOVER"]).nullable(),
});
export type DeletionPreview = z.infer<typeof DeletionPreview>;

/** `DELETE /me` — after the checkbox and re-authentication; signs out; everything returns within 30 days. */
export const DeleteAccountRequest = z.object({ confirmed: z.literal(true) });
export const DeletionScheduled = z.object({ status: z.literal("DELETION_SCHEDULED"), purgeAfter: Timestamp });

// ── Application Manager ──────────────────────────────────────────────────────

/** `GET /me/permissions` — "Yetkilerim": role card and the official keys by group (read-only). */
export const OwnPermissions = z.object({
  role: RoleCode,
  /** "2 Uygulama Yöneticisinden biri". */
  holders: z.number().int().positive(),
  groups: z.array(z.object({ id: z.string().min(1), granted: z.array(PermissionKey), total: z.number().int().nonnegative() })),
});
export type OwnPermissions = z.infer<typeof OwnPermissions>;

export const AdminActivityType = z.enum(["HIDDEN_SELLER", "PII", "SETTING", "USER_ACTION"]);
export const AdminActivityQuery = z.object({ q: z.string().trim().max(80).optional(), type: AdminActivityType.optional(), cursor: Cursor.optional() });

/**
 * One own audit entry (`audit_logs`), structured — the client words it. `action` is the audit
 * action code; the subject is a user (by number), a product (with its image) or a setting.
 */
export const AdminActivityItem = z.object({
  id: Id,
  type: AdminActivityType,
  action: z.string().min(1),
  subject: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("USER"), userNumber: z.number().int().positive() }),
    z.object({ kind: z.literal("PRODUCT"), id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable() }),
    z.object({ kind: z.literal("SETTING"), key: z.string().min(1), from: z.string(), to: z.string() }),
  ]),
  /** Reason given (personal data, hidden seller): a support request number etc. */
  reasonRef: z.string().min(1).nullable(),
  openMinutes: z.number().int().positive().nullable(),
  occurredAt: Timestamp,
});
export type AdminActivityItem = z.infer<typeof AdminActivityItem>;
export const AdminActivity = z.object({
  items: z.array(AdminActivityItem),
  facets: z.object({ types: z.object({ ALL: z.number().int().nonnegative(), HIDDEN_SELLER: z.number().int().nonnegative(), PII: z.number().int().nonnegative(), SETTING: z.number().int().nonnegative(), USER_ACTION: z.number().int().nonnegative() }) }),
});
export type AdminActivity = z.infer<typeof AdminActivity>;
