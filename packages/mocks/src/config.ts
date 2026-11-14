// Development switch for the mock session and scenario [DECIDED 2026-11-14]:
// URL parameters, remembered in the browser session. Storage can be missing or
// blocked (private mode, tests): every read and write is guarded.
import { DEFAULT_MOCK_CONFIG, MOCK_PHOTOS, MOCK_SCENARIOS, MOCK_SESSIONS, type MockConfig, type MockPhoto, type MockScenario, type MockSession } from "./state";

export const MOCK_PARAMS = { session: "mock-session", scenario: "mock-scenario", latency: "mock-latency", photo: "mock-photo" } as const;
export const MOCK_STORAGE_KEY = "fg-mock-config";
const MAX_LATENCY_MS = 10_000;

/** Minimal storage surface (sessionStorage in the browser). */
export interface ConfigStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function readStored(storage: ConfigStorage | null): Partial<MockConfig> {
  try {
    const raw = storage?.getItem(MOCK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<MockConfig>) : {};
  } catch {
    return {};
  }
}

function writeStored(storage: ConfigStorage | null, config: MockConfig): void {
  try {
    storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage blocked: the URL parameters still apply to this page load.
  }
}

const isSession = (value: unknown): value is MockSession => MOCK_SESSIONS.includes(value as MockSession);
const isScenario = (value: unknown): value is MockScenario => MOCK_SCENARIOS.includes(value as MockScenario);
const isPhoto = (value: unknown): value is MockPhoto => MOCK_PHOTOS.includes(value as MockPhoto);
const latency = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : Number.NaN;
  return Number.isInteger(number) && number >= 0 && number <= MAX_LATENCY_MS ? number : null;
};

/** URL parameters win over the remembered values; invalid values are ignored. */
export function resolveMockConfig(search: string, storage: ConfigStorage | null): MockConfig {
  const params = new URLSearchParams(search);
  const stored = readStored(storage);
  const session = params.get(MOCK_PARAMS.session);
  const scenario = params.get(MOCK_PARAMS.scenario);
  const photo = params.get(MOCK_PARAMS.photo);
  const config: MockConfig = {
    session: isSession(session) ? session : isSession(stored.session) ? stored.session : DEFAULT_MOCK_CONFIG.session,
    scenario: isScenario(scenario) ? scenario : isScenario(stored.scenario) ? stored.scenario : DEFAULT_MOCK_CONFIG.scenario,
    latencyMs: latency(params.get(MOCK_PARAMS.latency)) ?? latency(stored.latencyMs) ?? DEFAULT_MOCK_CONFIG.latencyMs,
    photo: isPhoto(photo) ? photo : isPhoto(stored.photo) ? stored.photo : DEFAULT_MOCK_CONFIG.photo,
  };
  writeStored(storage, config);
  return config;
}
