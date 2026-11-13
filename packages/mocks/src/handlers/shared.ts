// Helpers shared by the mock route handlers.
import type { EntitlementSummary, StreamEvent } from "@firsatgeldi/contracts";
import { toCalendarDay } from "@firsatgeldi/core";
import { USERS, type UserFixture } from "../fixtures/users";
import { MockApiError } from "../route";
import { PLAN_LIMITS, REVEAL_GATE_STAGE } from "../settings";
import type { Actor, MockController } from "../state";

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
    checkNow: { used: 0, limit: limits.dailyCheckLimit },
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
