"use client";

// Live updates (architecture.md §13, §21.3): one EventSource on `GET /me/stream`
// for a signed-in user; every event is checked against the contract and
// refreshes the queries it affects. Same hook for the mock and the real API.
import { API_PREFIX, ENDPOINTS, StreamEvent, STREAM_EVENT_TYPES } from "@firsatgeldi/contracts";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_BASE_URL } from "./config";
import { apiQueryKey } from "./hooks";
import { whenApiReady } from "./ready";

/** Which cached queries an event makes outdated. */
export function invalidateFor(queryClient: QueryClient, event: StreamEvent): Promise<void> {
  switch (event.type) {
    case "upload.ready":
    case "upload.rejected":
      return queryClient.invalidateQueries({ queryKey: apiQueryKey("getUpload", { params: { id: event.data.uploadId } }) });
    case "check.finished":
      // Tracked Items rows and summary, and the remaining checks ("az önce").
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey("listTrackedItems") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItemsSummary") }),
      ]).then(() => undefined);
  }
}

/** Parses one SSE message; anything outside the contract is ignored. */
export function parseStreamMessage(type: string, data: string): StreamEvent | null {
  try {
    const parsed = StreamEvent.safeParse({ type, data: JSON.parse(data) });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function useLiveUpdates(enabled: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let source: EventSource | null = null;
    let closed = false;
    void whenApiReady().then(() => {
      if (closed) return;
      source = new EventSource(`${API_BASE_URL}${API_PREFIX}${ENDPOINTS.stream.path}`, { withCredentials: true });
      for (const type of STREAM_EVENT_TYPES) {
        source.addEventListener(type, (message: MessageEvent<string>) => {
          const event = parseStreamMessage(type, message.data);
          if (event) void invalidateFor(queryClient, event);
        });
      }
    });
    return () => {
      closed = true;
      source?.close();
    };
  }, [enabled, queryClient]);
}
