// Live updates (architecture.md §13): the mock emits the same events as
// `GET /me/stream`, through the same EventSource the real API will serve.
import { API_PREFIX, ENDPOINTS, type StreamEventType } from "@firsatgeldi/contracts";
import { sse } from "msw";
import { actorFor } from "../route";
import type { MockController, StreamSubscriber } from "../state";

export function streamHandlers(controller: MockController) {
  // msw intercepts EventSource only where the API exists (browsers); in Node
  // tests the events are checked through `state.streamLog` instead.
  if (typeof globalThis.EventSource === "undefined") return [];
  return [
    sse<Record<StreamEventType, string>>(`*${API_PREFIX}${ENDPOINTS.stream.path}`, ({ client, request }) => {
      const actor = actorFor(controller);
      // No session → no stream (not on the public allow-list).
      if (actor.kind === "guest") {
        client.close();
        return;
      }
      const subscriber: StreamSubscriber = {
        actor,
        send: (event) => client.send({ event: event.type, data: JSON.stringify(event.data) }),
      };
      controller.state.subscribers.add(subscriber);
      request.signal.addEventListener("abort", () => controller.state.subscribers.delete(subscriber));
    }),
  ];
}
