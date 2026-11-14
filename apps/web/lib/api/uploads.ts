"use client";

// Status of one upload while it is processed (architecture.md §11a, §13).
// Signed-in users get the result through live updates (`useLiveUpdates`
// refreshes this query); guests have no stream, so they poll with the values
// the server sent in `POST /uploads/complete` (`poll`, from system settings)
// and stop with an error state when the time runs out.
import { type ApiError, FINAL_UPLOAD_STATUSES, type UploadPolling, type UploadView } from "@firsatgeldi/contracts";
import type { TranslationKey } from "@firsatgeldi/i18n";
import { useCallback, useEffect, useState } from "react";
import { useApiQuery } from "./hooks";

const MS_PER_SECOND = 1000;

/** Catalogue text of the timed-out state (design "1 Ara ve Ekle", error state). */
export const UPLOAD_TIMEOUT_TEXT = {
  title: "uploadStatus.timeoutTitle",
  body: "uploadStatus.timeoutBody",
} as const satisfies Record<string, TranslationKey>;

export type UploadStatusState =
  | { readonly state: "idle" }
  | { readonly state: "waiting"; readonly upload: UploadView | undefined }
  | { readonly state: "done"; readonly upload: UploadView }
  | { readonly state: "timedOut" }
  | { readonly state: "error"; readonly error: ApiError };

export function isFinalUploadStatus(status: UploadView["status"] | undefined): boolean {
  return status !== undefined && (FINAL_UPLOAD_STATUSES as readonly string[]).includes(status);
}

/**
 * @param uploadId the upload to watch, or null before there is one.
 * @param poll `poll` of the complete-upload answer: values for a guest, null for a signed-in user.
 */
export function useUploadStatus(uploadId: string | null, poll: UploadPolling | null): UploadStatusState & { retry: () => void } {
  const [timedOutId, setTimedOutId] = useState<string | null>(null);
  const timedOut = uploadId !== null && timedOutId === uploadId;
  const intervalMs = poll ? poll.intervalSeconds * MS_PER_SECOND : null;
  const maxMs = poll ? poll.maxSeconds * MS_PER_SECOND : null;

  const query = useApiQuery(
    "getUpload",
    { params: { id: uploadId ?? "" } },
    {
      enabled: uploadId !== null && !timedOut,
      refetchInterval: (current) => (intervalMs !== null && !isFinalUploadStatus(current.state.data?.data.status) ? intervalMs : false),
    },
  );
  const final = isFinalUploadStatus(query.data?.data.status);
  const { refetch } = query;

  // The time limit runs from the first status request; a retry starts it again.
  useEffect(() => {
    if (uploadId === null || maxMs === null || final || timedOut) return;
    const timer = setTimeout(() => setTimedOutId(uploadId), maxMs);
    return () => clearTimeout(timer);
  }, [uploadId, maxMs, final, timedOut]);

  const retry = useCallback(() => {
    setTimedOutId(null);
    void refetch();
  }, [refetch]);

  if (uploadId === null) return { state: "idle", retry };
  if (timedOut) return { state: "timedOut", retry };
  if (query.isError) return { state: "error", error: query.error, retry };
  if (query.data && final) return { state: "done", upload: query.data.data, retry };
  return { state: "waiting", upload: query.data?.data, retry };
}
