import { describe, expect, it } from "vitest";
import { type ConfigStorage, MOCK_STORAGE_KEY, resolveMockConfig } from "./config";
import { DEFAULT_MOCK_CONFIG } from "./state";

function memoryStorage(initial: Record<string, string> = {}): ConfigStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) };
}

const blocked: ConfigStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("mock session and scenario switch", () => {
  it("defaults to a signed-in user, success, default latency", () => {
    expect(resolveMockConfig("", memoryStorage())).toEqual(DEFAULT_MOCK_CONFIG);
  });

  it("reads URL parameters and remembers them for the browser session", () => {
    const storage = memoryStorage();
    const config = resolveMockConfig("?mock-session=guest&mock-scenario=error&mock-latency=0", storage);
    expect(config).toEqual({ session: "guest", scenario: "error", latencyMs: 0 });
    expect(resolveMockConfig("", storage)).toEqual(config);
  });

  it("ignores invalid values", () => {
    const storage = memoryStorage({ [MOCK_STORAGE_KEY]: "{not json" });
    expect(resolveMockConfig("?mock-session=admin&mock-scenario=x&mock-latency=-5", storage)).toEqual(DEFAULT_MOCK_CONFIG);
  });

  it("works when storage throws (private mode, blocked site data)", () => {
    expect(resolveMockConfig("?mock-session=manager", blocked)).toEqual({ ...DEFAULT_MOCK_CONFIG, session: "manager" });
    expect(resolveMockConfig("", null)).toEqual(DEFAULT_MOCK_CONFIG);
  });
});
