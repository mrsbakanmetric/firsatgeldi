// User uploads (architecture.md §11a flow; database.md §14b `uploads`, `media_assets`).
import { z } from "zod";
import { CalendarDay, Id, Money, Timestamp } from "./common";

export const UploadPurpose = z.enum(["IDENTIFY", "ORDER_SCREENSHOT", "AVATAR", "SUPPORT_ATTACHMENT"]);
/** Accepted types: JPEG, PNG, WebP, HEIC (database.md §14b rules). */
export const UploadMime = z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]);
export const UploadStatus = z.enum(["PRESIGNED", "UPLOADED", "PROCESSING", "READY", "REJECTED", "EXPIRED", "DELETED"]);
export const UploadRejectReason = z.enum(["TYPE", "SIZE", "DIMENSIONS", "DECODE", "UNSAFE"]);

/** `POST /uploads/presign` { purpose, files: [{ mime, bytes }] }; count and size limits are settings, checked by the server. */
export const PresignRequest = z.object({
  purpose: UploadPurpose,
  files: z.array(z.object({ mime: UploadMime, bytes: z.number().int().positive() })).min(1),
});
export type PresignRequest = z.infer<typeof PresignRequest>;

/** → batchId + presigned URLs (quarantine bucket, short-lived, size/type locked). */
export const PresignResult = z.object({
  batchId: Id,
  uploads: z.array(
    z.object({
      uploadId: Id,
      position: z.number().int().nonnegative(),
      uploadUrl: z.url(),
      method: z.literal("PUT"),
      headers: z.record(z.string(), z.string()),
      expiresAt: Timestamp,
    }),
  ),
});
export type PresignResult = z.infer<typeof PresignResult>;

/**
 * How a guest asks for the upload status (architecture.md §11a [DECIDED 2026-11-14]):
 * every `upload.guest_poll_interval_seconds`, for at most `upload.guest_poll_max_seconds`.
 * The values come from `system_settings` on the server.
 */
export const UploadPolling = z.object({
  intervalSeconds: z.number().int().positive(),
  maxSeconds: z.number().int().positive(),
});
export type UploadPolling = z.infer<typeof UploadPolling>;

/**
 * `POST /uploads/complete` { batchId } → processing queue. Signed-in users get the
 * result via SSE `upload.ready` / `upload.rejected` (`poll: null`); guests have no
 * stream and poll `GET /uploads/:id` with `poll` [ASSUMPTION — field; user decision
 * 2026-11-14, to be written into architecture.md §16.1 by a spec PR].
 */
export const CompleteUploadRequest = z.object({ batchId: Id });
export const CompleteUploadResult = z.object({
  batchId: Id,
  uploads: z.array(z.object({ uploadId: Id, status: UploadStatus })),
  poll: UploadPolling.nullable(),
});
export type CompleteUploadResult = z.infer<typeof CompleteUploadResult>;

/** Statuses after which the upload no longer changes on its own: polling stops. */
export const FINAL_UPLOAD_STATUSES = ["READY", "REJECTED", "EXPIRED", "DELETED"] as const satisfies readonly z.infer<typeof UploadStatus>[];

/**
 * Fields read from an order screenshot: product, seller, price, date only
 * (database.md §14b `uploads.extracted`). Name, address, phone and order number
 * are stripped. The seller here is the user's own seller, which is always visible.
 */
export const UploadExtraction = z.object({
  productText: z.string().nullable(),
  sellerName: z.string().nullable(),
  platformName: z.string().nullable(),
  pricePaid: Money.nullable(),
  orderedOn: CalendarDay.nullable(),
});

/** `GET /uploads/:id` — status and extraction (personal data stripped). */
export const UploadView = z.object({
  id: Id,
  batchId: Id.nullable(),
  purpose: UploadPurpose,
  position: z.number().int().nonnegative(),
  status: UploadStatus,
  rejectReason: UploadRejectReason.nullable(),
  extracted: UploadExtraction.nullable(),
  purgeAt: Timestamp.nullable(),
});
export type UploadView = z.infer<typeof UploadView>;
