// Web tests render whole screens against the in-process mock API; under a full `turbo` run every
// package tests in parallel, so a long screen flow can pass 5 s. Only the time limit changes here.
import { defineConfig } from "vitest/config";

/** Milliseconds a single screen-flow test may take. */
const SCREEN_FLOW_TIMEOUT_MS = 20_000;

export default defineConfig({
  test: { testTimeout: SCREEN_FLOW_TIMEOUT_MS },
});
