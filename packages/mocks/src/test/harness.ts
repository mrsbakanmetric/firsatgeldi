// Test harness: the mock API in Node behind the real typed client.
import { type ApiLocale, createApiClient } from "@firsatgeldi/contracts";
import { createMockServer } from "../node";
import type { MockSession } from "../state";

export const BASE_URL = "http://mock.test";
/** A fixed "now" so dates in assertions are stable. */
export const NOW = new Date("2026-11-14T09:00:00.000Z");

export function createTestApi() {
  const { server, controller } = createMockServer({
    now: () => NOW,
    // Run simulated background work (image processing) at once.
    schedule: (task) => task(),
  });
  let locale: ApiLocale = "tr";
  const api = createApiClient({ baseUrl: BASE_URL, platform: "web", locale: () => locale });
  return {
    server,
    controller,
    api,
    signInAs(session: MockSession) {
      controller.config = { ...controller.config, session };
    },
    useLocale(next: ApiLocale) {
      locale = next;
    },
  };
}
