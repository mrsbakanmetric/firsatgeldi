// @vitest-environment jsdom
// The mock API starts only in development, unless NEXT_PUBLIC_API_MOCKING=off.
import { afterEach, describe, expect, it, vi } from "vitest";

const started = vi.hoisted(() => ({ count: 0 }));
vi.mock("../dev/mock-api", () => ({
  startMockWorker: async () => {
    started.count += 1;
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  started.count = 0;
});

async function run(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const { whenApiReady } = await import("./ready");
  await whenApiReady();
  await whenApiReady();
  return started.count;
}

describe("mock API switch", () => {
  it("starts once in development", async () => {
    expect(await run({ NODE_ENV: "development" })).toBe(1);
  });

  it("can be turned off in development", async () => {
    expect(await run({ NODE_ENV: "development", NEXT_PUBLIC_API_MOCKING: "off" })).toBe(0);
  });

  it("never starts in production", async () => {
    expect(await run({ NODE_ENV: "production" })).toBe(0);
  });
});
