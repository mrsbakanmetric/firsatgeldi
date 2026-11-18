// Settings and Account (modules.md Settings and Account; architecture.md §16 ME, §17; design
// "9 Ayarlar" v2.1; decisions 2026-11-18). Per-user rows are created on first use from the
// fixtures. Personal data: e-mail and phone stay masked; the full own values come only from
// `GET /me/pii` inside the re-authentication window, and every reveal writes an activity row.
// No row holds a full e-mail, phone or password (metadata keeps the e-mail domain at most).
import {
  type AccountAccess,
  type AdminActivityItem,
  type NotificationPreferences,
  type NotificationRowKey,
  PERMISSION_KEYS,
  type SessionView,
  USERNAME_PATTERN,
} from "@firsatgeldi/contracts";
import { emailDomain, maskEmail, passwordAccepted } from "@firsatgeldi/core";
import { http, HttpResponse } from "msw";
import { PRODUCTS } from "../fixtures/catalog";
import { ADMIN_ACTIVITY_SEEDS, APP_MANAGER_HOLDERS, NOTIFICATIONS_TODAY, SESSION_SEEDS, SIGN_IN_SEEDS, TAKEN_USERNAMES } from "../fixtures/settings";
import { pick } from "../fixtures/text";
import { USERS } from "../fixtures/users";
import { newId, sha256For, uuidFor } from "../ids";
import { MockApiError, permissionsOf, route } from "../route";
import { MOCK_SETTINGS, SYSTEM_SETTINGS } from "../settings";
import type { Actor, AuthAccountRow, MockController, NotificationPrefsRow } from "../state";
import { checkPassword, closeSession, issueLink } from "./auth";
import { accessOf, accountOf, entitlements, fold, meView, profileOf, requireUser, tokens } from "./shared";

type UserActor = Extract<Actor, { kind: "user" }>;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const iso = (date: Date) => date.toISOString();
const later = (now: Date, ms: number) => new Date(now.getTime() + ms);

function userActor(actor: Actor): UserActor {
  requireUser(actor);
  return actor as UserActor;
}

/** The sign-in account; fixture users always have one (sign-in fixtures). */
function requireAccount(controller: MockController, actor: UserActor): AuthAccountRow {
  const account = accountOf(controller, actor);
  if (!account) throw new MockApiError("NOT_FOUND");
  return account;
}

/** Sensitive actions need a re-authentication inside `pii.reauth_minutes` [DECIDED 2026-11-18]. */
function requireReauth(controller: MockController, actor: UserActor, now: Date): void {
  const until = accessOf(controller, actor).reauthUntil;
  if (!until || new Date(until) <= now) throw new MockApiError("REAUTH_REQUIRED");
}

function accessView(controller: MockController, actor: UserActor, now: Date): AccountAccess {
  const account = requireAccount(controller, actor);
  const access = accessOf(controller, actor);
  const user = USERS[actor.userKey];
  const cooldown = SYSTEM_SETTINGS["auth.resend_cooldown_seconds"];
  const pending = access.pendingEmail;
  return {
    emailMasked: maskEmail(account.email),
    emailVerified: account.state !== "UNVERIFIED",
    pendingEmail: pending
      ? { emailMasked: maskEmail(pending.email), sentAt: pending.sentAt, resendAfterSeconds: Math.max(0, Math.ceil(cooldown - (now.getTime() - new Date(pending.sentAt).getTime()) / MS_PER_SECOND)) }
      : null,
    phoneMasked: user.phoneMasked,
    password: { set: account.password !== null, changedAt: access.passwordChangedAt },
    identities: (["GOOGLE", "APPLE"] as const).map((provider) => ({ provider, linked: access.identities.has(provider) })),
    twoFactor: user.roles.includes("APP_MANAGER") ? { required: true, enabled: true } : null,
    reauthUntil: access.reauthUntil && new Date(access.reauthUntil) > now ? access.reauthUntil : null,
  };
}

// ── Username ─────────────────────────────────────────────────────────────────

function usernameTaken(controller: MockController, actor: UserActor, username: string): boolean {
  if (TAKEN_USERNAMES.includes(username)) return true;
  const fixtures = Object.values(USERS).filter((user) => user.id !== actor.userId).map((user) => controller.state.profiles.get(user.id)?.username ?? user.username);
  const changed = [...controller.state.profiles.entries()].filter(([id]) => id !== actor.userId).map(([, row]) => row.username);
  return [...fixtures, ...changed].includes(username);
}

function suggestions(controller: MockController, actor: UserActor, wanted: string): string[] {
  const base = wanted.replace(/[^a-z0-9_.]/g, "").slice(0, 17) || "kullanici";
  const candidates = [`${base}.tr`, `${base}_`, ...Array.from({ length: 9 }, (_, index) => `${base}${index + 1}`)];
  return candidates.filter((candidate) => USERNAME_PATTERN.test(candidate) && !usernameTaken(controller, actor, candidate)).slice(0, 3);
}

function changeableFrom(controller: MockController, actor: UserActor): Date | null {
  const changedAt = profileOf(controller, actor).usernameChangedAt;
  return changedAt ? new Date(new Date(changedAt).getTime() + SYSTEM_SETTINGS["username.change_days"] * MS_PER_DAY) : null;
}

// ── Notification preferences ─────────────────────────────────────────────────

const ROWS: readonly { key: NotificationRowKey; group: "ADMIN" | "OWN"; types: readonly string[]; locked: boolean; emailDefault: boolean }[] = [
  { key: "ADMIN_FRAUD_CASE", group: "ADMIN", types: ["ADMIN_FRAUD_CASE"], locked: true, emailDefault: true },
  { key: "ADMIN_SOURCE_ALERT", group: "ADMIN", types: ["ADMIN_SOURCE_ALERT"], locked: false, emailDefault: true },
  { key: "ADMIN_BUDGET", group: "ADMIN", types: ["ADMIN_BUDGET"], locked: false, emailDefault: true },
  { key: "ADMIN_PENDING_DIGEST", group: "ADMIN", types: ["ADMIN_PENDING_DIGEST"], locked: false, emailDefault: true },
  { key: "ADMIN_ROLE_CHANGED", group: "ADMIN", types: ["ADMIN_ROLE_CHANGED"], locked: true, emailDefault: true },
  { key: "DEAL_FOUND", group: "OWN", types: ["DEAL_FOUND"], locked: false, emailDefault: true },
  { key: "DEAL_ENDED", group: "OWN", types: ["DEAL_ENDED"], locked: false, emailDefault: true },
  // Combined rows switch both types together [DECIDED 2026-11-18].
  { key: "RETURN", group: "OWN", types: ["DEADLINE_SOON", "RETURN_REMINDER"], locked: false, emailDefault: true },
  { key: "DELIVERY_PROMPT", group: "OWN", types: ["DELIVERY_PROMPT"], locked: false, emailDefault: true },
  { key: "PRICE_DROP_TARGET", group: "OWN", types: ["PRICE_DROP", "TARGET_REACHED"], locked: false, emailDefault: true },
  { key: "BACK_IN_STOCK", group: "OWN", types: ["BACK_IN_STOCK"], locked: false, emailDefault: true },
  { key: "TRACKING_EXPIRING", group: "OWN", types: ["TRACKING_EXPIRING"], locked: false, emailDefault: true },
  { key: "SAVING_RECORDED", group: "OWN", types: ["SAVING_RECORDED"], locked: false, emailDefault: true },
  // "Aradığın ürün ucuzladı" e-mail is off by default [DECIDED 2026-11-13].
  { key: "SEARCHED_PRODUCT_DROP", group: "OWN", types: ["SEARCHED_PRODUCT_DROP"], locked: false, emailDefault: false },
  { key: "ACCOUNT_SECURITY", group: "OWN", types: ["WELCOME", "VERIFY_EMAIL", "NEW_DEVICE_SIGNIN", "PASSWORD_CHANGED", "IDENTITY_LINKED", "DELETION_STARTED", "PACKAGE_REQUEST_RESULT"], locked: true, emailDefault: true },
];

function prefsOf(controller: MockController, actor: UserActor): NotificationPrefsRow {
  let row = controller.state.notificationPrefs.get(actor.userId);
  if (!row) {
    row = { delivery: "INSTANT", slots: ["ALWAYS"], switches: new Map() };
    controller.state.notificationPrefs.set(actor.userId, row);
  }
  return row;
}

function rowsFor(actor: UserActor) {
  const admin = permissionsOf(actor).includes("admin.notifications.receive");
  return ROWS.filter((row) => row.group === "OWN" || admin);
}

function preferencesView(controller: MockController, actor: UserActor): NotificationPreferences {
  const prefs = prefsOf(controller, actor);
  const value = (key: NotificationRowKey, channel: "IN_APP" | "EMAIL", fallback: boolean) => prefs.switches.get(`${key}:${channel}`) ?? fallback;
  return {
    delivery: prefs.delivery,
    digestTime: SYSTEM_SETTINGS["notify.digest_time"],
    slots: [...prefs.slots],
    dailyCap: { limit: SYSTEM_SETTINGS["notify.daily_cap"], usedToday: NOTIFICATIONS_TODAY[actor.userKey] ?? 0 },
    rows: rowsFor(actor).map((row) => ({
      key: row.key,
      group: row.group,
      types: [...row.types],
      inApp: row.locked || value(row.key, "IN_APP", true),
      email: row.locked || value(row.key, "EMAIL", row.emailDefault),
      locked: row.locked,
    })),
  };
}

// ── Security ─────────────────────────────────────────────────────────────────

function sessionsOf(controller: MockController, actor: UserActor, now: Date) {
  let rows = controller.state.sessions.filter((row) => row.userId === actor.userId);
  if (rows.length === 0) {
    rows = SESSION_SEEDS.map((seed, index) => ({
      id: uuidFor(`session:${actor.userId}:${index}`),
      userId: actor.userId,
      deviceType: seed.deviceType,
      browser: seed.browser,
      os: seed.os,
      lastUsedAt: iso(new Date(now.getTime() - seed.minutesAgo * MS_PER_MINUTE)),
      current: index === 0,
      revokedAt: null,
    }));
    controller.state.sessions.push(...rows);
  }
  return rows.filter((row) => row.revokedAt === null);
}

/** Signs out every device of the user except the current one; returns how many. */
function revokeOthers(controller: MockController, actor: UserActor, now: Date): number {
  const others = sessionsOf(controller, actor, now).filter((row) => !row.current);
  for (const row of others) row.revokedAt = iso(now);
  return others.length;
}

// ── Admin ────────────────────────────────────────────────────────────────────

const ADMIN_PREFIX = "admin.";

function adminActivity(controller: MockController, locale: "tr" | "en", now: Date): AdminActivityItem[] {
  return ADMIN_ACTIVITY_SEEDS.map((seed, index) => {
    const subject =
      seed.subject.kind === "PRODUCT"
        ? { kind: "PRODUCT" as const, id: PRODUCTS[seed.subject.productKey].id, name: pick(PRODUCTS[seed.subject.productKey].name, locale), imageSha256: PRODUCTS[seed.subject.productKey].imageSha256 }
        : seed.subject;
    return { id: uuidFor(`admin-activity:${index}`), type: seed.type, action: seed.action, subject, reasonRef: seed.reasonRef, openMinutes: seed.openMinutes, occurredAt: iso(new Date(now.getTime() - seed.minutesAgo * MS_PER_MINUTE)) };
  });
}

/** Avatar images the mock serves (sha → set when a photo is saved). */
export function avatarShas(controller: MockController): Set<string> {
  return new Set([...controller.state.profiles.values()].map((row) => row.avatarSha256).filter((sha): sha is string => sha !== null));
}

/** A tiny valid empty ZIP for the mock download. */
const EMPTY_ZIP = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...new Array<number>(18).fill(0)]);
export const MOCK_FILES_PATH = "/mock-files";

export function settingsHandlers(controller: MockController) {
  const { state } = controller;
  return [
    // ── Profil ──
    route(controller, "updateMe", ({ actor, body, now, note }) => {
      const user = userActor(actor);
      const profile = profileOf(controller, user);
      const fields = Object.keys(body).filter((key) => body[key as keyof typeof body] !== undefined);
      note({ metadata: { section: "profile", fields } });
      if (body.username !== undefined && body.username !== profile.username) {
        if (usernameTaken(controller, user, body.username)) throw new MockApiError("USERNAME_TAKEN");
        const from = changeableFrom(controller, user);
        if (profile.username !== null && from && from > now) throw new MockApiError("USERNAME_LOCKED", { params: { availableOn: iso(from) } });
        profile.username = body.username;
        profile.usernameChangedAt = iso(now);
      }
      if (body.avatarUploadId !== undefined) {
        if (body.avatarUploadId === null) profile.avatarSha256 = null;
        else {
          const upload = state.uploads.get(body.avatarUploadId);
          if (!upload || upload.purpose !== "AVATAR" || upload.status !== "READY" || upload.owner.kind !== "user" || upload.owner.userId !== user.userId) {
            throw new MockApiError("VALIDATION", { fields: { avatarUploadId: "errors.validation" } });
          }
          profile.avatarSha256 = sha256For(`avatar:${upload.id}`);
        }
      }
      if (body.displayName !== undefined) profile.displayName = body.displayName;
      if (body.locale !== undefined) profile.locale = body.locale;
      if (body.theme !== undefined) profile.theme = body.theme;
      if (body.privacyLevel !== undefined) profile.privacyLevel = body.privacyLevel;
      return { data: meView(controller, user) };
    }),

    route(controller, "checkUsername", ({ actor, query, now }) => {
      const user = userActor(actor);
      const from = changeableFrom(controller, user);
      const own = profileOf(controller, user).username;
      if (own !== null && from && from > now && query.u !== own) return { data: { available: false, reason: "TOO_SOON", suggestions: [], changeableFrom: iso(from) } };
      if (!USERNAME_PATTERN.test(query.u)) return { data: { available: false, reason: "INVALID", suggestions: suggestions(controller, user, query.u), changeableFrom: null } };
      if (query.u !== own && usernameTaken(controller, user, query.u)) return { data: { available: false, reason: "TAKEN", suggestions: suggestions(controller, user, query.u), changeableFrom: null } };
      return { data: { available: true, reason: null, suggestions: [], changeableFrom: null } };
    }),

    // ── E-posta ve şifre ──
    route(controller, "getAccess", ({ actor, now }) => ({ data: accessView(controller, userActor(actor), now) })),

    route(controller, "reauth", ({ actor, body, now, note }) => {
      const user = userActor(actor);
      const account = requireAccount(controller, user);
      const access = accessOf(controller, user);
      note({ metadata: { method: body.method } });
      if (body.method === "PASSWORD") checkPassword(controller, account.email, body.password, now);
      // Phase 1: the provider answers in the mock; only a linked provider can confirm the user.
      else if (!access.identities.has(body.method)) throw new MockApiError("INVALID_CREDENTIALS");
      access.reauthUntil = iso(later(now, SYSTEM_SETTINGS["pii.reauth_minutes"] * MS_PER_MINUTE));
      return { data: { validUntil: access.reauthUntil } };
    }),

    route(controller, "getOwnPii", ({ actor, now, note }) => {
      const user = userActor(actor);
      requireReauth(controller, user, now);
      const account = requireAccount(controller, user);
      note({ metadata: { fields: USERS[user.userKey].phone ? ["email", "phone"] : ["email"] } });
      return { data: { email: account.email, phone: USERS[user.userKey].phone, visibleUntil: iso(later(now, SYSTEM_SETTINGS["pii.self_reveal_seconds"] * MS_PER_SECOND)) } };
    }),

    route(controller, "changeEmail", ({ actor, body, now, note }) => {
      const user = userActor(actor);
      requireReauth(controller, user, now);
      const account = requireAccount(controller, user);
      note({ metadata: { emailDomain: emailDomain(body.email) } });
      if (body.email === account.email) throw new MockApiError("VALIDATION", { fields: { email: "errors.validation" } });
      // The same answer whether or not another account uses the address (no enumeration).
      accessOf(controller, user).pendingEmail = { email: body.email, sentAt: iso(now) };
      if (!state.accounts.has(body.email)) issueLink(controller, "CHANGE_EMAIL", body.email, now, account.email);
      return { data: accessView(controller, user, now) };
    }),

    route(controller, "resendEmailChange", ({ actor, now }) => {
      const user = userActor(actor);
      const access = accessOf(controller, user);
      if (!access.pendingEmail) throw new MockApiError("NOT_FOUND");
      const waited = (now.getTime() - new Date(access.pendingEmail.sentAt).getTime()) / MS_PER_SECOND;
      const cooldown = SYSTEM_SETTINGS["auth.resend_cooldown_seconds"];
      if (waited < cooldown) throw new MockApiError("RATE_LIMITED", { params: { retryAfterSeconds: Math.ceil(cooldown - waited) } });
      access.pendingEmail = { email: access.pendingEmail.email, sentAt: iso(now) };
      if (!state.accounts.has(access.pendingEmail.email)) issueLink(controller, "CHANGE_EMAIL", access.pendingEmail.email, now, requireAccount(controller, user).email);
      return { data: accessView(controller, user, now) };
    }),

    route(controller, "cancelEmailChange", ({ actor, now }) => {
      const user = userActor(actor);
      const access = accessOf(controller, user);
      const pending = access.pendingEmail;
      if (!pending) throw new MockApiError("NOT_FOUND");
      for (const row of state.emailTokens) if (row.purpose === "CHANGE_EMAIL" && row.email === pending.email && row.usedAt === null) row.usedAt = iso(now);
      access.pendingEmail = null;
      return { data: accessView(controller, user, now) };
    }),

    route(controller, "changePassword", ({ actor, body, now, note }) => {
      const user = userActor(actor);
      const account = requireAccount(controller, user);
      if (account.password === null) throw new MockApiError("VALIDATION", { fields: { currentPassword: "errors.validation" } });
      checkPassword(controller, account.email, body.currentPassword, now);
      if (!passwordAccepted(body.newPassword, SYSTEM_SETTINGS["auth.password_min_length"])) throw new MockApiError("VALIDATION", { fields: { newPassword: "errors.validation" } });
      account.password = body.newPassword;
      accessOf(controller, user).passwordChangedAt = iso(now);
      // The other devices are signed out; this one stays [DECIDED 2026-11-18].
      const revoked = revokeOthers(controller, user, now);
      state.sessionRevocations.push({ userId: user.userId, at: iso(now) });
      note({ metadata: { otherSessionsRevoked: revoked } });
      return { data: { status: "PASSWORD_CHANGED", otherSessionsRevoked: revoked } };
    }),

    route(controller, "createPasswordLink", ({ actor, now }) => {
      const user = userActor(actor);
      const account = requireAccount(controller, user);
      if (account.password !== null) throw new MockApiError("VALIDATION");
      issueLink(controller, "RESET_PASSWORD", account.email, now);
      return { data: { emailMasked: maskEmail(account.email), resendAfterSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] } };
    }),

    route(controller, "linkIdentity", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      const provider = params.provider === "google" ? "GOOGLE" : "APPLE";
      accessOf(controller, user).identities.add(provider);
      note({ metadata: { provider } });
      return { data: accessView(controller, user, now) };
    }),

    route(controller, "unlinkIdentity", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      const provider = params.provider === "google" ? "GOOGLE" : "APPLE";
      const access = accessOf(controller, user);
      note({ metadata: { provider } });
      // Removing the only way to sign in is refused ("Önce şifre oluştur").
      const others = [...access.identities].filter((value) => value !== provider).length;
      if (requireAccount(controller, user).password === null && others === 0) throw new MockApiError("LAST_SIGN_IN_METHOD");
      access.identities.delete(provider);
      return { data: accessView(controller, user, now) };
    }),

    // ── Güvenlik ve cihazlar ──
    route(controller, "getSecurity", ({ actor, now }) => {
      const user = userActor(actor);
      const sessions: SessionView[] = sessionsOf(controller, user, now)
        .map((row) => ({ id: row.id, deviceType: row.deviceType, browser: row.browser, os: row.os, lastUsedAt: row.lastUsedAt, current: row.current }))
        .sort((a, b) => Number(b.current) - Number(a.current) || b.lastUsedAt.localeCompare(a.lastUsedAt));
      const signIns = SIGN_IN_SEEDS.map((seed, index) => ({
        id: uuidFor(`sign-in:${user.userId}:${index}`),
        method: seed.method,
        outcome: seed.outcome,
        failedCount: seed.failedCount,
        newDevice: seed.newDevice,
        deviceType: seed.deviceType,
        browser: seed.browser,
        os: seed.os,
        occurredAt: iso(new Date(now.getTime() - seed.minutesAgo * MS_PER_MINUTE)),
      }));
      return { data: { sessions, signIns } };
    }),

    route(controller, "revokeSession", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      const row = sessionsOf(controller, user, now).find((session) => session.id === params.id);
      if (!row) throw new MockApiError("NOT_FOUND");
      if (row.current) throw new MockApiError("VALIDATION");
      row.revokedAt = iso(now);
      note({ targetType: "session", targetId: row.id });
      return { data: { revoked: 1 } };
    }),

    route(controller, "signOutOthers", ({ actor, now, note }) => {
      const revoked = revokeOthers(controller, userActor(actor), now);
      note({ metadata: { revoked } });
      return { data: { revoked } };
    }),

    // ── Arama geçmişi ──
    route(controller, "hideSearch", ({ actor, params, note }) => {
      userActor(actor);
      state.hiddenSearches.add(params.id);
      note({ targetType: "search", targetId: params.id });
      return { data: { id: params.id, hidden: true } };
    }),
    route(controller, "unhideSearch", ({ actor, params, note }) => {
      userActor(actor);
      state.hiddenSearches.delete(params.id);
      note({ targetType: "search", targetId: params.id });
      return { data: { id: params.id, hidden: false } };
    }),

    // ── Bildirimler ──
    route(controller, "getNotificationPreferences", ({ actor }) => ({ data: preferencesView(controller, userActor(actor)) })),

    route(controller, "updateNotificationPreferences", ({ actor, body, note }) => {
      const user = userActor(actor);
      const prefs = prefsOf(controller, user);
      const allowed = new Map(rowsFor(user).map((row) => [row.key, row]));
      for (const change of body.switches ?? []) {
        const row = allowed.get(change.key);
        if (!row || row.locked) throw new MockApiError("VALIDATION", { fields: { switches: "errors.validation" } });
      }
      if (body.delivery) prefs.delivery = body.delivery;
      if (body.slots) prefs.slots = [...body.slots];
      for (const change of body.switches ?? []) prefs.switches.set(`${change.key}:${change.channel}`, change.enabled);
      note({ metadata: { section: "notifications", delivery: body.delivery ?? null, slots: body.slots ?? null, switches: body.switches?.length ?? 0 } });
      return { data: preferencesView(controller, user) };
    }),

    // ── Gizlilik ve çerezler ──
    route(controller, "getCookieConsent", ({ actor }) => {
      const user = userActor(actor);
      const row = state.cookieConsents.get(user.userId);
      return { data: { necessary: true, analytics: row?.analytics ?? false, marketing: row?.marketing ?? false, version: SYSTEM_SETTINGS["legal.cookie_version"], decidedAt: row?.decidedAt ?? null } };
    }),
    route(controller, "updateCookieConsent", ({ actor, body, now, note }) => {
      const user = userActor(actor);
      const row = { analytics: body.analytics, marketing: body.marketing, version: SYSTEM_SETTINGS["legal.cookie_version"], decidedAt: iso(now) };
      state.cookieConsents.set(user.userId, row);
      note({ metadata: { analytics: row.analytics, marketing: row.marketing, version: row.version } });
      return { data: { necessary: true, ...row } };
    }),

    // ── Verilerim ve hesap ──
    route(controller, "requestExport", ({ actor, now, note }) => {
      const user = userActor(actor);
      const id = newId();
      const row = { id, userId: user.userId, requestedAt: iso(now), readyAt: null as string | null };
      state.dataExports.push(row);
      // Prepared in the background; ready → notification + e-mail (Phase 2).
      controller.schedule(() => {
        row.readyAt = iso(controller.now());
      }, MOCK_SETTINGS.exportMs);
      note({ targetType: "data_export", targetId: id });
      return { data: exportView(row, now) };
    }),
    route(controller, "getLatestExport", ({ actor, now }) => {
      const user = userActor(actor);
      const row = state.dataExports.filter((entry) => entry.userId === user.userId).at(-1);
      return { data: { export: row ? exportView(row, now) : null } };
    }),
    route(controller, "getExportLink", ({ actor, params, now, origin, note }) => {
      const user = userActor(actor);
      const row = state.dataExports.find((entry) => entry.id === params.id && entry.userId === user.userId);
      if (!row) throw new MockApiError("NOT_FOUND");
      if (exportView(row, now).status !== "READY") throw new MockApiError("VALIDATION");
      note({ targetType: "data_export", targetId: row.id });
      return { data: { url: `${origin}${MOCK_FILES_PATH}/export-${row.id}.zip`, expiresAt: iso(later(now, MOCK_SETTINGS.exportLinkMinutes * MS_PER_MINUTE)) } };
    }),

    route(controller, "getDeletionPreview", ({ actor, now }) => {
      const user = userActor(actor);
      const manager = USERS[user.userKey].roles.includes("APP_MANAGER");
      return {
        data: {
          activeTracking: state.trackedItems.filter((row) => row.userId === user.userId && row.state === "ACTIVE").length,
          tokenBalance: entitlements(controller, user).tokenBalance,
          // No package request table in Phase 1 yet: none pending.
          pendingRequests: 0,
          restoreUntil: iso(later(now, SYSTEM_SETTINGS["account.deletion_restore_days"] * MS_PER_DAY)),
          blocked: manager ? "ROLE_HANDOVER" : null,
        },
      };
    }),

    route(controller, "deleteAccount", ({ actor, now, note }) => {
      const user = userActor(actor);
      if (USERS[user.userKey].roles.includes("APP_MANAGER")) throw new MockApiError("ROLE_HANDOVER_REQUIRED");
      requireReauth(controller, user, now);
      const account = requireAccount(controller, user);
      const purgeAfter = iso(later(now, SYSTEM_SETTINGS["account.deletion_restore_days"] * MS_PER_DAY));
      account.state = "PENDING_DELETION";
      account.deletionRequestedAt = iso(now);
      account.purgeAfter = purgeAfter;
      note({ metadata: { purgeAfter } });
      // Closed at once and signed out; everything returns on "Hesabımı geri aç" within the period.
      closeSession(controller);
      return { data: { status: "DELETION_SCHEDULED", purgeAfter } };
    }),

    // ── Application Manager ──
    route(controller, "getOwnPermissions", ({ actor }) => {
      const user = userActor(actor);
      const granted = new Set(permissionsOf(user));
      const groups = new Map<string, { granted: string[]; total: number }>();
      for (const key of PERMISSION_KEYS.filter((value) => value.startsWith(ADMIN_PREFIX))) {
        const id = key.split(".")[1] ?? "other";
        const group = groups.get(id) ?? { granted: [], total: 0 };
        group.total += 1;
        if (granted.has(key)) group.granted.push(key);
        groups.set(id, group);
      }
      return { data: { role: USERS[user.userKey].roles[0] ?? "USER", holders: APP_MANAGER_HOLDERS, groups: [...groups.entries()].map(([id, group]) => ({ id, granted: group.granted as (typeof PERMISSION_KEYS)[number][], total: group.total })) } };
    }),

    route(controller, "getAdminActivity", ({ actor, query, locale, now, empty }) => {
      userActor(actor);
      const all = empty ? [] : adminActivity(controller, locale, now);
      const wanted = tokens(query.q ?? "");
      const text = (item: AdminActivityItem) =>
        fold(`${item.action} ${item.reasonRef ?? ""} ${item.subject.kind === "USER" ? item.subject.userNumber : item.subject.kind === "PRODUCT" ? item.subject.name : item.subject.key}`);
      const matched = all.filter((item) => wanted.every((token) => text(item).includes(token)));
      const count = (type: AdminActivityItem["type"]) => matched.filter((item) => item.type === type).length;
      return {
        data: {
          items: query.type ? matched.filter((item) => item.type === query.type) : matched,
          facets: { types: { ALL: matched.length, HIDDEN_SELLER: count("HIDDEN_SELLER"), PII: count("PII"), SETTING: count("SETTING"), USER_ACTION: count("USER_ACTION") } },
        },
      };
    }),

    // The mock's download file (a signed storage link in Phase 2).
    http.get(`*${MOCK_FILES_PATH}/:file`, () => new HttpResponse(EMPTY_ZIP, { headers: { "Content-Type": "application/zip" } })),
  ];
}

function exportView(row: { id: string; requestedAt: string; readyAt: string | null }, now: Date) {
  const expiresAt = row.readyAt ? iso(later(new Date(row.readyAt), SYSTEM_SETTINGS["account.export_download_days"] * MS_PER_DAY)) : null;
  const status = !row.readyAt ? ("PREPARING" as const) : expiresAt && new Date(expiresAt) <= now ? ("EXPIRED" as const) : ("READY" as const);
  return { id: row.id, status, requestedAt: row.requestedAt, readyAt: row.readyAt, expiresAt };
}
