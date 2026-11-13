// Live updates over Server-Sent Events (architecture.md §13; `GET /me/stream`).
// Each SSE message has `event: <type>` and `data: <JSON payload>`.
import { z } from "zod";
import { Id } from "./common";
import { UploadRejectReason } from "./uploads";

/** Events of the Search and Add screen (implementation_plan.md Appendix B.1). Other screens add theirs. */
export const STREAM_EVENTS = {
  "upload.ready": z.object({ uploadId: Id, batchId: Id.nullable() }),
  "upload.rejected": z.object({ uploadId: Id, batchId: Id.nullable(), reason: UploadRejectReason }),
} as const;

export type StreamEventType = keyof typeof STREAM_EVENTS;
export const STREAM_EVENT_TYPES = Object.keys(STREAM_EVENTS) as [StreamEventType, ...StreamEventType[]];

export const StreamEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("upload.ready"), data: STREAM_EVENTS["upload.ready"] }),
  z.object({ type: z.literal("upload.rejected"), data: STREAM_EVENTS["upload.rejected"] }),
]);
export type StreamEvent = z.infer<typeof StreamEvent>;
