// Starts the mock API in the browser (development only; implementation_plan.md §4).
import { setupWorker } from "msw/browser";
import { type ConfigStorage, resolveMockConfig } from "./config";
import { createHandlers } from "./handlers";
import { MOCK_BUILD_MARKER } from "./marker";
import { createMockController, type MockController } from "./state";

/** Served by the web app in development only. */
export const MOCK_WORKER_URL = "/mockServiceWorker.js";

function sessionStorageOrNull(): ConfigStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export async function startMockWorker(): Promise<MockController> {
  const controller = createMockController({ config: resolveMockConfig(globalThis.location.search, sessionStorageOrNull()) });
  const worker = setupWorker(...createHandlers(controller));
  // Requests that are not API calls (pages, assets) go to the network.
  await worker.start({ serviceWorker: { url: MOCK_WORKER_URL }, onUnhandledFrame: "bypass", quiet: true });
  document.documentElement.dataset["mockApi"] = MOCK_BUILD_MARKER;
  return controller;
}
