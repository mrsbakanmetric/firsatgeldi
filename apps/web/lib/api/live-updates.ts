"use client";

// Live updates (architecture.md §13, §21.3): one EventSource on `GET /me/stream`
// for a signed-in user; every event is checked against the contract and
// refreshes the queries it affects. Same hook for the mock and the real API.
import { API_PREFIX, ENDPOINTS, StreamEvent, STREAM_EVENT_TYPES } from "@firsatgeldi/contracts";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
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
      // Tracked Items rows and summary, Home, Product Detail, and the remaining checks ("az önce").
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey("listTrackedItems") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItemsSummary") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getHome") }),
        // Product Detail: the item, its offers and both histories.
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItem") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItemOffers") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getPriceHistory") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getStockHistory") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getEntitlements") }),
      ]).then(() => undefined);
    case "notification.created":
      // The bell's unread count, the page and the panel list.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getUnreadCount") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getNotifications") }),
        queryClient.invalidateQueries({ queryKey: apiQueryKey("getDeliveryStatus") }),
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

/**
 * The stream's state for screens that say it (Notifications: "Yeni bildirimler gelmiyor"):
 * "off" (no stream: guest, or no EventSource), "open", "lost" (it broke; the browser retries).
 */
export type LiveStatus = "off" | "open" | "lost";
let liveStatus: LiveStatus = "off";
const listeners = new Set<() => void>();
function setLiveStatus(next: LiveStatus) {
  if (next === liveStatus) return;
  liveStatus = next;
  for (const listener of listeners) listener();
}
const subscribeLive = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export function useLiveStatus(): LiveStatus {
  return useSyncExternalStore(subscribeLive, () => liveStatus, () => "off");
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
      source.addEventListener("open", () => setLiveStatus("open"));
      source.addEventListener("error", () => setLiveStatus("lost"));
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
      setLiveStatus("off");
    };
  }, [enabled, queryClient]);
}
