// Live updates over Server-Sent Events (architecture.md §13; `GET /me/stream`).
// Each SSE message has `event: <type>` and `data: <JSON payload>`.
import { z } from "zod";
import { Id, Timestamp } from "./common";
import { UploadRejectReason } from "./uploads";

/** Events of Search and Add and Tracked Items (implementation_plan.md Appendix B.1, B.3). Other screens add theirs. */
export const STREAM_EVENTS = {
  "upload.ready": z.object({ uploadId: Id, batchId: Id.nullable() }),
  "upload.rejected": z.object({ uploadId: Id, batchId: Id.nullable(), reason: UploadRejectReason }),
  /** Tracked Items / Check Now: one check finished (architecture.md §13) [ASSUMPTION — payload]. */
  "check.finished": z.object({ trackedItemId: Id, checkedAt: Timestamp }),
} as const;

export type StreamEventType = keyof typeof STREAM_EVENTS;
export const STREAM_EVENT_TYPES = Object.keys(STREAM_EVENTS) as [StreamEventType, ...StreamEventType[]];

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("upload.ready"), data: STREAM_EVENTS["upload.ready"] }),
  z.object({ type: z.literal("upload.rejected"), data: STREAM_EVENTS["upload.rejected"] }),
  z.object({ type: z.literal("check.finished"), data: STREAM_EVENTS["check.finished"] }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
