// Action logging (CLAUDE.md core rule 9; database.md §14, §14a). Every user
// action is written to the activity history; the API interceptor writes it
// asynchronously in Phase 2, the mock API keeps the same rows in memory.
import { z } from "zod";
import { Id, Timestamp } from "./common";

/**
 * Activity actions (database.md §14a `activity_events.action`). Listed there:
 * search, identify, upload, upload.status [DECIDED 2026-11-14], tracking.confirm,
 * reveal, offer.go … `seller_lookup`, `teaser` and `reveal.hide` are
 * [ASSUMPTION] names for Search and Add actions the docs do not name yet.
 */
export const ACTIVITY_ACTIONS = [
  "search",
  "identify",
  "upload",
  "upload.status",
  "seller_lookup",
  "teaser",
  "tracking.confirm",
  "reveal",
  "reveal.hide",
  "offer.go",
] as const;
export const ActivityAction = z.enum(ACTIVITY_ACTIONS);
export type ActivityAction = z.infer<typeof ActivityAction>;

/** Outcomes (database.md §14a `activity_events.outcome`). */
export const ActivityOutcome = z.enum(["OK", "DENIED", "LIMITED", "ERROR"]);
export type ActivityOutcome = z.infer<typeof ActivityOutcome>;

/** One `activity_events` row (database.md §14a); salted hashes only, never raw device or IP values. */
export const ActivityEvent = z.object({
  id: Id,
  occurredAt: Timestamp,
  userId: Id.nullable(),
  anonId: z.string().nullable(),
  sessionId: Id.nullable(),
  deviceHash: z.string().nullable(),
  ipHash: z.string().nullable(),
  platform: z.enum(["WEB", "MOBILE"]),
  action: ActivityAction,
  targetType: z.string().nullable(),
  targetId: Id.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  containsHiddenSeller: z.boolean(),
  outcome: ActivityOutcome,
});
export type ActivityEvent = z.infer<typeof ActivityEvent>;
