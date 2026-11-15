// Action logging (CLAUDE.md core rule 9; database.md §14, §14a). Every user
// action is written to the activity history; the API interceptor writes it
// asynchronously in Phase 2, the mock API keeps the same rows in memory.
import { z } from "zod";
import { Id, Timestamp } from "./common";

/**
 * Activity actions (database.md §14a `activity_events.action`). Listed there:
 * search, identify, upload, upload.status [DECIDED 2026-11-14], tracking.confirm,
 * reveal, offer.go, check_now, check_now_bulk, tracking.end … `seller_lookup`, `teaser` and `reveal.hide` are
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
  "check_now",
  "check_now_bulk",
  "tracking.end",
  /** "Geri al" after ending tracking [ASSUMPTION — action name]. */
  "tracking.restore",
  /** "Aldım, kaydet" on a want-to-buy item [ASSUMPTION — action name]. */
  "tracking.bought",
  // Product Detail (implementation_plan.md Appendix B.2). `report.create` is listed in database.md §14a;
  // the others are [ASSUMPTION — action names] until database.md §14a lists them.
  /** Price paid, order status, last day or target corrected. */
  "tracking.edit",
  /** "Teslim aldın mı?" answered. */
  "tracking.delivered",
  /** An action step ticked or unticked ("Yaptım ✓"). */
  "tracking.step",
  /** Request tracking: "Fiyat farkı istedim" / "İade talebi açtım" and the outcome. */
  "tracking.request",
  /** Want-to-buy tracking extended. */
  "tracking.extend",
  /** The two optional buyer questions answered. */
  "feedback.create",
  /** "Yanlış fiyat bildir" / "Farklı ürün bildir". */
  "report.create",
  /** "Stoğa gelince haber ver" on an offer. */
  "offer.notify_back_in_stock",
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
