// Starts the mock API in the browser (development only; implementation_plan.md §4).
import { setupWorker } from "msw/browser";
import { type ConfigStorage, rememberMockConfig, resolveMockConfig } from "./config";
import { createHandlers } from "./handlers";
import { MOCK_BUILD_MARKER } from "./marker";
import { createMockController, type MockController, type MockMail } from "./state";

/** Served by the web app in development only. */
export const MOCK_WORKER_URL = "/mockServiceWorker.js";

function sessionStorageOrNull(): ConfigStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export interface MockWorkerOptions {
  /**
   * No e-mail is sent in Phase 1: the verification and reset links of the mock sign-in go here
   * (the web app prints them in the console with its own routes). Default: the token is printed.
   */
  readonly onMail?: (mail: MockMail) => void;
}

export async function startMockWorker(options: MockWorkerOptions = {}): Promise<MockController> {
  const storage = sessionStorageOrNull();
  const controller = createMockController({ config: resolveMockConfig(globalThis.location.search, storage), seedTracking: true });
  controller.persist = (config) => rememberMockConfig(storage, config);
  controller.onMail = options.onMail ?? ((mail) => console.info(`[mock e-mail] ${mail.purpose} → ${mail.emailMasked}: token ${mail.token}`));
  const worker = setupWorker(...createHandlers(controller));
  // Requests that are not API calls (pages, assets) go to the network.
  await worker.start({ serviceWorker: { url: MOCK_WORKER_URL }, onUnhandledFrame: "bypass", quiet: true });
  document.documentElement.dataset["mockApi"] = MOCK_BUILD_MARKER;
  return controller;
}
