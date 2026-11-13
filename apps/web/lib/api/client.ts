// The one typed API client of the web app (architecture.md §21.3): the same
// client talks to the mock API now and to the real API in Phase 2.
import { type ApiClient, createApiClient } from "@firsatgeldi/contracts";
import type { Locale } from "@firsatgeldi/i18n";
import { API_BASE_URL } from "./config";
import { whenApiReady } from "./ready";

export function createWebApiClient(locale: Locale): ApiClient {
  return createApiClient({
    baseUrl: API_BASE_URL,
    platform: "web",
    locale: () => locale,
    fetch: async (...args) => {
      await whenApiReady();
      return globalThis.fetch(...args);
    },
  });
}
