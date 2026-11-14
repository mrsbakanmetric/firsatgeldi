// User uploads (architecture.md §11a flow; database.md §14b `uploads`, `media_assets`).
import { z } from "zod";
import { CalendarDay, Id, Money, Timestamp } from "./common";

/**
 * Search and Add always sends IDENTIFY: one photo field takes products, labels and
 * order screens alike; the server recognises an order screen and fills
 * `UploadView.extracted` (user decision 2026-11-14). ORDER_SCREENSHOT stays for
 * callers that know the purpose in advance.
 */
export const UploadPurpose = z.enum(["IDENTIFY", "ORDER_SCREENSHOT", "AVATAR", "SUPPORT_ATTACHMENT"]);
/** Accepted types: JPEG, PNG, WebP, HEIC (database.md §14b rules). */
export const UploadMime = z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]);
export const UploadStatus = z.enum(["PRESIGNED", "UPLOADED", "PROCESSING", "READY", "REJECTED", "EXPIRED", "DELETED"]);
export const UploadRejectReason = z.enum(["TYPE", "SIZE", "DIMENSIONS", "DECODE", "UNSAFE"]);

/**
 * `GET /uploads/policy?purpose=` — the limits a client states before an upload
 * (product_design_pattern.md §5.19, §5.20): number of files, size per file,
 * accepted types and how long the image is kept. Values come from settings
 * (`media.*`, `support.max_attachments`, `support.attachment_retention_days`);
 * screen texts never type them [ASSUMPTION — endpoint; user decision 2026-11-14,
 * to be written into architecture.md §16 / §16.1 by a spec PR].
 */
export const UploadPolicyQuery = z.object({ purpose: UploadPurpose });
export const UploadPolicy = z.object({
  purpose: UploadPurpose,
  maxFiles: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
  acceptedTypes: z.array(UploadMime).min(1),
  /** IDENTIFY / ORDER_SCREENSHOT: hours (`media.private_retention_hours`); SUPPORT_ATTACHMENT: days. */
  retention: z.object({ amount: z.number().int().positive(), unit: z.enum(["HOURS", "DAYS"]) }).nullable(),
});
export type UploadPolicy = z.infer<typeof UploadPolicy>;

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
 * stream and poll `GET /uploads/:id` with `poll` [DECIDED 2026-11-14]
 * (architecture.md §16.1).
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
