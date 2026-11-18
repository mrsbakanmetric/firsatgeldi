// Sign-in and Sign-up (modules.md Sign-in and Sign-up; architecture.md §16 AUTH, §17; design
// "8 Giriş" v2.1): the mock sign-in of Phase 1. A successful sign-in switches the mock session
// (`config.session`), which the browser remembers; e-mails are not sent, their links go to
// `controller.onMail` (development prints them).
//
// No account enumeration [DECIDED 2026-11-18]: wrong password, unknown e-mail and a Google/Apple-only
// account all get the same INVALID_CREDENTIALS with the same attempt count (counted per e-mail as
// typed); sign-up, resend and "Şifremi unuttum" answer the same for every address; account states
// appear only after a correct password. Activity rows keep the e-mail domain, never the address.
import type { SignInResult } from "@firsatgeldi/contracts";
import { emailDomain, maskEmail, passwordAccepted } from "@firsatgeldi/core";
import { PROVIDER_SESSION } from "../fixtures/accounts";
import { USERS, type UserKey } from "../fixtures/users";
import { newId } from "../ids";
import { MockApiError, route } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import { type AuthAccountRow, type EmailTokenRow, type MockController, startGuestSession } from "../state";
import { meView } from "./shared";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

const iso = (date: Date) => date.toISOString();
const later = (now: Date, ms: number) => new Date(now.getTime() + ms);

/** Opens the mock session for a fixture user and remembers it (`fg-mock-config`). */
function openSession(controller: MockController, session: UserKey) {
  controller.config = { ...controller.config, session };
  controller.persist?.(controller.config);
  return meView(controller, { kind: "user", userKey: session, userId: USERS[session].id });
}

export function closeSession(controller: MockController) {
  controller.config = { ...controller.config, session: "guest" };
  startGuestSession(controller.state);
  controller.persist?.(controller.config);
}

/** What a correct password (or a verified link, a restore) leads to, by account state. */
function outcomeOf(controller: MockController, account: AuthAccountRow, now: Date, welcomeGift: number | null = null): SignInResult {
  const challengeFor = (kind: "PENDING_DELETION" | "SUSPENDED") => {
    const challenge = newId();
    controller.state.challenges.set(challenge, { email: account.email, kind, expiresAt: iso(later(now, SYSTEM_SETTINGS["auth.challenge_minutes"] * MS_PER_MINUTE)) });
    return challenge;
  };
  switch (account.state) {
    case "UNVERIFIED":
      return { status: "VERIFY_EMAIL", emailMasked: maskEmail(account.email) };
    case "PENDING_DELETION":
      return { status: "PENDING_DELETION", challenge: challengeFor("PENDING_DELETION"), requestedAt: account.deletionRequestedAt ?? iso(now), purgeAfter: account.purgeAfter ?? iso(now) };
    case "SUSPENDED":
      return { status: "SUSPENDED", challenge: challengeFor("SUSPENDED"), reasonKey: account.suspendedReason ?? "OTHER" };
    case "DELETED":
      throw new MockApiError("INVALID_CREDENTIALS");
    case "ACTIVE":
      return { status: "SIGNED_IN", me: openSession(controller, account.session), welcomeGift };
  }
}

/** A one-time link, "sent" by e-mail. */
export function issueLink(controller: MockController, purpose: EmailTokenRow["purpose"], email: string, now: Date, accountEmail?: string): void {
  const lifetime = purpose === "RESET_PASSWORD" ? SYSTEM_SETTINGS["auth.reset_link_minutes"] * MS_PER_MINUTE : SYSTEM_SETTINGS["auth.verify_link_hours"] * MS_PER_HOUR;
  const token = newId();
  controller.state.emailTokens.push({ token, purpose, email, ...(accountEmail ? { accountEmail } : {}), createdAt: iso(now), expiresAt: iso(later(now, lifetime)), usedAt: null });
  controller.onMail?.({ purpose, emailMasked: maskEmail(email), token });
}

/** A valid, unused link of that purpose; anything else is the one "link not valid" page. */
function linkOf(controller: MockController, purposes: EmailTokenRow["purpose"] | readonly EmailTokenRow["purpose"][], token: string, now: Date): { row: EmailTokenRow; account: AuthAccountRow } {
  const wanted: readonly EmailTokenRow["purpose"][] = typeof purposes === "string" ? [purposes] : purposes;
  const row = controller.state.emailTokens.find((entry) => entry.token === token && wanted.includes(entry.purpose));
  // An e-mail change link belongs to the account under its old address.
  const account = row ? controller.state.accounts.get(row.accountEmail ?? row.email) : undefined;
  if (!row || !account || row.usedAt !== null || new Date(row.expiresAt) <= now) throw new MockApiError("LINK_INVALID");
  return { row, account };
}

/**
 * Link requests (resend, forgot): the cooldown counts per e-mail as typed, known or not,
 * so "Çok sık denedin" never tells an existing account from a new one.
 */
function requestLink(controller: MockController, purpose: EmailTokenRow["purpose"], email: string, now: Date): { emailMasked: string; resendAfterSeconds: number } {
  const cooldown = SYSTEM_SETTINGS["auth.resend_cooldown_seconds"];
  const key = `${purpose}:${email}`;
  const last = controller.state.emailRequests.get(key);
  const waited = last ? (now.getTime() - new Date(last).getTime()) / MS_PER_SECOND : Number.POSITIVE_INFINITY;
  if (waited < cooldown) throw new MockApiError("RATE_LIMITED", { params: { retryAfterSeconds: Math.ceil(cooldown - waited) } });
  controller.state.emailRequests.set(key, iso(now));
  const account = controller.state.accounts.get(email);
  const sends = purpose === "VERIFY_EMAIL" ? account?.state === "UNVERIFIED" : account !== undefined && account.state !== "DELETED";
  if (sends) issueLink(controller, purpose, email, now);
  return { emailMasked: maskEmail(email), resendAfterSeconds: cooldown };
}

/** The choice after a correct password; expired or unknown → sign in again. */
function challengeOf(controller: MockController, challenge: string, kind: "PENDING_DELETION" | "SUSPENDED", now: Date): AuthAccountRow {
  const row = controller.state.challenges.get(challenge);
  const account = row ? controller.state.accounts.get(row.email) : undefined;
  if (!row || row.kind !== kind || new Date(row.expiresAt) <= now || !account) throw new MockApiError("UNAUTHENTICATED");
  return account;
}

function requireRules(password: string): void {
  if (!passwordAccepted(password, SYSTEM_SETTINGS["auth.password_min_length"])) throw new MockApiError("VALIDATION", { fields: { password: "errors.validation" } });
}

/**
 * The password check of e-mail sign-in, re-authentication and password change: attempts are
 * counted per e-mail as typed (known or not) and locked after `auth.lockout_attempts` for
 * `auth.lockout_minutes`. Wrong → INVALID_CREDENTIALS { remainingAttempts }; locked → LOCKED.
 */
export function checkPassword(controller: MockController, email: string, password: string, now: Date): AuthAccountRow {
  const { state } = controller;
  const account = state.accounts.get(email);
  const failures = state.loginFailures.get(email) ?? { failures: 0, lockedUntil: null };
  const lockedFor = failures.lockedUntil ? new Date(failures.lockedUntil).getTime() - now.getTime() : 0;
  if (lockedFor > 0) throw new MockApiError("LOCKED", { params: { retryAfterSeconds: Math.ceil(lockedFor / MS_PER_SECOND) } });
  if (account && account.state !== "DELETED" && account.password !== null && account.password === password) {
    state.loginFailures.delete(email);
    return account;
  }
  const limit = SYSTEM_SETTINGS["auth.lockout_attempts"];
  const count = (failures.lockedUntil ? 0 : failures.failures) + 1;
  if (count >= limit) {
    const minutes = SYSTEM_SETTINGS["auth.lockout_minutes"];
    state.loginFailures.set(email, { failures: count, lockedUntil: iso(later(now, minutes * MS_PER_MINUTE)) });
    throw new MockApiError("LOCKED", { params: { retryAfterSeconds: minutes * 60 } });
  }
  state.loginFailures.set(email, { failures: count, lockedUntil: null });
  throw new MockApiError("INVALID_CREDENTIALS", { params: { remainingAttempts: limit - count } });
}

export function authHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "getAuthPolicy", () => ({
      data: {
        passwordMinLength: SYSTEM_SETTINGS["auth.password_min_length"],
        resendCooldownSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"],
        welcomeGiftTokens: SYSTEM_SETTINGS["tokens.welcome_gift"],
        termsVersion: SYSTEM_SETTINGS["legal.terms_version"],
      },
    })),

    route(controller, "signIn", ({ body, now, note }) => {
      const { email, password } = body;
      const account = state.accounts.get(email);
      note({ ...(account ? { userId: account.userId } : {}), metadata: { method: "EMAIL", emailDomain: emailDomain(email) } });
      checkPassword(controller, email, password, now);
      const result = outcomeOf(controller, account as AuthAccountRow, now);
      note({ metadata: { method: "EMAIL", emailDomain: emailDomain(email), result: result.status } });
      return { data: result };
    }),

    // No provider window in Phase 1: the button signs in as the fixture user.
    route(controller, "signInWithGoogle", ({ note }) => {
      note({ userId: USERS[PROVIDER_SESSION].id, metadata: { method: "GOOGLE", result: "SIGNED_IN" } });
      return { data: { status: "SIGNED_IN", me: openSession(controller, PROVIDER_SESSION), welcomeGift: null } };
    }),
    route(controller, "signInWithApple", ({ note }) => {
      note({ userId: USERS[PROVIDER_SESSION].id, metadata: { method: "APPLE", result: "SIGNED_IN" } });
      return { data: { status: "SIGNED_IN", me: openSession(controller, PROVIDER_SESSION), welcomeGift: null } };
    }),

    route(controller, "signUp", ({ body, now, note }) => {
      const { email, password, termsVersion } = body;
      if (termsVersion !== SYSTEM_SETTINGS["legal.terms_version"]) throw new MockApiError("VALIDATION", { fields: { termsVersion: "errors.validation" } });
      requireRules(password);
      let account = state.accounts.get(email);
      if (!account) {
        account = { email, userId: newId(), session: "newUser", state: "UNVERIFIED", password, deletionRequestedAt: null, purgeAfter: null, suspendedReason: null, welcomeGiftGranted: false };
        state.accounts.set(email, account);
        state.userConsents.push({ userId: account.userId, termsVersion, acceptedAt: iso(now) });
        state.emailRequests.set(`VERIFY_EMAIL:${email}`, iso(now));
        issueLink(controller, "VERIFY_EMAIL", email, now);
      }
      // An existing address gets the same answer (the real API e-mails "you already have an account").
      note({ userId: account.userId, metadata: { emailDomain: emailDomain(email), termsVersion } });
      return { data: { emailMasked: maskEmail(email), resendAfterSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] } };
    }),

    route(controller, "verifyEmail", ({ body, now, note }) => {
      const link = linkOf(controller, ["VERIFY_EMAIL", "CHANGE_EMAIL"], body.token, now);
      const { row } = link;
      let { account } = link;
      row.usedAt = iso(now);
      if (row.purpose === "CHANGE_EMAIL") {
        // The new address replaces the old one only now (the old one stayed valid until the link was opened).
        state.accounts.delete(account.email);
        account = { ...account, email: row.email };
        state.accounts.set(account.email, account);
        const access = state.access.get(account.userId);
        if (access) access.pendingEmail = null;
      }
      if (account.state === "UNVERIFIED") account.state = "ACTIVE";
      let gift: number | null = null;
      if (!account.welcomeGiftGranted) {
        gift = SYSTEM_SETTINGS["tokens.welcome_gift"];
        account.welcomeGiftGranted = true;
        state.tokenLedger.push({ userId: account.userId, kind: "WELCOME", amount: gift, createdAt: iso(now) });
      }
      const result = outcomeOf(controller, account, now, gift);
      note({ userId: account.userId, metadata: { welcomeGift: gift, result: result.status } });
      return { data: result };
    }),

    route(controller, "resendVerification", ({ body, now, note }) => {
      note({ metadata: { emailDomain: emailDomain(body.email) } });
      return { data: requestLink(controller, "VERIFY_EMAIL", body.email, now) };
    }),

    route(controller, "forgotPassword", ({ body, now, note }) => {
      note({ metadata: { emailDomain: emailDomain(body.email) } });
      return { data: requestLink(controller, "RESET_PASSWORD", body.email, now) };
    }),

    route(controller, "getPasswordReset", ({ query, now }) => {
      const { account } = linkOf(controller, "RESET_PASSWORD", query.token, now);
      return { data: { emailMasked: maskEmail(account.email) } };
    }),

    route(controller, "resetPassword", ({ body, now, note }) => {
      const { row, account } = linkOf(controller, "RESET_PASSWORD", body.token, now);
      requireRules(body.password);
      row.usedAt = iso(now);
      account.password = body.password;
      state.loginFailures.delete(account.email);
      // Every device is signed out ("tüm cihazlardan çıkış yapıldı").
      state.sessionRevocations.push({ userId: account.userId, at: iso(now) });
      if (controller.config.session === account.session) closeSession(controller);
      note({ userId: account.userId, metadata: { sessionsRevoked: true } });
      return { data: { status: "PASSWORD_CHANGED", sessionsRevoked: true } };
    }),

    route(controller, "restoreAccount", ({ body, now, note }) => {
      const account = challengeOf(controller, body.challenge, "PENDING_DELETION", now);
      state.challenges.delete(body.challenge);
      account.state = "ACTIVE";
      note({ userId: account.userId });
      return { data: outcomeOf(controller, account, now) };
    }),

    route(controller, "keepDeletion", ({ body, now, note }) => {
      const account = challengeOf(controller, body.challenge, "PENDING_DELETION", now);
      state.challenges.delete(body.challenge);
      note({ userId: account.userId });
      return { data: { status: "DELETION_KEPT", purgeAfter: account.purgeAfter ?? iso(now) } };
    }),

    route(controller, "exportSuspendedAccount", ({ body, now, note }) => {
      const account = challengeOf(controller, body.challenge, "SUSPENDED", now);
      const requestId = newId();
      state.dataExports.push({ id: requestId, userId: account.userId, requestedAt: iso(now), readyAt: null });
      note({ userId: account.userId, targetType: "data_export", targetId: requestId });
      return { data: { status: "PREPARING", requestId } };
    }),

    route(controller, "signOut", () => {
      closeSession(controller);
      return { data: { status: "SIGNED_OUT" } };
    }),
  ];
}
