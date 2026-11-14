// Mock API (implementation_plan.md §4): MSW handlers, fixtures and the
// in-memory server state. Development and tests only — production code never
// imports this package (ESLint boundary + production build check).
export { MOCK_BUILD_MARKER } from "./marker";
export { MOCK_PARAMS, MOCK_STORAGE_KEY, resolveMockConfig, type ConfigStorage } from "./config";
export { createHandlers } from "./handlers";
export { MOCK_STORAGE_PATH } from "./handlers/identify";
export * from "./fixtures/catalog";
export * from "./fixtures/market";
export * from "./fixtures/users";
export { SEED_CHECKS_USED_TODAY, seedTrackedItems, TRACKING_SEEDS } from "./fixtures/tracking";
export { MOCK_SETTINGS, PLAN_LIMITS, SYSTEM_SETTINGS } from "./settings";
export {
  createMockController,
  DEFAULT_MOCK_CONFIG,
  MOCK_PHOTOS,
  MOCK_SCENARIOS,
  MOCK_SESSIONS,
  type MockConfig,
  type MockController,
  type MockPhoto,
  type MockScenario,
  type MockSession,
  type MockState,
  startGuestSession,
} from "./state";
