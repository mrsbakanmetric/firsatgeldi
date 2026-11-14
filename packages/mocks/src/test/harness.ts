// Test harness: the mock API in Node behind the real typed client.
import { type ApiLocale, createApiClient } from "@firsatgeldi/contracts";
import { createMockServer } from "../node";
import { type MockSession, startGuestSession } from "../state";

export const BASE_URL = "http://mock.test";
/** A fixed "now" so dates in assertions are stable. */
export const NOW = new Date("2026-11-14T09:00:00.000Z");

export function createTestApi(options: { seedTracking?: boolean } = {}) {
  let now = NOW;
  const { server, controller } = createMockServer({
    ...options,
    now: () => now,
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
    /** Another guest (other browser or cleared cookies). */
    newGuestSession() {
      startGuestSession(controller.state);
    },
    useLocale(next: ApiLocale) {
      locale = next;
    },
    /** Moves the mock clock forward; `resetClock` returns it to NOW. */
    advanceClock(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    resetClock() {
      now = NOW;
    },
  };
}
