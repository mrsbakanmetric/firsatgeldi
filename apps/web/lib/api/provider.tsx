"use client";

// Server state for the whole app: one QueryClient and one typed API client per
// language (the [locale] layout remounts when the language changes).
import { type ApiClient, ApiError } from "@firsatgeldi/contracts";
import type { Locale } from "@firsatgeldi/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useState } from "react";
import { createWebApiClient } from "./client";

const ApiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) throw new Error("useApiClient must be used inside ApiProvider");
  return client;
}

/** Network and server errors are retried once; API answers (4xx) and contract mismatches are not. */
const MAX_RETRIES = 1;
const SERVER_ERROR_STATUS = 500;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES || !(error instanceof ApiError)) return false;
  return error.failure === "network" || (error.failure === "api" && error.status >= SERVER_ERROR_STATUS);
}

export function ApiProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [client] = useState(() => createWebApiClient(locale));
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: shouldRetry } },
      }),
  );
  return (
    <ApiClientContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ApiClientContext.Provider>
  );
}
