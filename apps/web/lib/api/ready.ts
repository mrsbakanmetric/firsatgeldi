// Requests wait until the API is reachable. In development the in-browser mock
// API must be running first; otherwise (production, mock turned off) it is at once.

let ready: Promise<void> | null = null;

export function whenApiReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // Written out here, not behind a shared constant, so the bundler folds it to
  // `false` in production and drops the import below: the mock is not bundled
  // (a constant from another module left msw in the production chunks).
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_API_MOCKING !== "off") {
    ready ??= import("../dev/mock-api").then(({ startMockWorker }) => startMockWorker()).then(() => undefined);
    return ready;
  }
  return Promise.resolve();
}
