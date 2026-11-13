// Data-layer configuration (implementation_plan.md §4 "Switching to the real API").
// Screen code never reads these values. The mock API switch lives in ready.ts
// (NODE_ENV "development" and NEXT_PUBLIC_API_MOCKING not "off").

/** Origin of the API; empty = same origin (the mock API answers there in development). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
