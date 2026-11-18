// Helpers shared by the mock route handlers.
import type { EntitlementSummary, Me, StreamEvent } from "@firsatgeldi/contracts";
import { maskEmail, toCalendarDay } from "@firsatgeldi/core";
import { PASSWORD_CHANGED_DAYS_AGO, USERNAME_CHANGED_DAYS_AGO } from "../fixtures/settings";
import { USERS, type UserFixture } from "../fixtures/users";
import { MockApiError, permissionsOf } from "../route";
import { PLAN_LIMITS, REVEAL_GATE_STAGE } from "../settings";
import type { AccessRow, Actor, AuthAccountRow, MockController, ProfileRow } from "../state";

type UserActor = Extract<Actor, { kind: "user" }>;
const MS_PER_DAY = 86_400_000;

/** The sign-in account of a user (by id, else the account that opens this fixture session). */
export function accountOf(controller: MockController, actor: UserActor): AuthAccountRow | null {
  const accounts = [...controller.state.accounts.values()];
  return accounts.find((row) => row.userId === actor.userId) ?? accounts.find((row) => row.session === actor.userKey && row.state === "ACTIVE") ?? null;
}

/** The editable profile (`users`), created from the fixture on first use. */
export function profileOf(controller: MockController, actor: UserActor): ProfileRow {
  let row = controller.state.profiles.get(actor.userId);
  if (!row) {
    const user = USERS[actor.userKey];
    row = {
      displayName: user.displayName,
      username: user.username,
      usernameChangedAt: user.username ? new Date(controller.now().getTime() - USERNAME_CHANGED_DAYS_AGO * MS_PER_DAY).toISOString() : null,
      avatarSha256: null,
      locale: user.locale,
      theme: "system",
      privacyLevel: "ONLY_ME",
    };
    controller.state.profiles.set(actor.userId, row);
  }
  return row;
}

/** E-mail change, password time, linked providers, re-authentication window; created on first use. */
export function accessOf(controller: MockController, actor: UserActor): AccessRow {
  let row = controller.state.access.get(actor.userId);
  if (!row) {
    const account = accountOf(controller, actor);
    row = {
      pendingEmail: null,
      passwordChangedAt: account?.password ? new Date(controller.now().getTime() - PASSWORD_CHANGED_DAYS_AGO * MS_PER_DAY).toISOString() : null,
      // Fixture users signed up with e-mail and later linked Google ("Google bağlı · Apple bağlı değil").
      identities: new Set(actor.userKey === "newUser" ? [] : ["GOOGLE"]),
      reauthUntil: null,
    };
    controller.state.access.set(actor.userId, row);
  }
  return row;
}

/** `GET /me` for a signed-in actor; also the `me` of a successful sign-in. E-mail and phone masked. */
export function meView(controller: MockController, actor: UserActor): Me {
  const user = USERS[actor.userKey];
  const profile = profileOf(controller, actor);
  const account = accountOf(controller, actor);
  return {
    id: actor.userId,
    displayName: profile.displayName,
    username: profile.username,
    emailMasked: account ? maskEmail(account.email) : user.emailMasked,
    phoneMasked: user.phoneMasked,
    locale: profile.locale,
    theme: profile.theme,
    privacyLevel: profile.privacyLevel,
    avatarSha256: profile.avatarSha256,
    roles: [...user.roles],
    permissions: permissionsOf(actor),
  };
}

export function requireUser(actor: Actor): { user: UserFixture; userId: string } {
  // The route already refused guests on non-public endpoints; this narrows the type.
  if (actor.kind !== "user") throw new MockApiError("UNAUTHENTICATED");
  return { user: USERS[actor.userKey], userId: actor.userId };
}

export function sameActor(a: Actor, b: Actor): boolean {
  return a.kind === "user" ? b.kind === "user" && a.userId === b.userId : b.kind === "guest" && a.anonId === b.anonId;
}

export function activeTrackingCount(controller: MockController, userId: string): number {
  return controller.state.trackedItems.filter((item) => item.userId === userId && item.state === "ACTIVE").length;
}

/** Today's (Europe/Istanbul) consumed Check Now runs (database.md §9 `check_now_usage`). */
export function checksUsedToday(controller: MockController, userId: string): number {
  const today = toCalendarDay(controller.now());
  return controller.state.checkNowUsage.filter((row) => row.userId === userId && row.consumed && toCalendarDay(new Date(row.createdAt)) === today).length;
}

/** Plan and allowances (database.md §9); reveals unlimited under the first-release FREE_TOGGLE gate. */
export function entitlements(controller: MockController, actor: Actor): EntitlementSummary {
  const { user, userId } = requireUser(actor);
  const limits = PLAN_LIMITS[user.plan];
  const month = toCalendarDay(controller.now()).slice(0, 7);
  const revealsThisMonth = controller.state.reveals.filter(
    (row) => row.userId === userId && row.action === "REVEAL" && toCalendarDay(new Date(row.createdAt)).startsWith(month),
  ).length;
  return {
    plan: user.plan,
    premiumEndsAt: null,
    tracking: { used: activeTrackingCount(controller, userId), limit: limits.maxActiveTracking },
    reveals: { used: revealsThisMonth, limit: REVEAL_GATE_STAGE === "FREE_TOGGLE" ? null : limits.monthlyRevealLimit },
    checkNow: { used: checksUsedToday(controller, userId), limit: user.roles.includes("APP_MANAGER") ? null : limits.dailyCheckLimit },
    tokenBalance: user.tokenBalance,
  };
}

/** Sends a live-update event to the actor's open streams and keeps it for the leak test. */
export function emit(controller: MockController, actor: Actor, event: StreamEvent): void {
  controller.state.streamLog.push({ actor, event });
  for (const subscriber of controller.state.subscribers) {
    if (sameActor(subscriber.actor, actor)) subscriber.send(event);
  }
}

const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_PATTERN = /\+?\d[\d\s()-]{8,}\d/g;
/** Placeholder written instead of an e-mail or phone in a stored search (database.md §11 `search_events.query_raw`). */
export const SCRUBBED = "[gizlendi]";

export function scrubPersonalData(query: string): string {
  return query.replace(EMAIL_PATTERN, SCRUBBED).replace(PHONE_PATTERN, SCRUBBED);
}

/**
 * Search folding: Turkish lower case, then dotless ı = i, so "insta360",
 * "Insta360" and "INSTA360" all match (tr lower-cases "I" to "ı").
 */
export function fold(value: string): string {
  return value.toLocaleLowerCase("tr").replace(/ı/g, "i");
}

/** Search tokens, folded. */
export function tokens(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean);
}
