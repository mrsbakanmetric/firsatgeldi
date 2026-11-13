// Error codes of the API (architecture.md §15.2). The client never shows
// `code`; it translates `messageKey` from the i18n catalogue (`errors.*`).
import { z } from "zod";

/**
 * Every error code with its HTTP status and catalogue key.
 * From the docs: LIMIT_REACHED, RESTRICTED (architecture.md §6.3), CONSENT_REQUIRED (§15.1).
 * General codes and ALREADY_TRACKING (design "1 Ara ve Ekle", case G) are added here
 * [ASSUMPTION — decided 2026-11-14 for the mock API step; written into architecture.md §16 by a later spec PR].
 */
export const ERRORS = {
  VALIDATION: { status: 400, messageKey: "errors.validation" },
  UNAUTHENTICATED: { status: 401, messageKey: "errors.unauthenticated" },
  FORBIDDEN: { status: 403, messageKey: "errors.forbidden" },
  RESTRICTED: { status: 403, messageKey: "errors.restricted" },
  CONSENT_REQUIRED: { status: 403, messageKey: "errors.consentRequired" },
  NOT_FOUND: { status: 404, messageKey: "errors.notFound" },
  ALREADY_TRACKING: { status: 409, messageKey: "errors.alreadyTracking" },
  LIMIT_REACHED: { status: 409, messageKey: "errors.limitReached" },
  RATE_LIMITED: { status: 429, messageKey: "errors.rateLimited" },
  INTERNAL: { status: 500, messageKey: "errors.internal" },
} as const;

export type ErrorCode = keyof typeof ERRORS;
export const ERROR_CODES = Object.keys(ERRORS) as [ErrorCode, ...ErrorCode[]];
export const ErrorCode = z.enum(ERROR_CODES);

export type ErrorMessageKey = (typeof ERRORS)[ErrorCode]["messageKey"];

/** Message key used when a response cannot be read at all (network failure, invalid JSON). */
export const NETWORK_ERROR_MESSAGE_KEY = "errors.network";
/** Message key used when a response does not match its contract schema. */
export const CONTRACT_ERROR_MESSAGE_KEY = "errors.internal";

export const ApiErrorBody = z.object({
  code: ErrorCode,
  messageKey: z.string().min(1),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  fields: z.record(z.string(), z.string()).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export function errorBody(code: ErrorCode, extra: Pick<ApiErrorBody, "params" | "fields"> = {}): ApiErrorBody {
  return { code, messageKey: ERRORS[code].messageKey, ...extra };
}
