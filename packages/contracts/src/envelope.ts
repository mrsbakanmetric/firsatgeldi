// Response envelope (architecture.md §15.2):
//   { data: T, meta?: { nextCursor?, total?, checkedAt?, entitlements? } }
//   { error: { code, messageKey, params?, fields? } }
import { z } from "zod";
import { Cursor, Timestamp } from "./common";
import { ApiErrorBody } from "./errors";

/** A used/limit pair; `limit: null` = unlimited. */
export const Allowance = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative().nullable(),
});

/** Plans (database.md §9 `plans.code`). */
export const PlanCode = z.enum(["FREE", "PREMIUM"]);

/**
 * Plan and remaining allowances (architecture.md §16 `GET /me/entitlements`:
 * "plan, remaining reveal/tracking/checks, tokens"; values from database.md §9).
 */
export const EntitlementSummary = z.object({
  plan: PlanCode,
  premiumEndsAt: Timestamp.nullable(),
  tracking: Allowance,
  reveals: Allowance,
  checkNow: Allowance,
  tokenBalance: z.number().int().nonnegative(),
});
export type EntitlementSummary = z.infer<typeof EntitlementSummary>;

export const Meta = z.object({
  nextCursor: Cursor.optional(),
  total: z.number().int().nonnegative().optional(),
  checkedAt: Timestamp.optional(),
  entitlements: EntitlementSummary.optional(),
});
export type Meta = z.infer<typeof Meta>;

export function dataEnvelope<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: Meta.optional() });
}

export const ErrorEnvelope = z.object({ error: ApiErrorBody });
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
